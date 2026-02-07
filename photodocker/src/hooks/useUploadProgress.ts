import { useState } from 'react';

interface UploadProgress {
  progress: number;
  uploading: boolean;
  error: string | null;
}

export const useUploadProgress = () => {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    uploading: false,
    error: null,
  });

  const uploadFile = async (
    file: File,
    endpoint: string
    ): Promise<{ filename: string } | null> => {
    setUploadState({ progress: 0, uploading: true, error: null });

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadState({
            progress: percentComplete,
            uploading: true,
            error: null,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadState({
            progress: 100,
            uploading: false,
            error: null,
          });
          resolve(response);
        } else {
          setUploadState({
            progress: 0,
            uploading: false,
            error: 'Upload failed',
          });
          resolve(null);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadState({
          progress: 0,
          uploading: false,
          error: 'Upload failed',
        });
        resolve(null);
      });

      const formData = new FormData();
      formData.append(
        endpoint.includes('/upload-video') ? 'video' : 'photo',
        file
      );

      xhr.open('POST', endpoint, true);
      xhr.send(formData);
    });
  };

  return {
    ...uploadState,
    uploadFile,
  };
};
