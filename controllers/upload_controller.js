import { uploadToSpaces } from '../lib/spaces.js';

/**
 * POST /api/upload
 * Generic file upload endpoint.
 * Expects multipart/form-data with field "file" and optional "folder" field.
 * Returns { url, key, size }.
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const folder = req.body.folder || 'uploads';

    // Allowed folders to prevent arbitrary paths
    const allowedFolders = ['avatars', 'papers', 'org_banners', 'org_avatars', 'posts', 'uploads'];
    const safeFolder = allowedFolders.includes(folder) ? folder : 'uploads';

    const { url, key, size } = await uploadToSpaces(
      req.file.buffer,
      req.file.originalname,
      safeFolder,
      req.file.mimetype
    );

    res.status(200).json({ url, key, size });
  } catch (error) {
    console.log('Error in uploadFile:', error.message);
    res.status(500).json({ error: 'File upload failed.' });
  }
};
