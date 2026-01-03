# zip 2l

Secure file compression and extraction tool. Compress files into password-protected ZIP/7z archives or extract them. All processing happens server-side and files are deleted immediately after use.

<img width="1132" height="1073" alt="image" src="https://github.com/user-attachments/assets/c6415463-a37f-4050-aaf6-5715504bc3a4" />

**Live Demo:** https://zip-2l-production.up.railway.app/web

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/bytegen-dev/zip-2l.git
cd zip-2l
docker-compose up
```

Visit `http://localhost:8000/web` to use it.

### Local Setup

```bash
# Clone and setup
git clone https://github.com/bytegen-dev/zip-2l.git
cd zip-2l
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
python main.py
```

Visit `http://localhost:8000/web` to use it.

## Features

- Compress files/folders → password-protected ZIP or 7z
- Extract archives → with password support
- AES-256 encryption for ZIP files
- 7z format (recommended - stronger security)
- Dark/light mode toggle
- Selective file downloads after extraction
- Compression level control (1-9)
- Rate limiting & size limits
- Clean minimal UI

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JS + CSS
- **Libraries**: pyzipper, py7zr, JSZip

## API

- `POST /compress` - Compress files (form data: files, password, format, compression_level)
- `POST /extract` - Extract archive (form data: archive, password)

Returns JSON with file list and base64-encoded ZIP data.

## Config

Environment variables:

- `MAX_ARCHIVE_SIZE` - Max size in bytes (default: 5GB)
- `RATE_LIMIT_PER_MINUTE` - Rate limit per IP (default: 10)

## Privacy

Files are processed server-side and deleted immediately. No logging, no storage. Your files stay private.

## Deploy

### Railway

1. Connect your GitHub repo to Railway
2. Railway auto-detects the `Dockerfile` and builds it
3. Set env vars if needed: `MAX_ARCHIVE_SIZE`, `RATE_LIMIT_PER_MINUTE`
4. Done - Railway handles everything

### Docker

```bash
docker build -t zip-2l .
docker run -p 8000:8000 zip-2l
```

Or use docker-compose:

```bash
docker-compose up -d
```

### Other Platforms

Works on Render, Fly.io, DigitalOcean, etc. Just point to `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Repo

https://github.com/bytegen-dev/zip-2l
