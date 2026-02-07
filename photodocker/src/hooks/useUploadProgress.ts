import { useState } from 'react';

interface UploadProgress {
  progress: number;
  uploading: boolean;
  error: string | null;
}

interface UploadResultSuccess {
  success: true;
  filename: string;
}

interface UploadResultError {
  success: false;
  error: string;
}

type UploadResult = UploadResultSuccess | UploadResultError;

export const useUploadProgress = () => {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    uploading: false,
    error: null,
  });

  const uploadFile = async (
    file: File,
    endpoint: string
  ): Promise<UploadResult> => {
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
          try {
            const response = JSON.parse(xhr.responseText);
            setUploadState({
              progress: 100,
              uploading: false,
              error: null,
            });
            resolve({
              success: true,
              filename: response.filename,
            });
          } catch (e) {
            setUploadState({
              progress: 0,
              uploading: false,
              error: 'Failed to parse response',
            });
            resolve({
              success: false,
              error: 'Failed to parse response',
            });
          }
        } else {
          const errorMsg = 'Upload failed';
          setUploadState({
            progress: 0,
            uploading: false,
            error: errorMsg,
          });
          resolve({
            success: false,
            error: errorMsg,
          });
        }
      });

      xhr.addEventListener('error', () => {
        const errorMsg = 'Upload failed';
        setUploadState({
          progress: 0,
          uploading: false,
          error: errorMsg,
        });
        resolve({
          success: false,
          error: errorMsg,
        });
      });

      xhr.addEventListener('abort', () => {
        const errorMsg = 'Upload cancelled';
        setUploadState({
          progress: 0,
          uploading: false,
          error: errorMsg,
        });
        resolve({
          success: false,
          error: errorMsg,
        });
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
