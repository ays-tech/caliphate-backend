import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private accountId: string;

  constructor() {
    this.bucket    = process.env.R2_BUCKET_NAME    || 'makhtaba-files';
    this.publicUrl = (process.env.R2_PUBLIC_URL    || '').replace(/\/$/, ''); // strip trailing slash
    this.accountId = process.env.R2_ACCOUNT_ID     || '';

    this.client = new S3Client({
      region:   'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  // ── Sanitise filename so R2 keys never have spaces / special chars ──
  private sanitiseFilename(original: string): string {
    const ext  = original.split('.').pop()?.toLowerCase() || 'bin';
    // Only keep alphanumeric + dash + dot
    const safe = original
      .replace(/\.[^.]+$/, '')          // strip extension
      .replace(/[^a-zA-Z0-9-_]/g, '-') // replace bad chars
      .replace(/-+/g, '-')              // collapse multiple dashes
      .slice(0, 60);                    // cap length
    return `${safe}.${ext}`;
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException('File buffer is empty');
    }

    const safeName = this.sanitiseFilename(file.originalname);
    const key      = `${folder}/${uuidv4()}-${safeName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        file.buffer,
        ContentType: file.mimetype,
        // Cache images aggressively at CDN level
        CacheControl: folder === 'volumes' ? 'private' : 'public, max-age=31536000',
      }),
    );

    // Always return a full URL:
    // 1. If R2_PUBLIC_URL is configured → use it (fastest, no expiry)
    // 2. Otherwise → generate a signed URL (works without public bucket)
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }

    // Fallback: generate a long-lived signed URL (7 days)
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 604800 });
  }

  async getSignedUrl(fileUrlOrKey: string, expiresIn = 3600): Promise<string> {
    // Already a full URL (public bucket) → return as-is
    if (fileUrlOrKey.startsWith('http')) return fileUrlOrKey;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key:    fileUrlOrKey,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    // Strip public URL prefix to get bare key
    if (this.publicUrl && key.startsWith(this.publicUrl)) {
      key = key.slice(this.publicUrl.length + 1);
    }
    // Strip full R2 endpoint URLs
    if (key.startsWith('https://')) {
      const url  = new URL(key);
      key = url.pathname.slice(1); // remove leading /
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // Non-fatal — log but don't throw
      console.warn(`[Storage] Could not delete key: ${key}`);
    }
  }
}
