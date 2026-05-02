FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --omit=dev

RUN python3 -m pip install --no-cache-dir --break-system-packages \
    numpy \
    pandas \
    scikit-learn \
    joblib \
    opencv-python-headless \
    mediapipe \
    python-dotenv

COPY index.js ./
COPY src ./src
COPY microservices ./microservices

ENV PYTHON_EXECUTABLE=python3
