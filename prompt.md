# Cursor Prompt: Build a Web-Based File Compression/Decompression Tool

## Project Goal

Create a full-stack web application that allows users to:

- Upload files/folders and compress them into password-protected ZIP or 7z archives
- Upload existing ZIP or 7z archives, enter a password if required, and extract them
- Prioritize user privacy through open-source code and secure server-side processing
- Handle large files reliably (500 MB+), avoiding browser memory limits and interruptions

## Tech Stack

- **Frontend**: JavaScript (plain or React/Vue/Svelte – your choice, but keep it simple and modern)
- **Backend**: Python with FastAPI (preferred) or Flask
- **Deployment**: Any platform that supports Python (Render, Railway, Fly.io, Vercel with serverless, DigitalOcean, etc.)
- **Key Python libraries**:
  - `fastapi` + `uvicorn`
  - `pyzipper` (for AES-256 encrypted ZIP files)
  - `py7zr` (for strong 7z archives with header encryption)
  - Optional: `python-multipart` for file uploads

## Core Features

1. **Compression**

   - User drags/drops or selects multiple files/folders
   - Optional: Enter a strong password
   - Choose format: ZIP (with AES-256) or 7z (recommended for better security)
   - Server creates the archive and streams it back for download
   - Delete uploaded files and archive immediately after response

2. **Extraction**

   - User uploads a ZIP or 7z file
   - If password-protected, frontend prompts for password (can retry on wrong password)
   - Server attempts extraction with provided password
   - On success: Offer files as individual downloads or a new ZIP of extracted contents
   - On failure: Return "wrong password" error → frontend reprompts
   - Always delete uploaded archive and extracted files after processing

3. **Privacy & Trust**
   - Entire project must be open-source (ready for GitHub)
   - No logging of file names or contents
   - Clear privacy statement: "Files are processed only on the server and deleted immediately after use"

## Security Notes

- Use **AES-256** for ZIP (via pyzipper) – avoid legacy ZipCrypto
- Prefer **7z** format when possible: encrypts file names + stronger key derivation
- Validate file types and sizes if desired (but keep flexible)
- Use HTTPS in production

## API Endpoints (FastAPI example)

- `POST /compress` → multipart form with files, optional password, format (zip/7z)
- `POST /extract` → multipart form with archive file, password

## UI/UX Suggestions

- Clean, minimal interface (drag-and-drop zone)
- Progress indicators for large operations
- Password fields with show/hide toggle
- Clear error messages (e.g., "Wrong password – please try again")
- Tabs or sections: "Compress" and "Extract"

## Bonus Ideas (if time allows)

- Preserve folder structure on compression
- Streaming extraction (download files one-by-one to save server space)
- Client-side preview for small uncompressed files using fflate (optional hybrid)

## Starting Point

Create:

- `main.py` (FastAPI app with routes)
- `static/index.html` + JS for frontend
- Requirements.txt with needed packages

Make it functional first, then polish UI and add error handling.

Now begin implementation.
