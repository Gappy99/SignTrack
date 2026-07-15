import csv
import os
from pathlib import Path

from extract_from_image import extract_from_image


def build_letter_dataset(dataset_dir: Path, output_csv: Path) -> int:
    rows = []

    if not dataset_dir.exists():
        print(f"Dataset directory not found: {dataset_dir}")
        return 1

    for entry in sorted(dataset_dir.iterdir()):
        if not entry.is_dir():
            continue

        label = entry.name.strip()
        if len(label) != 1:
            # Letters-only dataset builder.
            continue

        for image_file in sorted(entry.iterdir()):
            if not image_file.is_file():
                continue

            result = extract_from_image(str(image_file))
            if not result.get("success"):
                print(f"Skipping {image_file.name}: {result.get('error')}")
                continue

            features = result.get("features", [])
            if not features:
                print(f"Skipping {image_file.name}: no features")
                continue

            rows.append([label, *features])

    if not rows:
        print("No valid letter samples found. Add images under services/recognition/src/dataset/<LETTER>/.")
        return 1

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    header = ["label"] + [f"f{i}" for i in range(1, len(rows[0]))]

    with output_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"Letter dataset generated: {output_csv}")
    print(f"Samples: {len(rows)}")
    return 0


if __name__ == "__main__":
    ia_root = Path(__file__).resolve().parent.parent
    dataset_dir = ia_root / "dataset"
    output_csv = dataset_dir / "sign_dataset.csv"

    raise SystemExit(build_letter_dataset(dataset_dir, output_csv))
