#!/usr/bin/env bash
# Crea .venv del analyzer. Preferir Python 3.13 (local) o 3.11–3.12 (mejor soporte Torch/YOLO).
set -euo pipefail
cd "$(dirname "$0")/.."

pick_python() {
  for c in python3.13 python3.12 python3.11 python3; do
    if command -v "$c" >/dev/null 2>&1; then
      ver=$("$c" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      major=${ver%%.*}
      minor=${ver#*.}
      if [[ "$major" -eq 3 && "$minor" -ge 11 && "$minor" -le 13 ]]; then
        echo "$c"
        return 0
      fi
    fi
  done
  echo "ERROR: se necesita Python 3.11–3.13 (no uses 3.14 todavía: faltan wheels de NumPy/OpenCV/Torch)." >&2
  exit 1
}

PY=$(pick_python)
echo "Usando: $PY ($($PY --version))"
rm -rf .venv
"$PY" -m venv .venv
.venv/bin/pip install -U pip setuptools wheel
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt

if .venv/bin/pip install -r requirements-ml.txt; then
  echo "OK: YOLO/ultralytics instalado"
else
  echo "AVISO: no se pudo instalar requirements-ml.txt (PyTorch/ultralytics)."
  echo "       El analyzer arranca en modo stub YOLO; PDI/DSP sí funcionan."
  echo "       En macOS Intel, prueba Python 3.12 y: .venv/bin/pip install -r requirements-ml.txt"
fi

.venv/bin/python - <<'PY'
import numpy, cv2, fastapi
print(f"numpy={numpy.__version__}  opencv={cv2.__version__}  fastapi={fastapi.__version__}")
try:
    import ultralytics
    print(f"ultralytics={ultralytics.__version__}")
except Exception as e:
    print(f"ultralytics=NO ({e.__class__.__name__})")
PY

echo "OK: services/analyzer/.venv listo"
