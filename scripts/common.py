"""Shared helpers for the pipeline scripts (stdlib only)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "projects"
BRAND = ROOT / "public" / "brand"

# Allowed component names (keep in sync with src/components/*/index.tsx)
SCENES = {
    "BigNumber", "KineticTitle", "Versus", "BarChart", "ListScene",
    "ProductShowcase", "QuoteCard", "ChapterCard", "LogoSting",
    "ChatMock", "FlowDiagram", "BigQuestion",
    "DecisionCard", "SortingPipeline", "Blockers", "GrowthCurve", "ReleaseRace",
    "Outgrow", "PredictionCard", "Trajectory", "Gauge", "IntervalTimeline", "Crowd", "Verdict", "RankSwap", "Hub", "LaggardRace", "PhoneNotification", "EventTimeline", "MoneyFlow", "Balance", "SearchBar", "PriceTag", "CalendarDate", "WorldMap", "LayerStack", "BeforeAfter", "Newspaper", "Battery", "Terminal", "Acquisition", "SocialPost",
    "Hero", "PhotoStack", "Callouts", "ZoomLens", "ScreenClip", "Lineup", "LockedGrid", "SignalBars", "PortPlug", "Thermometer", "LookAlike", "SiteWall", "SiteBuild", "ImageWipe", "RobotFleet", "MuseCard", "FrameAnalysis",
}
OVERLAYS = {
    "HookTitle", "KeywordPop", "LowerThird", "StatBadge", "ProductCard",
    "ListOverlay", "Sticker", "ProgressBar", "CTA",
}
TRANSITIONS = {"cut", "whip", "zoom", "flash", "slide", "box"}
TONES = {"paper", "primary", "dark", "secondary"}
BACKDROPS = {"classic", "circuit", "grid", "dots", "rays", "rings", "collage", "shapes", "split", "tape"}

# Platform UI insets, mirrored from src/lib/safe.tsx (1080x1920)
SHORT_SAFE = {
    "tiktok": dict(top=160, bottom=480, left=60, right=150),
    "reels": dict(top=220, bottom=420, left=60, right=140),
    "shorts": dict(top=180, bottom=400, left=60, right=150),
    "all": dict(top=220, bottom=480, left=60, right=150),
}


def project_dir(name_or_path: str) -> Path:
    p = Path(name_or_path)
    if p.exists() and p.is_dir():
        return p.resolve()
    return PROJECTS / name_or_path


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_theme() -> dict:
    """The active theme (src/theme/active.json): language, brand name, outro … written by scripts/apply_brand.py."""
    p = ROOT / "src" / "theme" / "active.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def load_env() -> None:
    """Minimal .env loader (KEY=VALUE lines) so we don't need python-dotenv."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def need(tool: str) -> None:
    if not shutil.which(tool):
        sys.exit(f"error: '{tool}' not found on PATH (see README → Setup)")


def ffprobe(path: Path) -> dict:
    need("ffprobe")
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    info = json.loads(out)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    fps = None
    if v and v.get("avg_frame_rate", "0/0") != "0/0":
        n, d = v["avg_frame_rate"].split("/")
        fps = round(float(n) / float(d), 3) if float(d) else None
    rotation = 0
    if v:
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rotation = int(sd["rotation"])
        rotation = int(v.get("tags", {}).get("rotate", rotation))
    w, h = (v["width"], v["height"]) if v else (None, None)
    if abs(rotation) in (90, 270) and w and h:
        w, h = h, w
    return {
        "duration": float(info["format"]["duration"]),
        "width": w,
        "height": h,
        "fps": fps,
        "vcodec": v and v.get("codec_name"),
        "variable_fps": bool(v and v.get("r_frame_rate") != v.get("avg_frame_rate")),
        "has_audio": a is not None,
    }


def fmt_t(s: float) -> str:
    m, sec = divmod(max(0.0, s), 60)
    return f"{int(m):02d}:{sec:05.2f}"
