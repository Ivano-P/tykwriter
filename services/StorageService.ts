import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Stockage d'images sur Cloudflare R2 (API S3).
 * Clés au format `notes/{userId}/{noteId}/{uuid}.{ext}` — permet la purge
 * par note (suppression de note) ou par utilisateur (suppression de compte).
 */
export class StorageService {
  private static client: S3Client | null = null;

  private static getClient(): S3Client {
    if (!this.client) {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('R2_NOT_CONFIGURED');
      }
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.client;
  }

  private static bucket(): string {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_NOT_CONFIGURED');
    return bucket;
  }

  static publicUrl(key: string): string {
    const base = process.env.R2_PUBLIC_URL;
    if (!base) throw new Error('R2_NOT_CONFIGURED');
    return `${base.replace(/\/$/, '')}/${key}`;
  }

  /** URL présignée PUT (5 min) pour un upload direct navigateur → R2. */
  static async createUploadUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket(),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.getClient(), command, { expiresIn: 300 });
  }

  /** Supprime tous les objets sous un préfixe (purge note ou utilisateur). */
  static async deleteByPrefix(prefix: string): Promise<void> {
    const client = this.getClient();
    const bucket = this.bucket();

    let continuationToken: string | undefined;
    do {
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k));
      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
      }
      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}
