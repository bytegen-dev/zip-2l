# zip 2l - Secure File Compression & Extraction

A full-stack web application for securely compressing and extracting files with password protection. Built with FastAPI and modern JavaScript.

## Features

- **Compress Files**: Upload multiple files/folders and create password-protected ZIP or 7z archives
- **Extract Archives**: Upload ZIP or 7z files and extract them with password support
- **Strong Encryption**: 
  - ZIP files use AES-256 encryption (via pyzipper)
  - 7z files use strong encryption with header encryption (recommended)
- **Privacy First**: Files are processed server-side and deleted immediately after use
- **Large File Support**: Handles files 500MB+ reliably with streaming
- **Modern UI**: Clean, responsive interface with drag-and-drop support

## Tech Stack

- **Backend**: Python 3.8+ with FastAPI
- **Frontend**: Vanilla JavaScript with modern CSS
- **Libraries**:
  - `pyzipper` - AES-256 encrypted ZIP files
  - `py7zr` - 7z archive support with strong encryption
  - `aiofiles` - Async file operations
  - `python-multipart` - File upload handling

## Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd zip-2l
```

2. **Create a virtual environment** (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

## Running the Application

### Development Mode

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at `http://localhost:8000`

### Production Mode

For production, use a production ASGI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### POST /compress

Compress files into a ZIP or 7z archive.

**Form Data**:
- `files`: Multiple files (multipart/form-data)
- `password`: Optional password string
- `format`: Archive format - "zip" or "7z" (default: "zip")

**Response**: Binary archive file stream

### POST /extract

Extract files from a ZIP or 7z archive.

**Form Data**:
- `archive`: Archive file (multipart/form-data)
- `password`: Optional password string (required if archive is encrypted)

**Response**: Binary ZIP file containing extracted files

**Error Codes**:
- `401`: Wrong password
- `400`: Invalid archive format or extraction error
- `500`: Server error

## Privacy & Security

🔒 **Privacy Statement**: 
- Files are processed only on the server
- All files (uploaded and extracted) are deleted immediately after processing
- No logging of file names or contents
- No persistent storage of user data

**Security Features**:
- AES-256 encryption for ZIP files (avoids weak ZipCrypto)
- 7z format recommended for stronger security (encrypts file names)
- HTTPS recommended for production deployments
- Temporary files cleaned up automatically

## Deployment

This application can be deployed on any platform that supports Python:

- **Render**: Add `requirements.txt` and set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Railway**: Automatic detection of FastAPI apps
- **Fly.io**: Use `fly.toml` configuration
- **DigitalOcean App Platform**: Supports Python apps
- **Vercel**: Use serverless functions (may require adjustments)

### Environment Variables

No environment variables required for basic operation. For production, consider:
- `PORT`: Server port (default: 8000)
- `MAX_UPLOAD_SIZE`: Maximum file size (configure in FastAPI)

## Limitations

- Maximum file size depends on server configuration and available memory
- Very large files (>1GB) may take significant time to process
- Browser memory limits apply to file uploads (server-side processing avoids this)

## License

Open source - ready for GitHub. See LICENSE file for details.

## Contributing

Contributions welcome! Please ensure:
- Code follows security best practices
- No logging of sensitive file information
- Proper cleanup of temporary files
- Tests for new features

## Support

For issues or questions, please open an issue on GitHub.

