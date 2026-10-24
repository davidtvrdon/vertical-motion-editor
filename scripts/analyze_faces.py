#!/usr/bin/env python3
"""Find the talking head(s) in source.mp4 so overlays never cover a face.

    .venv/bin/python scripts/analyze_faces.py <project>

Writes into project.json → layout (and plan.json → layout when a plan exists):
  "faces":    [[t, x, y, w, h], …]   largest face every 0.5 s, normalised 0–1 (unzoomed source frame)
  "speakers": [{"start", "end", "who": "top" | "bottom"}, …]   active speaker during split-screen

The renderer uses `faces` to fit each overlay into the free band above the head (scaling it
down if needed), and `speakers` to put split-screen graphics over the *listener's* half so
the person talking stays fully visible.

Face detector: OpenCV YuNet (downloaded once into .cache/models). Active speaker: in 2 s windows,
each half's mouth motion and mouth openness are correlated with the audio loudness; the half whose
mouth follows the voice is the speaker (robust to webcam noise and beards, unlike raw motion).
"""
import sys
import urllib.request
from pathlib import Path

import numpy as np

from common import ROOT, load_json, project_dir, save_json

MODEL = ROOT / ".cache" / "models" / "face_detection_yunet_2023mar.onnx"
MODEL_URL = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
FACE_EVERY = 0.5  # seconds between stored face boxes


def ensure_model() -> Path:
    if not MODEL.exists() or MODEL.stat().st_size < 100_000:  # a git-lfs pointer is ~400 bytes
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    return MODEL


def mouth_feats(gray: np.ndarray, f: np.ndarray, scale: float):
    """Mouth region (for frame-to-frame motion) and an openness proxy (dark mouth interior vs skin above)."""
    import cv2

    rx, ry, lx, ly = (f[10:14] * scale).tolist()
    d = max(8.0, float(np.hypot(lx - rx, ly - ry)))
    cx, cy = (rx + lx) / 2, (ry + ly) / 2
    h, w = gray.shape

    def crop(x0, y0, x1, y1):
        x0, y0, x1, y1 = int(max(0, x0)), int(max(0, y0)), int(min(w, x1)), int(min(h, y1))
        return gray[y0:y1, x0:x1] if x1 - x0 > 4 and y1 - y0 > 4 else None

    roi = crop(cx - d * 0.7, cy - d * 0.4, cx + d * 0.7, cy + d * 0.8)
    inner = crop(cx - d * 0.35, cy - d * 0.15, cx + d * 0.35, cy + d * 0.45)
    skin = crop(cx - d * 0.6, cy - d * 0.9, cx + d * 0.6, cy - d * 0.5)
    if roi is None or inner is None or skin is None:
        return None
    return cv2.resize(roi, (32, 32)).astype(np.float32), -float(inner.mean()) / max(1.0, float(skin.mean()))


def signature(fr: np.ndarray, box: list[float]) -> np.ndarray:
    """Who is this? HSV histogram of the face plus its surroundings (background differs per webcam)."""
    import cv2

    H, W = fr.shape[:2]
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    x0, x1 = int(max(0, cx - w * 1.1)), int(min(W, cx + w * 1.1))
    y0, y1 = int(max(0, cy - h * 0.9)), int(min(H, cy + h * 0.9))
    hsv = cv2.cvtColor(fr[y0:y1, x0:x1], cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    return cv2.normalize(hist, hist).flatten()


def lag_corr(env: np.ndarray, sig: np.ndarray, max_lag: int = 4) -> float:
    m = ~np.isnan(sig)
    if m.sum() < 8 or np.nanstd(sig) == 0:
        return 0.0
    best = -1.0
    for lag in range(-max_lag, max_lag + 1):
        a = np.roll(env, lag)[m]
        b = sig[m]
        if np.std(a) == 0:
            continue
        best = max(best, float(np.corrcoef(a, b)[0, 1]))
    return best


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    import cv2

    proj = project_dir(sys.argv[1])
    info = load_json(proj / "project.json")
    layout = info.get("layout", {})
    splits = layout.get("splitScreen", [])
    cap = cv2.VideoCapture(str(proj / "source.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    k = 0.5 if max(W, H) > 1000 else 1.0
    det = cv2.FaceDetectorYN.create(str(ensure_model()), "", (int(W * k), int(H * k)), 0.7)

    faces_out: list[list[float]] = []
    singles: list[tuple[float, np.ndarray]] = []  # (t, signature) of single-person shots
    every = max(1, round(fps * FACE_EVERY))
    i = 0
    while True:
        if not cap.grab():
            break
        if i % every == 0:
            ok, fr = cap.retrieve()
            if not ok:
                break
            _, faces = det.detect(cv2.resize(fr, (int(W * k), int(H * k))))
            if faces is not None and len(faces):
                f = max(faces, key=lambda ff: ff[2] * ff[3])
                t_i = i / fps
                if not any(r["start"] - 0.3 <= t_i < r["end"] + 0.3 for r in splits) and len(faces) == 1:
                    singles.append((t_i, signature(fr, [float(v) / k for v in f[:4]])))
                faces_out.append([round(i / fps, 2), *[round(float(v) / k / dd, 4) for v, dd in zip(f[:4], (W, H, W, H))]])
        i += 1

    # active speaker in split-screen: correlate each half's mouth motion/openness with the audio envelope
    speakers = []
    if splits:
        import subprocess

        sr = 16000
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(proj / "source.mp4"), "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], capture_output=True).stdout
        audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
        for r in splits:
            cap.set(cv2.CAP_PROP_POS_MSEC, r["start"] * 1000)
            ts, env = [], []
            sig = {h: {"diff": [], "open": []} for h in ("top", "bottom")}
            prev: dict = {}
            half_sig: dict = {}
            while True:
                t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
                if t >= r["end"]:
                    break
                ok, fr = cap.read()
                if not ok:
                    break
                _, faces = det.detect(cv2.resize(fr, (int(W * k), int(H * k))))
                faces = [] if faces is None else list(faces)
                gray = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
                a = audio[int(t * sr) : int((t + 1 / fps) * sr)]
                ts.append(t)
                if not half_sig and t >= (r["start"] + r["end"]) / 2:
                    for half in ("top", "bottom"):
                        cand = [ff for ff in faces if ((ff[1] + ff[3] / 2) / k < H / 2) == (half == "top")]
                        if cand:
                            half_sig[half] = signature(fr, [float(v) / k for v in max(cand, key=lambda ff: ff[2] * ff[3])[:4]])
                env.append(float(np.sqrt((a**2).mean())) if len(a) else 0.0)
                for half in ("top", "bottom"):
                    cand = [ff for ff in faces if ((ff[1] + ff[3] / 2) / k < H / 2) == (half == "top")]
                    feats = mouth_feats(gray, max(cand, key=lambda ff: ff[2] * ff[3]), 1 / k) if cand else None
                    if feats is None:
                        sig[half]["diff"].append(np.nan)
                        sig[half]["open"].append(np.nan)
                        prev.pop(half, None)
                        continue
                    roi, opn = feats
                    sig[half]["diff"].append(float(np.abs(roi - prev[half]).mean()) if half in prev else np.nan)
                    sig[half]["open"].append(opn)
                    prev[half] = roi
            if len(ts) < 8:
                continue
            ts_a, env_a = np.array(ts), np.array(env)
            win = max(8, int(fps * 2.0))
            hop = max(1, int(fps * 0.5))
            diffs = []  # (window centre time, score_top - score_bottom)
            for j in range(0, max(1, len(ts) - win + 1), hop):
                sl = slice(j, j + win)
                sc = {
                    h: lag_corr(env_a[sl], np.array(sig[h]["diff"][sl])) + lag_corr(env_a[sl], np.array(sig[h]["open"][sl]))
                    for h in ("top", "bottom")
                }
                diffs.append((float(ts_a[min(len(ts_a) - 1, j + win // 2)]), sc["top"] - sc["bottom"]))
            # one speaker per split unless the other half clearly takes over for >= 2 s
            av = float(np.mean([d for _, d in diffs]))
            # continuity prior: OpusClip frames the active speaker in single shots, so the person
            # seen alone just before/after the split is most likely the one talking during it
            prior = 0.0
            near = [(abs(tt - (r["start"] if tt < r["start"] else r["end"])), sg) for tt, sg in singles if tt < r["start"] or tt >= r["end"]]
            near = [x for x in near if x[0] <= 8.0]
            if len(half_sig) == 2 and near:
                import cv2

                wsum = 0.0
                for dist, sg in near:
                    wgt = 1.0 / (1.0 + dist)
                    prior += wgt * (cv2.compareHist(half_sig["top"], sg, cv2.HISTCMP_CORREL) - cv2.compareHist(half_sig["bottom"], sg, cv2.HISTCMP_CORREL))
                    wsum += wgt
                prior /= wsum
            score = av + 0.6 * prior
            overall = "top" if score >= 0 else "bottom"
            if "--debug" in sys.argv:
                print(r, "av", round(av, 3), "prior", round(prior, 3), "->", overall)
            sign = 1 if overall == "top" else -1
            labels = [overall] * len(diffs)
            run = [q for q, (_, d) in enumerate(diffs) if d * sign < -0.3]
            groups, cur_g = [], []
            for q in run:
                if cur_g and q != cur_g[-1] + 1:
                    groups.append(cur_g)
                    cur_g = []
                cur_g.append(q)
            if cur_g:
                groups.append(cur_g)
            other = "bottom" if overall == "top" else "top"
            for g in groups:
                if len(g) * (hop / fps) >= 2.0:
                    for q in g:
                        labels[q] = other
            seg_start, cur = r["start"], labels[0]
            for q in range(1, len(labels) + 1):
                if q == len(labels) or labels[q] != cur:
                    end = r["end"] if q == len(labels) else (diffs[q - 1][0] + diffs[q][0]) / 2
                    speakers.append({"start": round(seg_start, 2), "end": round(end, 2), "who": cur})
                    if q < len(labels):
                        seg_start, cur = end, labels[q]

    layout["faces"] = faces_out
    layout["speakers"] = speakers
    info["layout"] = layout
    save_json(proj / "project.json", info)
    if (proj / "plan.json").exists():
        plan = load_json(proj / "plan.json")
        plan.setdefault("layout", {}).update({"faces": faces_out, "speakers": speakers})
        save_json(proj / "plan.json", plan)
    print(f"faces: {len(faces_out)} samples · speakers: " + (", ".join(f"{s['start']}–{s['end']} {s['who']}" for s in speakers) or "(no split-screen)"))


if __name__ == "__main__":
    main()
