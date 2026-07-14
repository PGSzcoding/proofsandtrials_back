import express from "express";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { createDownloadUrl, createUploadUrl, listFiles,deleteFile } from "./s3.js";
import { deleteFileMetadata, getFileMetadataById, saveFileMetadata,getMetadataByClave } from "./dynamodb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
dotenv.config();

app.use(express.json());
app.use(cors())
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const isValidEmail = email === process.env.ADMIN_EMAIL;
  const isValidPassword = password === process.env.ADMIN_PASSWORD;

  if (!isValidEmail || !isValidPassword) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const token = jwt.sign(
    { email, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );
   

  res.json({
    message: "Login correcto",
    token,
    email
  });
});

app.post("/api/upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    const result = await createUploadUrl({ filename, contentType });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/download-url", async (req, res) => {
  try {
    const { key } = req.body;
    const result = await createDownloadUrl(key);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const { prefix, maxKeys, continuationToken } = req.query;
    const result = await listFiles({ prefix, maxKeys, continuationToken });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/files/*", async (req, res) => {
    try {
    const  id  = req.params[0];
    // Buscar metadata
    const metadata = await getFileMetadataById(id);
    if (!metadata) {
      return res.status(404).json({
        error: "Archivo no encontrado",
      });
    }

    // Eliminar archivo de S3
    await deleteFile(metadata.key);

    // Eliminar metadata
    await deleteFileMetadata(id);

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error eliminando archivo",
    });
  }
});

app.get("/api/search", async (req, res) => {
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
      certificates:certificate
    });
  } catch (error) {
    console.error("Error buscando certificado:", error);

    return res.status(500).json({
      message: "No se pudo buscar el certificado",
    });
  }
});

app.post("/api/files", async (req, res) => {
  try {
    const { key, tipo , clave } = req.body;

    await saveFileMetadata({ key, tipo , clave });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error guardando metadata" });
  }
});

app.post("/api/certificate", async (req, res) => {
  try {
    const { id } = req.body;

    const certificate = await getFileMetadataById(id);

    if (!certificate) {
      return res.status(404).json({ error: "Certificado no encontrado" });
    }

    const { downloadUrl } = await createDownloadUrl(certificate.key);

    res.json({
      certificate,
      downloadUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando certificado" });
  }
});

app.post("/api/certificate-download-url", async (req, res) => {
  try {
    const { id } = req.body;

    const certificate = await getFileMetadataById(id);

    if (!certificate) {
      return res.status(404).json({ error: "Certificado no encontrado" });
    }

    const result = await createDownloadUrl(certificate.key);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});




app.listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
  console.log(`UI disponible en http://localhost:${config.port}`);
});
