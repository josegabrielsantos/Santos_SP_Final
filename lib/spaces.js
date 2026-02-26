import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
  forcePathStyle: false, // Spaces uses virtual-hosted-style URLs
});

const BUCKET = process.env.DO_SPACES_BUCKET;
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || process.env.DO_SPACES_ENDPOINT;

/**
 * Upload a file buffer to DigitalOcean Spaces.
 *
 * @param {Buffer}  buffer      - File data
 * @param {string}  originalName - Original file name (e.g. "photo.png")
 * @param {string}  folder      - Destination folder inside the bucket (e.g. "avatars", "papers")
 * @param {string}  mimetype    - MIME type (e.g. "image/png", "application/pdf")
 * @returns {Promise<{ url: string, key: string, size: number }>}
 */
export async function uploadToSpaces(buffer, originalName, folder, mimetype) {
  const ext = path.extname(originalName) || '';
  const key = `${folder}/${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
    })
  );

  // Build the public URL (use CDN if available)
  const url = `${CDN_ENDPOINT}/${key}`;

  return { url, key, size: buffer.length };
}

/**
 * Delete a file from DigitalOcean Spaces by its key.
 *
 * @param {string} key - The object key (e.g. "avatars/abc-123.png")
 */
export async function deleteFromSpaces(key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/**
 * Extract the object key from a Spaces URL.
 * e.g. "https://uplb-kain-storage.sgp1.cdn.digitaloceanspaces.com/avatars/abc.png"
 *   → "avatars/abc.png"
 */
export function keyFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Remove leading slash
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

export default s3;
