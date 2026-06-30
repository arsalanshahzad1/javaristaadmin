import { useState } from 'react';
import { adminAuthStorage } from '../api/adminAuthStorage';

export type UploadEndpoint =
  | '/upload/recipe-photo'
  | '/upload/playbook-media'
  | '/upload/checklist-photo'
  | '/upload/badge'
  | '/upload/avatar';

interface UseFileUploadOptions {
  endpoint: UploadEndpoint;
  onSuccess?: (url: string, publicId: string) => void;
  onError?: (error: string) => void;
}

const FIELD_NAMES: Record<UploadEndpoint, string> = {
  '/upload/recipe-photo': 'photo',
  '/upload/playbook-media': 'file',
  '/upload/checklist-photo': 'photo',
  '/upload/badge': 'badge',
  '/upload/avatar': 'avatar',
};

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5001/api';

export function useFileUpload({ endpoint, onSuccess, onError }: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = (file: File): Promise<{ url: string; publicId: string } | null> => {
    return new Promise((resolve) => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append(FIELD_NAMES[endpoint], file);

      const xhr = new XMLHttpRequest();
      const token = adminAuthStorage.getAccessToken();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        setIsUploading(false);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as {
              data: { url: string; publicId: string };
            };
            const { url, publicId } = result.data;
            setProgress(100);
            onSuccess?.(url, publicId);
            resolve({ url, publicId });
          } catch {
            const msg = 'Invalid response from server';
            setError(msg);
            onError?.(msg);
            resolve(null);
          }
        } else {
          try {
            const result = JSON.parse(xhr.responseText) as { message?: string };
            const msg = result.message ?? 'Upload failed';
            setError(msg);
            onError?.(msg);
          } catch {
            setError('Upload failed');
            onError?.('Upload failed');
          }
          resolve(null);
        }
      });

      xhr.addEventListener('error', () => {
        setIsUploading(false);
        const msg = 'Network error during upload';
        setError(msg);
        onError?.(msg);
        resolve(null);
      });

      xhr.open('POST', `${BASE_URL}${endpoint}`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  };

  return { upload, isUploading, error, progress };
}
