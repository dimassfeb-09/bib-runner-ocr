# Lightweight Runtime (Runner)
# Pin to bookworm (Debian 12) - paddlepaddle 2.6.x is compiled against
# glibc <=2.36; the default "slim" tag now resolves to Trixie (glibc 2.41)
# which causes a munmap_chunk SIGABRT at import time.
FROM python:3.10-slim-bookworm

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list 2>/dev/null; \
    apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV FLAGS_use_mkldnn=0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR recognition models so the container starts instantly
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='en', det=False, rec=True)" || echo "WARNING: Pre-downloading PaddleOCR models failed during build. Models will be downloaded at runtime."

# Model weights (already in ONNX format)
COPY weights/ ./weights/
COPY app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]