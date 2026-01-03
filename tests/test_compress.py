#!/usr/bin/env python3
"""Test script to verify compression works with test files"""
import requests
import os
from pathlib import Path

# Get project root directory (parent of tests/)
project_root = Path(__file__).parent.parent
output_dir = project_root / "tests" / "outputs"
output_dir.mkdir(parents=True, exist_ok=True)

# Test file (in project root) - change this to your test file
TEST_FILE_NAME = "charity.mp4"
test_file = project_root / TEST_FILE_NAME

if not test_file.exists():
    print(f"Error: {test_file} not found")
    exit(1)

print(f"Testing compression of: {test_file}")
print(f"File size: {os.path.getsize(test_file) / 1024 / 1024:.2f} MB")

# Test 1: Compress without password
print("\n1. Testing compression without password (ZIP)...")
try:
    with open(test_file, 'rb') as f:
        files = {'files': (test_file.name, f, 'application/octet-stream')}
        data = {'format': 'zip'}
        response = requests.post('http://localhost:8000/compress', files=files, data=data, timeout=60)
    
    if response.status_code == 200:
        output_path = output_dir / 'test_no_password.zip'
        with open(output_path, 'wb') as out:
            out.write(response.content)
        print(f"✓ Success! Created {output_path} ({len(response.content) / 1024:.2f} KB)")
    else:
        print(f"✗ Failed with status {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 2: Compress with password
print("\n2. Testing compression with password (ZIP)...")
try:
    with open(test_file, 'rb') as f:
        files = {'files': (test_file.name, f, 'application/octet-stream')}
        data = {'format': 'zip', 'password': 'test123'}
        response = requests.post('http://localhost:8000/compress', files=files, data=data, timeout=60)
    
    if response.status_code == 200:
        output_path = output_dir / 'test_with_password.zip'
        with open(output_path, 'wb') as out:
            out.write(response.content)
        print(f"✓ Success! Created {output_path} ({len(response.content) / 1024:.2f} KB)")
    else:
        print(f"✗ Failed with status {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 3: Compress as 7z
print("\n3. Testing compression with password (7z)...")
try:
    with open(test_file, 'rb') as f:
        files = {'files': (test_file.name, f, 'application/octet-stream')}
        data = {'format': '7z', 'password': 'test123'}
        response = requests.post('http://localhost:8000/compress', files=files, data=data, timeout=60)
    
    if response.status_code == 200:
        output_path = output_dir / 'test_7z.7z'
        with open(output_path, 'wb') as out:
            out.write(response.content)
        print(f"✓ Success! Created {output_path} ({len(response.content) / 1024:.2f} KB)")
    else:
        print(f"✗ Failed with status {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\nTest complete!")

