CREATE TABLE IF NOT EXISTS signs (
    id BIGSERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('letter', 'word')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (label, type)
);

CREATE TABLE IF NOT EXISTS datasets (
    id BIGSERIAL PRIMARY KEY,
    sign_id BIGINT NOT NULL REFERENCES signs(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sign_id, file_url)
);

CREATE TABLE IF NOT EXISTS landmarks (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    points JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS features (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    vector JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_signs_label_type ON signs(label, type);
CREATE INDEX IF NOT EXISTS idx_datasets_sign_id ON datasets(sign_id);
CREATE INDEX IF NOT EXISTS idx_landmarks_dataset_id ON landmarks(dataset_id);
CREATE INDEX IF NOT EXISTS idx_features_dataset_id ON features(dataset_id);
