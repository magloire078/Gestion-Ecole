import { getAuth } from 'firebase/auth';

export interface UploadOptions {
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'raw' | 'auto';
  onProgress?: (percent: number) => void;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
}

/**
 * Upload a file to Cloudinary using a server-signed signature.
 *
 *   1. POST /api/cloudinary/sign with the requested folder — the route
 *      verifies the caller's Firebase auth token and returns a signed
 *      timestamp+signature valid for one upload.
 *   2. POST the file directly to Cloudinary with the returned signature.
 *
 * The API secret never touches the browser.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options: UploadOptions,
): Promise<UploadResult> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  const idToken = await user.getIdToken();

  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      folder: options.folder,
      publicId: options.publicId,
      resourceType: options.resourceType ?? 'auto',
    }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Échec d'obtention de la signature Cloudinary");
  }
  const { cloudName, apiKey, timestamp, signature, folder, publicId, resourceType } =
    await signRes.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  if (publicId) formData.append('public_id', publicId);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          options.onProgress?.((e.loaded / e.total) * 100);
        }
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.url,
          secureUrl: data.secure_url,
          publicId: data.public_id,
          resourceType: data.resource_type,
          bytes: data.bytes,
          format: data.format,
        });
      } else {
        let msg = `Upload Cloudinary échoué (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err.error?.message ?? msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l\'upload'));
    xhr.send(formData);
  });
}
