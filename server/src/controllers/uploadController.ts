import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Check if Cloudinary is fully configured with real keys
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
  !process.env.CLOUDINARY_CLOUD_NAME.startsWith('mock') &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
  !process.env.CLOUDINARY_API_KEY.startsWith('mock') &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret' &&
  !process.env.CLOUDINARY_API_SECRET.startsWith('mock');

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    // Determine standard attachment type
    let type: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType.startsWith('video/')) {
      type = 'video';
    } else if (mimeType.startsWith('audio/')) {
      type = 'audio';
    }

    if (isCloudinaryConfigured) {
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      if (type === 'image') resourceType = 'image';
      else if (type === 'video' || type === 'audio') resourceType = 'video';

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        folder: 'nexuschat',
      });

      // Cleanup local temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(200).json({
        url: result.secure_url,
        type,
        name: originalName,
      });
    } else {
      // Local serving fallback
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

      res.status(200).json({
        url: fileUrl,
        type,
        name: originalName,
      });
    }
  } catch (error) {
    console.error('File upload controller error:', error);
    res.status(500).json({
      message: 'Upload failed',
      error: error instanceof Error ? error.message : error,
    });
  }
};
