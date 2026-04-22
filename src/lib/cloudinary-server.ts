import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface SignedUploadParams {
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'raw' | 'auto';
}

/**
 * Return a Cloudinary signature so the browser can upload directly to
 * Cloudinary without exposing the API secret. See:
 *   https://cloudinary.com/documentation/upload_images#signed_upload
 */
export function signUpload(params: SignedUploadParams) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: params.folder,
  };
  if (params.publicId) paramsToSign.public_id = params.publicId;

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: params.folder,
    publicId: params.publicId,
    resourceType: params.resourceType ?? 'auto',
  };
}

export { cloudinary };
