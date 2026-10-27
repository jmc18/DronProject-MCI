from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class VideoMeta:
    container: str
    codec: str
    width: int
    height: int
    fps: float
    duration_sec: float
    bitrate: int | None
    has_video: bool
    warning: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class FfprobeError(Exception):
    pass


def _run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        check=False,
        shell=False,
    )


def find_tool(name: str) -> str | None:
    """Resuelve ffmpeg/ffprobe: env, PATH o la carpeta típica de winget."""
    env_value = os.environ.get(f"{name.upper()}_PATH") or os.environ.get("FFMPEG_BIN") or ""
    if env_value:
        candidate = Path(env_value)
        if candidate.is_dir():
            exe = candidate / (f"{name}.exe" if os.name == "nt" else name)
            if exe.is_file():
                return str(exe)
        elif candidate.is_file():
            if candidate.stem.lower() == name.lower():
                return str(candidate)
            sibling = candidate.with_name(name + candidate.suffix)
            if sibling.is_file():
                return str(sibling)

    found = shutil.which(name)
    if found:
        return found

    if os.name == "nt":
        local = os.environ.get("LOCALAPPDATA", "")
        roots = [
            Path(local) / "Microsoft" / "WinGet" / "Packages",
            Path(local) / "Microsoft" / "WinGet" / "Links",
            Path(r"C:\ffmpeg\bin"),
        ]
        for root in roots:
            if not root.exists():
                continue
            if root.is_dir() and (root / f"{name}.exe").is_file():
                return str(root / f"{name}.exe")
            matches = list(root.glob(f"**/bin/{name}.exe"))
            if matches:
                return str(matches[0])
    return None


def probe_video(path: str) -> VideoMeta:
    ffprobe = find_tool("ffprobe")
    if not ffprobe:
        raise FfprobeError("ffprobe no está instalado en el PATH")

    proc = _run(
        [
            ffprobe,
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ]
    )
    if proc.returncode != 0:
        raise FfprobeError(proc.stderr.strip() or "ffprobe falló")

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise FfprobeError("Salida ffprobe inválida") from exc

    format_name = str(data.get("format", {}).get("format_name", ""))
    if "mp4" not in format_name and "mov" not in format_name and "isom" not in format_name:
        # Algunos MP4 reportan isom/iso2
        if "mp4" not in format_name.lower():
            pass  # toleramos; validamos stream

    video_streams = [
        s for s in data.get("streams", []) if s.get("codec_type") == "video"
    ]
    if not video_streams:
        raise FfprobeError("El archivo no contiene stream de video")

    vs = video_streams[0]
    codec = str(vs.get("codec_name", "")).lower()
    allowed = {"h264", "hevc", "h265"}
    if codec not in allowed and codec.replace(".", "") not in allowed:
        raise FfprobeError(f"Códec no soportado: {codec} (se requiere H.264/H.265)")

    width = int(vs.get("width") or 0)
    height = int(vs.get("height") or 0)
    fps = _parse_fps(vs.get("avg_frame_rate") or vs.get("r_frame_rate") or "0/1")
    duration = float(data.get("format", {}).get("duration") or vs.get("duration") or 0)
    bitrate_raw = data.get("format", {}).get("bit_rate")
    bitrate = int(bitrate_raw) if bitrate_raw else None

    warning = None
    if width != 7680 or height != 4320:
        warning = f"Resolución {width}x{height} distinta de 8K (7680x4320)"

    container = format_name.split(",")[0] if format_name else "mp4"
    return VideoMeta(
        container=container,
        codec=codec,
        width=width,
        height=height,
        fps=fps,
        duration_sec=duration,
        bitrate=bitrate,
        has_video=True,
        warning=warning,
    )


def _parse_fps(rate: str) -> float:
    try:
        if "/" in rate:
            num, den = rate.split("/", 1)
            n, d = float(num), float(den)
            return n / d if d else 0.0
        return float(rate)
    except (ValueError, ZeroDivisionError):
        return 0.0
