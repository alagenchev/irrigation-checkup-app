/**
 * Cloudflare R2 client (S3-compatible).
 *
 * Required env vars — add to .env.local:
 *   CLOUDFLARE_ACCOUNT_ID   Your Cloudflare account ID
 *                           → dash.cloudflare.com → right sidebar "Account ID"
 *   R2_ACCESS_KEY_ID        R2 API token Access Key ID
 *                           → Cloudflare Dashboard → R2 → Manage R2 API Tokens
 *                             → Create API Token → Object Read & Write
 *   R2_SECRET_ACCESS_KEY    R2 API token Secret Access Key (shown once on creation)
 *   R2_BUCKET_NAME          Name of the top-level R2 bucket you created for this app
 *   R2_PUBLIC_URL           (optional) Custom domain / public URL for the bucket
 *                           e.g. https://files.yourdomain.com  — omit trailing slash
 *                           Set this only if the bucket has public access enabled.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

function buildClient(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 env vars. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.local.',
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME env var.')
  return bucket
}

/**
 * Builds the object key for a file: `{companyBucketId}/{path}`
 * e.g. "acme-irrigation/zones/3/1712345678901_photo.jpg"
 */
export function buildR2Key(companyBucketId: string, path: string): string {
  return `${companyBucketId}/${path}`
}

/**
 * Returns a public URL for a key if R2_PUBLIC_URL is configured, otherwise null.
 * Use null to indicate the file is private / not directly accessible.
 */
export function r2PublicUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL
  return base ? `${base}/${key}` : null
}

/**
 * Uploads a file buffer to R2 and returns the object key.
 * Throws on network or auth errors — callers should catch.
 */
export async function uploadToR2(
  companyBucketId: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const client = buildClient()
  const key = buildR2Key(companyBucketId, path)
  await client.send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key:    key,
    Body:   body,
    ContentType: contentType,
  }))
  return key
}

/**
 * Deletes an object from R2 by its full key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = buildClient()
  await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }))
}
