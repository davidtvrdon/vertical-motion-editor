#!/usr/bin/env python3
"""Synthesize the small SFX kit used by the editor (whoosh, pop, click, riser, thud).

All sounds are generated from code so the repo ships royalty-free SFX.
Output: public/brand/sfx/*.wav (48 kHz, 16-bit, stereo).

    python3 scripts/make_sfx.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "public" / "brand" / "sfx"
rng = np.random.default_rng(7)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(SR * seconds)) / SR


def one_pole_lowpass(x: np.ndarray, cutoff: np.ndarray) -> np.ndarray:
    """Lowpass with a per-sample cutoff (Hz) so we can sweep it."""
    y = np.zeros_like(x)
    a = np.exp(-2 * np.pi * np.asarray(cutoff) / SR) * np.ones_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev
        y[i] = prev
    return y


def envelope(n: int, attack: float, release: float) -> np.ndarray:
    a = int(SR * attack)
    r = int(SR * release)
    env = np.ones(n)
    if a:
        env[:a] = np.linspace(0, 1, a) ** 2
    if r:
        env[-r:] *= np.linspace(1, 0, r) ** 2
    return env


def normalize(x: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    peak = np.max(np.abs(x)) or 1.0
    return x / peak * (10 ** (peak_db / 20))


def write(name: str, left: np.ndarray, right: np.ndarray | None = None) -> None:
    right = left if right is None else right
    stereo = np.stack([left, right], axis=1)
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", OUT / f"{name}.wav")


def whoosh() -> None:
    t = t_axis(0.42)
    noise = rng.standard_normal(len(t))
    # Cutoff sweeps up then down -> air passing by.
    shape = np.sin(np.pi * np.clip(t / t[-1], 0, 1)) ** 1.5
    cutoff = 300 + 5200 * shape
    x = one_pole_lowpass(noise, cutoff)
    x = one_pole_lowpass(x, cutoff)
    x *= shape
    pan = np.linspace(-0.7, 0.7, len(t))  # left -> right movement
    x = normalize(x, -4)
    write("whoosh", x * (1 - pan) / 1.4, x * (1 + pan) / 1.4)


def pop() -> None:
    t = t_axis(0.14)
    freq = 900 * np.exp(-t * 28) + 380
    phase = 2 * np.pi * np.cumsum(freq) / SR
    x = np.sin(phase) * np.exp(-t * 38)
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    write("pop", normalize(x, -5))


def click() -> None:
    t = t_axis(0.05)
    x = (np.sin(2 * np.pi * 2400 * t) * 0.6 + rng.standard_normal(len(t)) * 0.4) * np.exp(-t * 160)
    write("click", normalize(x, -8))


def riser() -> None:
    t = t_axis(0.9)
    freq = 180 * (2 ** (t / t[-1] * 2.5))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    tone = np.sin(phase) * 0.35 + np.sin(phase * 2.01) * 0.15
    noise = one_pole_lowpass(rng.standard_normal(len(t)), 800 + 7000 * (t / t[-1]) ** 2) * 0.8
    x = (tone + noise) * (t / t[-1]) ** 2 * envelope(len(t), 0.0, 0.03)
    write("riser", normalize(x, -6))


def thud() -> None:
    t = t_axis(0.5)
    freq = 110 * np.exp(-t * 9) + 42
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 7)
    transient = one_pole_lowpass(rng.standard_normal(len(t)), np.full(len(t), 2500.0)) * np.exp(-t * 90) * 0.6
    write("thud", normalize(body + transient, -3))


if __name__ == "__main__":
    whoosh()
    pop()
    click()
    riser()
    thud()
