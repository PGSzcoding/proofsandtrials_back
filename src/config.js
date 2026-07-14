import dotenv from "dotenv";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  aws: {
    region: requireEnv("AWS_REGION"),
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
  s3: {
    bucket: requireEnv("S3_BUCKET"),
    uploadUrlExpiresIn: Number(process.env.UPLOAD_URL_EXPIRES_IN || 900),
    downloadUrlExpiresIn: Number(process.env.DOWNLOAD_URL_EXPIRES_IN || 3600),
  },
};
