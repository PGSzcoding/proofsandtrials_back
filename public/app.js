const fileInput = document.getElementById("fileInput");
const fileNameEl = document.getElementById("fileName");
const uploadBtn = document.getElementById("uploadBtn");
const listBtn = document.getElementById("listBtn");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("status");

let selectedFile = null;

function setStatus(text, type = "idle") {
  statusEl.textContent = text;
  statusEl.dataset.type = type;
}

function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.className = `message message-${type}`;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Date(value).toLocaleString("es-MX");
}

function displayName(key) {
  const base = key.split("/").pop() || key;
  const parts = base.split("-");
  if (parts.length > 5) {
    return parts.slice(5).join("-");
  }
  return base;
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }

  return data;
}

router.get("/search", async (req, res) => {
  try {
    const clave = req.query.clave;

    if (typeof clave !== "string" || !clave.trim()) {
      return res.status(400).json({
        message: "La clave es obligatoria",
      });
    }

    const certificate = await getMetadataByClave(clave);

    if (!certificate) {
      return res.status(404).json({
        message: "No se encontró un certificado con esa clave",
      });
    }

    return res.status(200).json({
      certificate,
    });
  } catch (error) {
    console.error("Error buscando certificado:", error);

    return res.status(500).json({
      message: "No se pudo buscar el certificado",
    });
  }
});

function renderFiles(files) {
  fileList.innerHTML = "";
  fileCount.textContent = String(files.length);

  if (files.length === 0) {
    fileList.innerHTML = `<li class="empty">No hay archivos en uploads/</li>`;
    return;
  }

  for (const file of files) {
    const li = document.createElement("li");
    li.className = "file-item";
    li.innerHTML = `
      <div class="file-info">
        <strong>${displayName(file.key)}</strong>
        <span class="meta">${formatSize(file.size)} · ${formatDate(file.lastModified)}</span>
        <code class="key">${file.key}</code>
      </div>
      <button class="btn btn-small" data-key="${file.key}">Descargar</button>
    `;

    li.querySelector("button").addEventListener("click", () => downloadFile(file.key));
    fileList.appendChild(li);
  }
}

async function listFiles() {
  hideMessage();
  setStatus("Listando...", "loading");
  listBtn.disabled = true;

  try {
    const data = await api("/api/files");
    renderFiles(data.files || []);
    setStatus("Listo", "success");
  } catch (error) {
    showMessage(error.message, "error");
    setStatus("Error", "error");
  } finally {
    listBtn.disabled = false;
  }
}

async function uploadFile() {
  if (!selectedFile) return;

  hideMessage();
  setStatus("Subiendo...", "loading");
  uploadBtn.disabled = true;
  listBtn.disabled = true;

  try {
    const contentType = selectedFile.type || "application/octet-stream";
    const { uploadUrl, headers } = await api("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: selectedFile.name,
        contentType,
      }),
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": headers?.["Content-Type"] || contentType,
      },
      body: selectedFile,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error al subir a S3 (${uploadResponse.status})`);
    }

    showMessage(`"${selectedFile.name}" subido correctamente.`, "success");
    setStatus("Listo", "success");
    selectedFile = null;
    fileInput.value = "";
    fileNameEl.textContent = "Ningún archivo seleccionado";
    uploadBtn.disabled = true;
    await listFiles();
  } catch (error) {
    showMessage(error.message, "error");
    setStatus("Error", "error");
  } finally {
    uploadBtn.disabled = !selectedFile;
    listBtn.disabled = false;
  }
}

async function downloadFile(key) {
  hideMessage();
  setStatus("Descargando...", "loading");
  try {
    const { downloadUrl } = await api("/api/download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Error al descargar (${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = displayName(key);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);

    setStatus("Listo", "success");
  } catch (error) {
    showMessage(error.message, "error");
    setStatus("Error", "error");
  }
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;
  fileNameEl.textContent = selectedFile ? selectedFile.name : "Ningún archivo seleccionado";
  uploadBtn.disabled = !selectedFile;
});

uploadBtn.addEventListener("click", uploadFile);
listBtn.addEventListener("click", listFiles);

listFiles();
