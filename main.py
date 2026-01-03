import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import pyzipper
import py7zr
import zipfile
import aiofiles
import io

# Configuration
MAX_ARCHIVE_SIZE = int(os.getenv("MAX_ARCHIVE_SIZE", 5 * 1024 * 1024 * 1024))  # Default 5GB
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 10))  # Default 10 requests per minute

app = FastAPI(title="zip 2l", description="Secure file compression and extraction tool")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)

# Create a sub-application for web routes
from fastapi import APIRouter

web_router = APIRouter()

@web_router.get("/")
async def web_root():
    """Serve the main HTML page"""
    return FileResponse(str(static_dir / "index.html"))

# Mount static files under /web/static
app.mount("/web/static", StaticFiles(directory=str(static_dir)), name="static")

# Mount web router under /web
app.include_router(web_router, prefix="/web")


@app.post("/compress")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute")
async def compress_files(
    request: Request,
    files: List[UploadFile] = File(...),
    password: Optional[str] = Form(None),
    format: str = Form("zip")
):
    """
    Compress uploaded files into a ZIP or 7z archive.
    
    Args:
        files: List of files to compress
        password: Optional password for encryption
        format: Archive format ('zip' or '7z')
    """
    if format not in ["zip", "7z"]:
        raise HTTPException(status_code=400, detail="Format must be 'zip' or '7z'")
    
    temp_dir = None
    archive_path = None
    
    try:
        # Check total file size
        total_size = 0
        file_contents = []
        for file in files:
            content = await file.read()
            total_size += len(content)
            file_contents.append((file.filename, content))
        
        if total_size > MAX_ARCHIVE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Total file size ({total_size / 1024 / 1024 / 1024:.2f} GB) exceeds maximum allowed size ({MAX_ARCHIVE_SIZE / 1024 / 1024 / 1024:.2f} GB)"
            )
        
        # Create temporary directory for processing
        temp_dir = tempfile.mkdtemp()
        temp_dir_path = Path(temp_dir)
        
        # Save uploaded files to temp directory
        for filename, content in file_contents:
            file_path = temp_dir_path / filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
        
        # Create archive
        archive_name = f"archive.{format}"
        archive_path = temp_dir_path / archive_name
        
        if format == "zip":
            # Create ZIP - use AES-256 encryption if password provided, otherwise unencrypted
            if password:
                # Create AES-256 encrypted ZIP
                with pyzipper.AESZipFile(
                    archive_path,
                    'w',
                    compression=pyzipper.ZIP_DEFLATED,
                    encryption=pyzipper.WZ_AES
                ) as zf:
                    zf.setpassword(password.encode('utf-8'))
                    
                    for file_path in temp_dir_path.iterdir():
                        if file_path.is_file() and file_path.name != archive_name:
                            zf.write(file_path, file_path.name)
            else:
                # Create unencrypted ZIP
                with zipfile.ZipFile(
                    archive_path,
                    'w',
                    compression=zipfile.ZIP_DEFLATED
                ) as zf:
                    for file_path in temp_dir_path.iterdir():
                        if file_path.is_file() and file_path.name != archive_name:
                            zf.write(file_path, file_path.name)
        else:  # 7z format
            with py7zr.SevenZipFile(archive_path, 'w', password=password) as archive:
                for file_path in temp_dir_path.iterdir():
                    if file_path.is_file() and file_path.name != archive_name:
                        archive.write(file_path, file_path.name)
        
        # Read the archive into memory before cleanup
        async with aiofiles.open(archive_path, 'rb') as f:
            archive_content = await f.read()
        
        # Clean up temp directory before returning response
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            temp_dir = None
        
        # Return the archive as a response
        from fastapi.responses import Response
        return Response(
            content=archive_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={archive_name}",
                "Content-Type": "application/octet-stream"
            }
        )
    
    except Exception as e:
        # Clean up on error
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")


@app.post("/extract")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute")
async def extract_archive(
    request: Request,
    archive: UploadFile = File(...),
    password: Optional[str] = Form(None)
):
    """
    Extract files from a ZIP or 7z archive.
    
    Args:
        archive: The archive file to extract
        password: Optional password if archive is encrypted
    """
    temp_dir = None
    archive_path = None
    
    try:
        # Read archive content and check size
        content = await archive.read()
        if len(content) > MAX_ARCHIVE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Archive size ({len(content) / 1024 / 1024 / 1024:.2f} GB) exceeds maximum allowed size ({MAX_ARCHIVE_SIZE / 1024 / 1024 / 1024:.2f} GB)"
            )
        
        # Create temporary directory for processing
        temp_dir = tempfile.mkdtemp()
        temp_dir_path = Path(temp_dir)
        
        # Save uploaded archive to temp directory
        archive_path = temp_dir_path / archive.filename
        async with aiofiles.open(archive_path, 'wb') as f:
            await f.write(content)
        
        # Determine archive type and extract
        extracted_files = []
        archive_ext = archive_path.suffix.lower()
        
        if archive_ext == ".zip":
            # Extract ZIP file
            try:
                with pyzipper.AESZipFile(archive_path, 'r') as zf:
                    if password:
                        zf.setpassword(password.encode('utf-8'))
                    
                    zf.extractall(temp_dir_path)
                    
                    # Collect extracted files
                    for file_path in temp_dir_path.rglob('*'):
                        if file_path.is_file() and file_path != archive_path:
                            extracted_files.append(file_path)
            
            except RuntimeError as e:
                if "Bad password" in str(e) or "Bad CRC" in str(e):
                    raise HTTPException(status_code=401, detail="Wrong password. Please try again.")
                raise
            except Exception as e:
                # Try with standard zipfile if pyzipper fails
                try:
                    with zipfile.ZipFile(archive_path, 'r') as zf:
                        if password:
                            zf.setpassword(password.encode('utf-8'))
                        zf.extractall(temp_dir_path)
                        
                        for file_path in temp_dir_path.rglob('*'):
                            if file_path.is_file() and file_path != archive_path:
                                extracted_files.append(file_path)
                except Exception as e2:
                    if "Bad password" in str(e2) or "Bad CRC" in str(e2):
                        raise HTTPException(status_code=401, detail="Wrong password. Please try again.")
                    raise HTTPException(status_code=400, detail=f"Failed to extract ZIP: {str(e2)}")
        
        elif archive_ext == ".7z":
            # Extract 7z file
            try:
                with py7zr.SevenZipFile(archive_path, mode='r', password=password) as archive_7z:
                    archive_7z.extractall(path=temp_dir_path)
                    
                    # Collect extracted files
                    for file_path in temp_dir_path.rglob('*'):
                        if file_path.is_file() and file_path != archive_path:
                            extracted_files.append(file_path)
            
            except py7zr.exceptions.Bad7zFile:
                raise HTTPException(status_code=400, detail="Invalid 7z file or wrong password.")
            except Exception as e:
                if "password" in str(e).lower() or "wrong" in str(e).lower():
                    raise HTTPException(status_code=401, detail="Wrong password. Please try again.")
                raise HTTPException(status_code=400, detail=f"Failed to extract 7z: {str(e)}")
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported archive format. Please upload a .zip or .7z file.")
        
        if not extracted_files:
            raise HTTPException(status_code=400, detail="Archive appears to be empty.")
        
        # Create a ZIP of extracted files for easy download
        output_zip_path = temp_dir_path / "extracted.zip"
        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_path in extracted_files:
                # Preserve relative path structure
                arcname = file_path.relative_to(temp_dir_path)
                zf.write(file_path, arcname)
        
        # Read the ZIP into memory before cleanup
        async with aiofiles.open(output_zip_path, 'rb') as f:
            zip_content = await f.read()
        
        # Clean up temp directory before returning response
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            temp_dir = None
        
        # Return the ZIP as a response
        from fastapi.responses import Response
        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={
                "Content-Disposition": "attachment; filename=extracted.zip",
                "Content-Type": "application/zip"
            }
        )
    
    except HTTPException:
        # Clean up on error
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except Exception as e:
        # Clean up on error
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

