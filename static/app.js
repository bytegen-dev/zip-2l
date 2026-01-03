let compressFilesList = [];
let extractFile = null;

// Theme toggle
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById("theme-icon");
  
  if (body.classList.contains("light-mode")) {
    body.classList.remove("light-mode");
    icon.className = "fas fa-moon";
    localStorage.setItem("theme", "dark");
  } else {
    body.classList.add("light-mode");
    icon.className = "fas fa-sun";
    localStorage.setItem("theme", "light");
  }
}

// Load saved theme
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  const icon = document.getElementById("theme-icon");
  
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (icon) icon.className = "fas fa-sun";
  }
});

// Tab switching
function switchTab(tab) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));

  if (tab === "compress") {
    document.querySelectorAll(".tab")[0].classList.add("active");
    document.getElementById("compress-tab").classList.add("active");
  } else {
    document.querySelectorAll(".tab")[1].classList.add("active");
    document.getElementById("extract-tab").classList.add("active");
  }

  // Clear errors
  document.querySelectorAll(".error").forEach((e) => {
    e.classList.remove("active");
    e.textContent = "";
  });
  document.querySelectorAll(".success").forEach((e) => {
    e.classList.remove("active");
    e.textContent = "";
  });
}

// Password toggle
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}

// Drag and drop for compress
const compressZone = document.getElementById("compress-zone");
const compressInput = document.getElementById("compress-files");

compressZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  compressZone.classList.add("dragover");
});

compressZone.addEventListener("dragleave", () => {
  compressZone.classList.remove("dragover");
});

compressZone.addEventListener("drop", (e) => {
  e.preventDefault();
  compressZone.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);
  addCompressFiles(files);
});

compressInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  addCompressFiles(files);
});

function addCompressFiles(files) {
  compressFilesList = [...compressFilesList, ...files];
  updateCompressFileList();
}

function removeCompressFile(index) {
  compressFilesList.splice(index, 1);
  updateCompressFileList();
}

function updateCompressFileList() {
  const list = document.getElementById("compress-file-list");
  if (compressFilesList.length === 0) {
    list.innerHTML = "";
    return;
  }

  const totalSize = compressFilesList.reduce((sum, file) => sum + file.size, 0);
  
  list.innerHTML = `
    <div class="file-list-header">
      <strong>${compressFilesList.length} file${compressFilesList.length !== 1 ? 's' : ''} selected</strong>
      <span>Total: ${formatFileSize(totalSize)}</span>
    </div>
    <div class="file-list-table">
      ${compressFilesList
        .map(
          (file, index) => `
            <div class="file-item">
              <div class="file-info">
                <i class="fas fa-file"></i>
                <span class="file-name" title="${file.name}">${file.name}</span>
              </div>
              <span class="file-size">${formatFileSize(file.size)}</span>
              <button class="remove" onclick="removeCompressFile(${index})" title="Remove">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

// Drag and drop for extract
const extractZone = document.getElementById("extract-zone");
const extractInput = document.getElementById("extract-file");

extractZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  extractZone.classList.add("dragover");
});

extractZone.addEventListener("dragleave", () => {
  extractZone.classList.remove("dragover");
});

extractZone.addEventListener("drop", (e) => {
  e.preventDefault();
  extractZone.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    extractFile = files[0];
    updateExtractFileList();
  }
});

extractInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    extractFile = e.target.files[0];
    updateExtractFileList();
  }
});

function updateExtractFileList() {
  const list = document.getElementById("extract-file-name");
  if (!extractFile) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = `
                <div class="file-item">
                    <span>${extractFile.name} (${formatFileSize(
    extractFile.size
  )})</span>
                </div>
            `;
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  );
}

// Compress files
async function compressFiles() {
  if (compressFilesList.length === 0) {
    showError(
      "compress-error",
      "Please select at least one file to compress."
    );
    return;
  }

  const password = document.getElementById("compress-password").value;
  const format = document.getElementById("compress-format").value;
  const compressionLevel = parseInt(document.getElementById("compress-level").value) || 5;
  const btn = document.getElementById("compress-btn");
  const progress = document.getElementById("compress-progress");
  const errorDiv = document.getElementById("compress-error");
  const successDiv = document.getElementById("compress-success");

  // Reset UI
  errorDiv.classList.remove("active");
  successDiv.classList.remove("active");
  btn.disabled = true;
  progress.classList.add("active");

  try {
    const formData = new FormData();
    compressFilesList.forEach((file) => {
      formData.append("files", file);
    });
    if (password) {
      formData.append("password", password);
    }
    formData.append("format", format);
    formData.append("compression_level", compressionLevel.toString());

    const response = await fetch("/compress", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Compression failed");
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    successDiv.textContent =
      "Files compressed successfully! Download started.";
    successDiv.classList.add("active");

    // Clear files
    compressFilesList = [];
    updateCompressFileList();
    document.getElementById("compress-password").value = "";
  } catch (error) {
    showError("compress-error", error.message);
  } finally {
    btn.disabled = false;
    progress.classList.remove("active");
  }
}

// Extract archive
async function extractArchive() {
  if (!extractFile) {
    showError(
      "extract-error",
      "Please select an archive file to extract."
    );
    return;
  }

  const password = document.getElementById("extract-password").value;
  const btn = document.getElementById("extract-btn");
  const progress = document.getElementById("extract-progress");
  const errorDiv = document.getElementById("extract-error");
  const successDiv = document.getElementById("extract-success");

  // Reset UI
  errorDiv.classList.remove("active");
  successDiv.classList.remove("active");
  btn.disabled = true;
  progress.classList.add("active");

  try {
    const formData = new FormData();
    formData.append("archive", extractFile);
    if (password) {
      formData.append("password", password);
    }

    const response = await fetch("/extract", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error(
          error.detail || "Wrong password. Please try again."
        );
      }
      throw new Error(error.detail || "Extraction failed");
    }

    // Parse JSON response
    const data = await response.json();
    const files = data.files || [];
    const zipData = data.zip_data;
    const zipFilename = data.zip_filename || "extracted.zip";

    // Download the extracted files ZIP
    const binaryString = atob(zipData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show file list
    showExtractedFiles(files, zipData, zipFilename);

    successDiv.textContent =
      "Archive extracted successfully! Download started.";
    successDiv.classList.add("active");

    // Clear file
    extractFile = null;
    updateExtractFileList();
    document.getElementById("extract-password").value = "";
  } catch (error) {
    showError("extract-error", error.message);
  } finally {
    btn.disabled = false;
    progress.classList.remove("active");
  }
}

let extractedFilesData = null;
let extractedZipData = null;
let extractedZipFilename = null;

function showExtractedFiles(files, zipData, zipFilename) {
  extractedFilesData = files;
  extractedZipData = zipData;
  extractedZipFilename = zipFilename;
  
  const fileListDiv = document.getElementById("extract-file-list");
  if (!fileListDiv) return;
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  
  fileListDiv.innerHTML = `
    <div class="extracted-files-section">
      <div class="file-list-header">
        <strong>${files.length} file${files.length !== 1 ? 's' : ''} extracted</strong>
        <span>Total: ${formatFileSize(totalSize)}</span>
      </div>
      <div style="margin: 10px 0;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="select-all-files" onchange="toggleAllFiles(this.checked)" checked>
          <span>Select All</span>
        </label>
      </div>
      <div class="file-list-table">
        ${files.map((file, index) => `
          <div class="file-item">
            <label style="display: flex; align-items: center; flex: 1; gap: 8px; cursor: pointer; min-width: 0;">
              <input type="checkbox" class="file-checkbox" data-index="${index}" checked>
              <div class="file-info" style="flex: 1; min-width: 0;">
                <i class="fas fa-file"></i>
                <span class="file-name" title="${file.name}">${file.name}</span>
              </div>
            </label>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button class="remove" onclick="downloadSingleFile(${index})" title="Download this file">
              <i class="fas fa-download"></i>
            </button>
          </div>
        `).join("")}
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn" onclick="downloadSelectedFiles()" style="flex: 1;">
          <i class="fas fa-download"></i> Download Selected
        </button>
        <button class="btn" onclick="downloadExtractedZip()" style="flex: 1;">
          <i class="fas fa-download"></i> Download All
        </button>
      </div>
    </div>
  `;
  fileListDiv.style.display = "block";
}

function toggleAllFiles(checked) {
  document.querySelectorAll(".file-checkbox").forEach(cb => {
    cb.checked = checked;
  });
}

async function downloadSelectedFiles() {
  if (!extractedZipData || !extractedFilesData) return;
  
  const selectedIndices = Array.from(document.querySelectorAll(".file-checkbox:checked"))
    .map(cb => parseInt(cb.dataset.index));
  
  if (selectedIndices.length === 0) {
    showError("extract-error", "Please select at least one file to download.");
    return;
  }
  
  try {
    // Decode the original ZIP
    const binaryString = atob(extractedZipData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load ZIP using JSZip
    const zip = await JSZip.loadAsync(bytes);
    const newZip = new JSZip();
    
    // Add only selected files
    let addedCount = 0;
    for (const index of selectedIndices) {
      const file = extractedFilesData[index];
      if (file && zip.file(file.name)) {
        const fileData = await zip.file(file.name).async("uint8array");
        newZip.file(file.name, fileData);
        addedCount++;
      }
    }
    
    if (addedCount === 0) {
      showError("extract-error", "No files could be added to the archive.");
      return;
    }
    
    // Generate and download the new ZIP
    const blob = await newZip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_files.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    showError("extract-error", "Failed to create archive: " + error.message);
  }
}

async function downloadSingleFile(index) {
  if (!extractedZipData || !extractedFilesData || !extractedFilesData[index]) return;
  
  const file = extractedFilesData[index];
  
  try {
    // Decode the original ZIP
    const binaryString = atob(extractedZipData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load ZIP using JSZip
    const zip = await JSZip.loadAsync(bytes);
    
    if (!zip.file(file.name)) {
      showError("extract-error", "File not found in archive.");
      return;
    }
    
    // Get file data and download
    const fileData = await zip.file(file.name).async("blob");
    const url = window.URL.createObjectURL(fileData);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.split("/").pop(); // Get filename from path
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    showError("extract-error", "Failed to download file: " + error.message);
  }
}

function downloadExtractedZip() {
  if (!extractedZipData) return;
  
  const binaryString = atob(extractedZipData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = extractedZipFilename || "extracted.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function showError(errorId, message) {
  const errorDiv = document.getElementById(errorId);
  errorDiv.textContent = message;
  errorDiv.classList.add("active");
}

