#!/usr/bin/env python3
"""Test script to verify extraction works"""
import requests
import os
from pathlib import Path

# Get project root directory (parent of tests/)
project_root = Path(__file__).parent.parent
output_dir = project_root / "tests" / "outputs"
output_dir.mkdir(parents=True, exist_ok=True)

# Test with the password-protected ZIP we just created
zip_file = output_dir / "test_with_password.zip"

if not zip_file.exists():
    print(f"Error: {zip_file} not found. Run test_compress.py first.")
    exit(1)

print(f"Testing extraction of: {zip_file}")
print(f"File size: {zip_file.stat().st_size / 1024:.2f} KB")

# Test 1: Extract with correct password
print("\n1. Testing extraction with correct password...")
try:
    with open(zip_file, 'rb') as f:
        files = {'archive': (zip_file, f, 'application/zip')}
        data = {'password': 'test123'}
        response = requests.post('http://localhost:8000/extract', files=files, data=data, timeout=60)
    
    if response.status_code == 200:
        output_path = output_dir / 'test_extracted.zip'
        with open(output_path, 'wb') as out:
            out.write(response.content)
        print(f"✓ Success! Created {output_path} ({len(response.content) / 1024:.2f} KB)")
        
        # Verify the extracted file contains our PDF
        import zipfile
        with zipfile.ZipFile(output_path, 'r') as zf:
            files_in_zip = zf.namelist()
            print(f"  Files in extracted archive: {files_in_zip}")
    else:
        print(f"✗ Failed with status {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 2: Extract with wrong password
print("\n2. Testing extraction with wrong password...")
try:
    with open(zip_file, 'rb') as f:
        files = {'archive': (zip_file, f, 'application/zip')}
        data = {'password': 'wrongpassword'}
        response = requests.post('http://localhost:8000/extract', files=files, data=data, timeout=60)
    
    if response.status_code == 401:
        print("✓ Correctly rejected wrong password")
    else:
        print(f"✗ Unexpected status {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 3: Extract unencrypted ZIP
print("\n3. Testing extraction of unencrypted ZIP...")
unencrypted_zip = output_dir / "test_no_password.zip"
if unencrypted_zip.exists():
    try:
        with open(unencrypted_zip, 'rb') as f:
            files = {'archive': (unencrypted_zip.name, f, 'application/zip')}
            data = {}  # No password
            response = requests.post('http://localhost:8000/extract', files=files, data=data, timeout=60)
        
        if response.status_code == 200:
            output_path = output_dir / 'test_extracted_unencrypted.zip'
            with open(output_path, 'wb') as out:
                out.write(response.content)
            print(f"✓ Success! Created {output_path} ({len(response.content) / 1024:.2f} KB)")
        else:
            print(f"✗ Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
else:
    print("  Skipped - unencrypted ZIP not found")

print("\nExtraction test complete!")

