let compressFilesList = [];
let extractFile = null;

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

  list.innerHTML = compressFilesList
    .map(
      (file, index) => `
                <div class="file-item">
                    <span>${file.name} (${formatFileSize(file.size)})</span>
                    <button class="remove" onclick="removeCompressFile(${index})">Remove</button>
                </div>
            `
    )
    .join("");
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

    // Download the extracted files
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

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

function showError(errorId, message) {
  const errorDiv = document.getElementById(errorId);
  errorDiv.textContent = message;
  errorDiv.classList.add("active");
}

