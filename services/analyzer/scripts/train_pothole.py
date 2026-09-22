"""Fine-tune YOLOv8-seg from yolov8n-seg.pt on the local pothole dataset.

Uso (desde services/analyzer, con el venv activo):

    python scripts/train_pothole.py --epochs 50 --device cpu

El checkpoint best.pt se copia a models/pothole_seg.pt para el analyzer.
En CPU el entrenamiento completo puede tardar varias horas.
Para comprobar que el script arranca:

    python scripts/train_pothole.py --epochs 1 --batch 2
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


ANALYZER_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ANALYZER_ROOT.parents[1]
DATA_YAML = (
    REPO_ROOT
    / "Pothole_Segmentation_YOLOv8"
    / "Pothole_Segmentation_YOLOv8"
    / "data.yaml"
)
MODELS_DIR = ANALYZER_ROOT / "models"
DEFAULT_DEST = MODELS_DIR / "pothole_seg.pt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8-seg de baches")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--device", default="cpu", help="cpu, 0, 0,1, ...")
    parser.add_argument("--model", default="yolov8n-seg.pt", help="Checkpoint de preentrenamiento")
    parser.add_argument("--data", default=str(DATA_YAML))
    parser.add_argument("--project", default=str(ANALYZER_ROOT / "runs"))
    parser.add_argument("--name", default="pothole_seg")
    parser.add_argument("--dest", default=str(DEFAULT_DEST))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    data_path = Path(args.data)
    if not data_path.is_file():
        print(f"No se encontró data.yaml en {data_path}", file=sys.stderr)
        return 1

    try:
        from ultralytics import YOLO
    except ImportError:
        print("Instala dependencias: pip install -r requirements.txt", file=sys.stderr)
        return 1

    print(f"Preentrenamiento: {args.model}")
    print(f"Dataset: {data_path}")
    print(f"Device: {args.device}  epochs={args.epochs}  batch={args.batch}")

    model = YOLO(args.model)
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        exist_ok=True,
        pretrained=True,
    )

    save_dir = Path(results.save_dir)
    best = save_dir / "weights" / "best.pt"
    if not best.is_file():
        last = save_dir / "weights" / "last.pt"
        if last.is_file():
            best = last
        else:
            print(f"No se generaron pesos en {save_dir / 'weights'}", file=sys.stderr)
            return 1

    dest = Path(args.dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best, dest)
    print(f"Pesos listos: {dest}")
    print("Docker: docker compose cp ./services/analyzer/models/pothole_seg.pt analyzer:/app/models/pothole_seg.pt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
