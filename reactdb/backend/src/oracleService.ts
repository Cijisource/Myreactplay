import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

interface OracleConfig {
  namespace?: string;
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

const getOracleConfig = (): OracleConfig => ({
  namespace: process.env.ORACLE_OBJECT_STORAGE_NAMESPACE,
  bucket: process.env.ORACLE_OBJECT_STORAGE_BUCKET || 'miscellaneous',
  region: process.env.ORACLE_OBJECT_STORAGE_REGION || 'us-ashburn-1',
  accessKeyId: process.env.ORACLE_OBJECT_STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.ORACLE_OBJECT_STORAGE_SECRET_KEY,
  endpoint: process.env.ORACLE_OBJECT_STORAGE_ENDPOINT,
});

const hasMalformedOracleAccessKey = (value?: string): boolean => {
  if (!value) {
    return true;
  }

  return value.includes('/') || value.includes('=') || /\s/.test(value);
};

let oracleS3Client: S3Client | null = null;
let oracleConfig: OracleConfig | null = null;

export const initializeOracleClient = (): void => {
  const config = getOracleConfig();
  oracleConfig = config;

  if (!config.accessKeyId || !config.secretAccessKey || !config.namespace || !config.endpoint) {
    oracleS3Client = null;
    console.warn('Oracle Object Storage is not configured. Uploads to Oracle will be disabled.');
    return;
  }

  if (hasMalformedOracleAccessKey(config.accessKeyId)) {
    oracleS3Client = null;
    console.error('Oracle Object Storage access key is malformed. Use the OCI-generated access key from your Oracle Object Storage user credentials.');
    return;
  }

  oracleS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
};

export const isOracleConfigured = (): boolean => {
  return !!oracleS3Client && !!oracleConfig?.bucket;
};

export const uploadToOracleObjectStorage = async (
  blobName: string,
  fileBuffer: Buffer,
  contentType?: string,
  metadata?: Record<string, string>
): Promise<string> => {
  const config = getOracleConfig();
  oracleConfig = config;

  if (!oracleS3Client) {
    throw new Error('Oracle Object Storage client is not initialized. Check the Oracle environment variables.');
  }

  const objectKey = blobName;
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    Body: fileBuffer,
    ContentType: contentType || 'application/octet-stream',
    Metadata: metadata,
  });

  await oracleS3Client.send(command);

  const getObjectCommand = new GetObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
  });

  return getSignedUrl(oracleS3Client, getObjectCommand, { expiresIn: 3600 });
};

export interface OracleBlobListItem {
  name: string;
  url: string;
  contentType: string;
  size: number;
  lastModified?: Date;
  createdOn?: Date;
  metadata?: Record<string, string>;
}

export const deleteOracleBlob = async (blobName: string): Promise<void> => {
  const config = getOracleConfig();
  oracleConfig = config;

  if (!oracleS3Client) {
    throw new Error('Oracle Object Storage client is not initialized. Check the Oracle environment variables.');
  }

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: blobName,
  });

  await oracleS3Client.send(command);
};

export const listOracleBlobsFromBucket = async (): Promise<OracleBlobListItem[]> => {
  const config = getOracleConfig();
  oracleConfig = config;

  if (!oracleS3Client) {
    throw new Error('Oracle Object Storage client is not initialized. Check the Oracle environment variables.');
  }

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
  });

  const response = await oracleS3Client.send(command);
  const items: OracleBlobListItem[] = [];

  for (const item of response.Contents || []) {
    const key = item.Key;

    if (!key) {
      continue;
    }

    const headCommand = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const headResponse = await oracleS3Client.send(headCommand);
    const getObjectCommand = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const url = await getSignedUrl(oracleS3Client, getObjectCommand, { expiresIn: 3600 });

    items.push({
      name: key,
      url,
      contentType: headResponse.ContentType || 'application/octet-stream',
      size: headResponse.ContentLength || item.Size || 0,
      lastModified: headResponse.LastModified || item.LastModified,
      createdOn: headResponse.LastModified || item.LastModified,
      metadata: headResponse.Metadata as Record<string, string> | undefined,
    });
  }

  return items.sort((first, second) => {
    const firstTime = first.lastModified?.getTime() || first.createdOn?.getTime() || 0;
    const secondTime = second.lastModified?.getTime() || second.createdOn?.getTime() || 0;
    return secondTime - firstTime;
  });
};
