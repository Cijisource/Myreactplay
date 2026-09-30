import { isAzureConfigured } from './azureService';

// List of photo and proof URL fields shared by the Tenant record shape
export const TENANT_IMAGE_FIELDS = [
  'photoUrl', 'photo2Url', 'photo3Url', 'photo4Url', 'photo5Url',
  'photo6Url', 'photo7Url', 'photo8Url', 'photo9Url', 'photo10Url',
  'proof1Url', 'proof2Url', 'proof3Url', 'proof4Url', 'proof5Url',
  'proof6Url', 'proof7Url', 'proof8Url', 'proof9Url', 'proof10Url'
];

// **HELPER FUNCTION: Transform blob names to Azure URLs**
// Converts stored blob names to full Azure URLs or local fallback paths
export const transformPhotoUrlsForResponse = (data: any): any => {
  const azureConfigured = isAzureConfigured();
  const azureBlobUrl = process.env.AZURE_BLOB_URL || 'https://complexstore.blob.core.windows.net/proofs';

  for (const field of TENANT_IMAGE_FIELDS) {
    if (data[field]) {
      const blobName = data[field];

      // If already a full URL, keep as-is
      if (blobName.startsWith('http://') || blobName.startsWith('https://')) {
        continue;
      }

      // If Azure is configured, construct Azure URL
      if (azureConfigured) {
        data[field] = `${azureBlobUrl}/${blobName}`;
      } else {
        // Fallback to local path
        data[field] = `/api/tenantphotos/${blobName}`;
      }
    }
  }

  return data;
};

// Helper to transform array of records
export const transformPhotoUrlsInArray = (records: any[]): any[] => {
  return records.map(record => transformPhotoUrlsForResponse({ ...record }));
};
