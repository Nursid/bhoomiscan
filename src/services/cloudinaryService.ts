import { cloudinaryConfig } from './kycConfig';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}

/**
 * Uploads a local document (PDF or image) to Cloudinary via unsigned REST API.
 * @param fileUri Local URI of the file (e.g. file://... or cache path)
 * @param fileName Name of the file (e.g. land_deed.pdf)
 * @param fileType MIME type (e.g. application/pdf, image/jpeg)
 * @returns Cloudinary secure_url string
 */
export async function uploadToCloudinary(
  fileUri: string,
  fileName: string = 'document.pdf',
  fileType: string = 'application/pdf'
): Promise<string> {
  const cloudName = cloudinaryConfig.cloudName;
  const uploadPreset = cloudinaryConfig.uploadPreset;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET) are missing.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
  } as any);
  formData.append('upload_preset', uploadPreset);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || `Cloudinary upload failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  if (!data.secure_url && !data.url) {
    throw new Error('Cloudinary response did not return a valid file URL.');
  }

  return data.secure_url || data.url;
}
