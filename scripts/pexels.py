#!/usr/bin/env python3
"""Pexels b-roll / photo fetcher (https://www.pexels.com/api/documentation/).

Needs PEXELS_API_KEY in .env. Free tier: 200 requests/hour, 20 000/month.

  # Fill every cut in a plan that has a `query` but no `src` (type broll → video, image → photo)
  python3 scripts/pexels.py fill <project>

  # Browse candidates (advanced mode: pick exact clips)
  python3 scripts/pexels.py search "server room" [--photos] [--orientation portrait] [--n 10]

  # Download a specific clip / photo by Pexels id into a project
  python3 scripts/pexels.py get <project> 3129671 [--photo]

  # Check that your API key works (one tiny request)
  python3 scripts/pexels.py check

Queries work best in ENGLISH, concrete and visual ("hands typing on laptop close up"),
not abstract ("productivity"). Pexels credit is stored in each cut's `credit`.
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from common import ROOT, load_env, load_json, project_dir, save_json

API = "https://api.pexels.com"
UA = "vertical-motion-editor/1.0 (Pexels API client)"
CACHE = ROOT / ".cache" / "pexels"


def key() -> str:
    load_env()
    k = os.environ.get("PEXELS_API_KEY", "").strip()
    if not k:
        sys.exit("error: PEXELS_API_KEY missing. Get a free key at https://www.pexels.com/api/ and put it in .env as PEXELS_API_KEY=… (see .env.example)")
    return k


def api(path: str, params: dict | None = None) -> dict:
    url = f"{API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    CACHE.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".json")
    if cache_file.exists() and time.time() - cache_file.stat().st_mtime < 7 * 86400:
        return json.loads(cache_file.read_text())
    req = urllib.request.Request(url, headers={"Authorization": key(), "User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode())
                cache_file.write_text(json.dumps(data))
                return data
        except urllib.error.HTTPError as e:
            if e.code == 429:
                sys.exit("error: Pexels rate limit hit (200/hour). Wait or reuse cached results.")
            if e.code in (500, 502, 503) and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"error: Pexels {e.code} for {url}: {e.read()[:200]!r}")
    raise RuntimeError("unreachable")


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    return dest


def best_file(video: dict, orientation: str, min_short_side: int) -> dict | None:
    """Smallest mp4 rendition whose short side is >= min_short_side (fallback: the largest)."""
    files = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("width") and f.get("height")]
    if not files:
        return None
    files.sort(key=lambda f: f["width"] * f["height"])
    ok = [f for f in files if min(f["width"], f["height"]) >= min_short_side and (f.get("fps") or 30) <= 60]
    return ok[0] if ok else files[-1]


def orientation_ok(w: int, h: int, orientation: str) -> bool:
    return h > w if orientation == "portrait" else w > h if orientation == "landscape" else True


def pick_video(query: str, need_s: float, orientation: str, used: set[int], min_short_side: int):
    for orient in (orientation, None):  # fall back to any orientation (it gets cropped)
        data = api("/videos/search", {"query": query, "orientation": orient, "size": "medium", "per_page": 20})
        cands = []
        for v in data.get("videos", []):
            if v["id"] in used or v.get("duration", 0) < need_s + 0.5:
                continue
            f = best_file(v, orientation, min_short_side)
            if not f:
                continue
            score = (2 if orientation_ok(v["width"], v["height"], orientation) else 0) - abs(v["duration"] - 10) / 30
            cands.append((score, v, f))
        if cands:
            cands.sort(key=lambda c: -c[0])
            return cands[0][1], cands[0][2]
    return None, None


def pick_photo(query: str, orientation: str, used: set[int]):
    for orient in (orientation, None):
        data = api("/v1/search", {"query": query, "orientation": orient, "per_page": 20})
        for p in data.get("photos", []):
            if p["id"] not in used:
                return p
    return None


def fill(project: str, dry: bool = False) -> None:
    proj = project_dir(project)
    plan_path = proj / "plan.json"
    plan = load_json(plan_path)
    short = plan["format"] == "short"
    orientation = "portrait" if short else "landscape"
    min_side = 1080
    used = {c.get("pexels_id") for c in plan.get("cuts", []) if c.get("pexels_id")}
    changed = 0
    for i, c in enumerate(plan.get("cuts", [])):
        if c.get("src") or not c.get("query") or c.get("type") not in ("broll", "image"):
            continue
        need = (c["end"] - c["start"]) * c.get("rate", 1)
        if c["type"] == "broll":
            v, f = pick_video(c["query"], need, orientation, used, min_side)
            if not v:
                print(f"  #{i:02d} no clip for “{c['query']}” — try a more concrete query or use a scene")
                continue
            dest = proj / "assets" / f"pexels-{v['id']}.mp4"
            print(f"  #{i:02d} “{c['query']}” → {v['id']} ({v['duration']}s, {f['width']}x{f['height']})")
            if not dry:
                download(f["link"], dest)
            c.update(src=f"assets/{dest.name}", pexels_id=v["id"], credit=f"Video: {v['user']['name']} / Pexels", pexels_url=v["url"])
            # skip the often-static first second when there is room
            c.setdefault("trim", 1.0 if v["duration"] >= need + 2.5 else 0)
            used.add(v["id"])
        else:
            p = pick_photo(c["query"], orientation, used)
            if not p:
                print(f"  #{i:02d} no photo for “{c['query']}”")
                continue
            dest = proj / "assets" / f"pexels-{p['id']}.jpg"
            print(f"  #{i:02d} “{c['query']}” → photo {p['id']} ({p['width']}x{p['height']})")
            if not dry:
                download(p["src"]["large2x"], dest)
            c.update(src=f"assets/{dest.name}", pexels_id=p["id"], credit=f"Photo: {p['photographer']} / Pexels", pexels_url=p["url"])
            used.add(p["id"])
        changed += 1
    if not dry:
        save_json(plan_path, plan)
    print(f"filled {changed} cut(s) → {plan_path}")


def search(query: str, photos: bool, orientation: str | None, n: int) -> None:
    if photos:
        data = api("/v1/search", {"query": query, "orientation": orientation, "per_page": n})
        for p in data.get("photos", []):
            print(f"photo {p['id']:>10}  {p['width']}x{p['height']}  {p.get('alt', '')[:60]!r}  preview: {p['src']['medium']}")
        return
    data = api("/videos/search", {"query": query, "orientation": orientation, "size": "medium", "per_page": n})
    for v in data.get("videos", []):
        print(f"video {v['id']:>10}  {v['duration']:>3}s  {v['width']}x{v['height']}  {v['url']}  thumb: {v.get('image')}")


def get(project: str, pid: int, photo: bool) -> None:
    proj = project_dir(project)
    if photo:
        p = api(f"/v1/photos/{pid}")
        dest = download(p["src"]["large2x"], proj / "assets" / f"pexels-{pid}.jpg")
        print(f"assets/{dest.name}  (Photo: {p['photographer']} / Pexels)")
    else:
        v = api(f"/videos/videos/{pid}")
        f = best_file(v, "any", 1080)
        dest = download(f["link"], proj / "assets" / f"pexels-{pid}.mp4")
        print(f"assets/{dest.name}  {v['duration']}s  (Video: {v['user']['name']} / Pexels)")


def check() -> None:
    """One request that tells a missing, invalid or working key apart (exit code 1 unless it works)."""
    load_env()
    k = os.environ.get("PEXELS_API_KEY", "").strip()
    if not k:
        sys.exit("PEXELS_API_KEY is not set. Get a free key at https://www.pexels.com/api/ and add it to .env")
    req = urllib.request.Request(f"{API}/v1/search?query=nature&per_page=1", headers={"Authorization": k, "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            left = r.headers.get("X-Ratelimit-Remaining")
            print("Pexels key OK" + (f" ({left} requests left this month)" if left else ""))
    except urllib.error.HTTPError as e:
        sys.exit("Pexels rejected the key (401/403). Copy it again from https://www.pexels.com/api/ (no quotes, no spaces)." if e.code in (401, 403) else f"Pexels error {e.code}")
    except urllib.error.URLError as e:
        sys.exit(f"cannot reach Pexels: {e.reason}")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    a = sub.add_parser("fill")
    a.add_argument("project")
    a.add_argument("--dry", action="store_true")
    b = sub.add_parser("search")
    b.add_argument("query")
    b.add_argument("--photos", action="store_true")
    b.add_argument("--orientation", choices=["portrait", "landscape", "square"])
    b.add_argument("--n", type=int, default=10)
    c = sub.add_parser("get")
    c.add_argument("project")
    c.add_argument("id", type=int)
    c.add_argument("--photo", action="store_true")
    args = ap.parse_args()
    if args.cmd == "check":
        check()
    elif args.cmd == "fill":
        fill(args.project, args.dry)
    elif args.cmd == "search":
        search(args.query, args.photos, args.orientation, args.n)
    else:
        get(args.project, args.id, args.photo)


if __name__ == "__main__":
    main()
