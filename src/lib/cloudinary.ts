// Cloudinary configuration for file uploads
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/**
 * Upload a file to Cloudinary
 * @param file - The file to upload (as base64 string or buffer)
 * @param folder - The folder to store the file in (e.g., 'chauffeurs/permis', 'vehicules/documents')
 * @param resourceType - 'image', 'raw', or 'auto'
 * @returns UploadResult with url and publicId
 */
export async function uploadToCloudinary(
  file: string | Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto'
): Promise<UploadResult> {
  try {
    const uploadOptions = {
      folder: `mgk-transport/${folder}`,
      resource_type: resourceType,
      max_file_size: 5 * 1024 * 1024, // 5MB max
    };

    let result: UploadApiResponse | undefined;

    if (typeof file === 'string') {
      // Base64 string
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else {
      // Buffer - convert to base64
      const base64String = `data:application/octet-stream;base64,${file.toString('base64')}`;
      result = await cloudinary.uploader.upload(base64String, uploadOptions);
    }

    if (!result) {
      return { success: false, error: 'Upload failed - no result returned' };
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload a file from FormData (File object)
 * @param file - The File object from FormData
 * @param folder - The folder to store the file in
 * @returns UploadResult with url and publicId
 */
export async function uploadFileToCloudinary(
  file: File,
  folder: string
): Promise<UploadResult> {
  try {
    // Convert File to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Determine resource type based on file type
    let resourceType: 'image' | 'raw' | 'auto' = 'auto';
    if (file.type.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.type === 'application/pdf') {
      resourceType = 'raw'; // PDFs should be uploaded as 'raw'
    }

    // Create base64 string with proper data URI
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    return await uploadToCloudinary(base64String, folder, resourceType);
  } catch (error) {
    console.error('File upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @param resourceType - 'image', 'raw', or 'video'
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - The Cloudinary URL
 * @returns The public ID or null
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/v\d+\/(.+?)(?:\.\w+)?$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
}

export { cloudinary };
