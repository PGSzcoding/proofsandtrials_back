import { randomUUID } from "node:crypto";
import path from "node:path";
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "./config.js";

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function buildObjectKey(filename) {
  const safeName = path.basename(filename).replace(/[^\w.\-]+/g, "_");
  return `uploads/${randomUUID()}-${safeName}`;
}

export async function createUploadUrl({ filename, contentType }) {
  if (!filename) {
    throw new Error("filename es requerido");
  }

  const key = buildObjectKey(filename);
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.s3.uploadUrlExpiresIn,
  });

  return {
    key,
    uploadUrl,
    expiresIn: config.s3.uploadUrlExpiresIn,
    method: "PUT",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  };
}

export async function createDownloadUrl(key) {
  if (!key) {
    throw new Error("key es requerido");
  }
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.s3.downloadUrlExpiresIn,
  });
  return {
    key,
    downloadUrl,
    expiresIn: config.s3.downloadUrlExpiresIn,
    method: "GET",
  };
}
  export async function deleteFile(key){
  const command = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: key
  });
   await s3Client.send(command);
  }
export async function listFiles({ prefix, maxKeys, continuationToken } = {}) {
  const command = new ListObjectsV2Command({
    Bucket: config.s3.bucket,
    Prefix: prefix || "uploads/",
    MaxKeys: maxKeys ? Number(maxKeys) : 100,
    ContinuationToken: continuationToken || undefined,
  });

  const response = await s3Client.send(command);

  return {
    bucket: config.s3.bucket,
    prefix: prefix || "uploads/",
    count: response.KeyCount ?? 0,
    isTruncated: response.IsTruncated ?? false,
    nextContinuationToken: response.NextContinuationToken ?? null,
    files: (response.Contents ?? []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
    })),
  };
}
