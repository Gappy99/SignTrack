import csv
from pathlib import Path

from video_feature_extractor import VIDEO_EXTENSIONS, extract_video_features


def build_word_dataset(dataset_dir: Path, output_csv: Path) -> int:
    rows = []

    if not dataset_dir.exists():
        print(f"Dataset directory not found: {dataset_dir}")
        return 1

    for entry in sorted(dataset_dir.iterdir()):
        if not entry.is_dir():
            continue

        label = entry.name.strip()
        if len(label) <= 1:
            continue

        for video_file in sorted(entry.iterdir()):
            if not video_file.is_file():
                continue
            if video_file.suffix.lower() not in VIDEO_EXTENSIONS:
                continue

            result = extract_video_features(str(video_file))
            if not result.get("success"):
                print(f"Skipping {video_file.name}: {result.get('error')}")
                continue

            features = result.get("features")
            if not features:
                print(f"Skipping {video_file.name}: no features")
                continue

            rows.append([label, *features])

    if not rows:
        print("No valid word samples found. Add videos under src/IA/dataset/<WORD>/*.")
        return 1

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    header = ["label"] + [f"f{i}" for i in range(1, len(rows[0]))]

    with output_csv.open("w", newline="", encoding="utf-8") as file_handle:
        writer = csv.writer(file_handle)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"Word dataset generated: {output_csv}")
    print(f"Samples: {len(rows)}")
    return 0


if __name__ == "__main__":
    ia_root = Path(__file__).resolve().parent.parent
    dataset_dir = ia_root / "dataset"
    output_csv = dataset_dir / "word_dataset.csv"

    raise SystemExit(build_word_dataset(dataset_dir, output_csv))
