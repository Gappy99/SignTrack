# SignTrack IA - Next Steps

## Current Status
✅ Architecture: R2 (storage) → Python (extraction) → Neon (metadata) → Model (training)
✅ All Python scripts ready (MediaPipe + sklearn)
✅ All Node.js APIs ready
✅ Database schema created
⏳ **Blocker**: No training data in R2

## What to Do Next

### Step 1: Upload Training Data to R2

Create folders and upload sample images:
- `dataset/A/` - letter A images
- `dataset/B/` - letter B images
- `dataset/C/` - letter C images
- ... (repeat for all letters A-Z)

**Image Requirements:**
- JPG format, at least 20 images per letter
- Clear hand pose showing the letter
- Well-lit, different angles/lighting conditions
- 480x640 pixels or larger

### Step 2: Extract Landmarks from R2

Run the backfill process:
```bash
node src/IA/db/backfillFromR2.js
```

This will:
1. Download all images from R2
2. Extract 21-point hand landmarks using MediaPipe
3. Calculate 9-value feature vectors
4. Save to Neon database

**Expected Output:**
```
Processing: dataset/A/img1.jpg
✓ Extracted landmarks
✓ Saved to signs/datasets/landmarks/features tables
Processing: dataset/B/img1.jpg
...
Backfill complete! Loaded X signs with Y datasets
```

### Step 3: Generate Training CSV

Export landmarks from Neon to CSV:
```bash
node src/IA/db/exportLetterDatasetFromNeon.js
```

Creates: `src/IA/dataset/letter_training.csv`

### Step 4: Train Model

Train a RandomForest classifier:
```bash
c:/2024505/SignTrack/.venv/Scripts/python.exe src/IA/model/train_model.py
```

Creates: `src/IA/model/model.pkl`

### Step 5: Start API

Start the prediction server:
```bash
node src/IA/api/server.js
```

Server runs on `http://localhost:3000`

### Step 6: Test Prediction

Make a prediction request:

**Option A: With image path**
```bash
curl -X POST http://localhost:3000/predict-letter \
  -H "Content-Type: application/json" \
  -d '{"imagePath":"./test_a.jpg"}'
```

**Option B: With extracted features**
```bash
curl -X POST http://localhost:3000/predict-letter \
  -H "Content-Type: application/json" \
  -d '{"features":[0.12, 0.08, 0.11, 1.45, 1.39, 0.92, 1.23, 0.78, 0.95]}'
```

## Troubleshooting

**"relation 'signs' does not exist"**
→ Run `node src/IA/db/initSchema.js` first

**"No landmarks extracted"**
→ Check image format (JPG/PNG), hand visibility, file permissions

**"ModuleNotFoundError: joblib"**
→ Install: `./.venv/Scripts/pip install joblib scikit-learn pandas numpy opencv-python mediapipe`

**"Dataset not found at sign_dataset.csv"**
→ Need to run Step 2 (backfill) and Step 3 (export) first

## Architecture Files

- **Data**: R2 (S3-compatible)
- **Metadata**: Neon PostgreSQL
- **Processing**: Python MediaPipe + scikit-learn
- **API**: Node.js Express (port 3007)

### Key Python Scripts

| File | Purpose |
|------|---------|
| `src/IA/recognition/extract_from_image.py` | Extract 21 landmarks + 9 features |
| `src/IA/db/backfillFromR2.js` | Download R2 images → extract → save Neon |
| `src/IA/db/exportLetterDatasetFromNeon.js` | Export features → CSV for training |
| `src/IA/model/train_model.py` | Train RandomForest on CSV |
| `src/IA/api/server.js` | Prediction API endpoint |

## Timeline

With ~20 images per letter (26 letters = 520 total):

- Step 2 (backfill): ~10-15 mins (depends on R2 bandwidth)
- Step 3 (export): ~1 min
- Step 4 (training): ~2-5 mins
- **Total**: ~20 mins to working model

## Future Enhancements

- [ ] Word recognition (sequence-based detection)
- [ ] Gemini integration for text refinement
- [ ] Prisma ORM (optional, for type safety)
- [ ] React UI for live prediction
