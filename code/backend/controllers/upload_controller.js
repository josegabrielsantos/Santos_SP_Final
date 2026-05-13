import { uploadToSpaces, deleteFromSpaces, keyFromUrl } from '../lib/spaces.js';

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
    const allowedFolders = ['avatars', 'papers', 'org_banners', 'org_avatars', 'posts', 'uploads', 'temp'];
    const safeFolder = allowedFolders.includes(folder) ? folder : 'uploads';

    const { url, key, size } = await uploadToSpaces(
      req.file.buffer,
      req.file.originalname,
      safeFolder,
      req.file.mimetype
    );

    res.status(200).json({ url, key, size });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    res.status(500).json({ error: 'File upload failed.', detail: error.message });
  }
};

/**
 * DELETE /api/upload
 * Delete an uploaded temp file by URL.
 * Body: { url: string }
 */
export const deleteUploadedFile = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'url is required.' });
    }

    const key = keyFromUrl(url);
    if (!key) {
      return res.status(400).json({ error: 'Invalid file url.' });
    }

    // Safety guard: this endpoint only deletes temp files.
    if (!key.startsWith('temp/')) {
      return res.status(403).json({ error: 'Only temp files can be deleted from this endpoint.' });
    }

    await deleteFromSpaces(key);
    return res.status(200).json({ message: 'Temp file deleted.' });
  } catch (error) {
    console.error('Error in deleteUploadedFile:', error);
    return res.status(500).json({ error: 'File delete failed.', detail: error.message });
  }
};
