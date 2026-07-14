import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corsRules = JSON.parse(readFileSync(path.join(__dirname, "../aws/s3-cors.json"), "utf8"));

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: process.env.S3_BUCKET,
    CORSConfiguration: { CORSRules: corsRules },
  })
);

console.log(`CORS aplicado al bucket: ${process.env.S3_BUCKET}`);
