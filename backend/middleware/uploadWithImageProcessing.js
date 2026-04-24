import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const mediaDir = path.join(uploadDir, 'media');
const facesDir = path.join(uploadDir, 'faces');
const avatarsDir = path.join(uploadDir, 'avatars');
const thumbnailsDir = path.join(uploadDir, 'thumbnails');

[uploadDir, mediaDir, facesDir, avatarsDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for media files
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mediaDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for face images
const faceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, facesDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `face_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for avatars (users and departments)
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `avatar_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
    'audio/mp3', 'audio/wav', 'audio/mpeg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Multer configurations
export const uploadMedia = multer({
  storage: mediaStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

export const uploadFace = multer({
  storage: faceStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for face images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for face capture'), false);
    }
  }
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB for avatars
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars'), false);
    }
  }
});

// Middleware to process images with Sharp after upload
export const processImageThumbnails = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const filePath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const isImage = req.file.mimetype.startsWith('image/');

    if (!isImage) {
      logger.debug('Skipping image processing for non-image file', { filename });
      return next();
    }

    // Store original image info
    const originalSize = req.file.size;

    try {
      // Generate thumbnails
      const thumbnailSizes = [
        { size: 320, name: 'small' },
        { size: 640, name: 'medium' },
        { size: 1280, name: 'large' }
      ];

      const thumbnailPaths = {};

      for (const thumb of thumbnailSizes) {
        const thumbnailPath = path.join(thumbnailsDir, `${filename}_${thumb.name}.webp`);

        await sharp(filePath)
          .resize(thumb.size, thumb.size, {
            fit: 'cover',
            position: 'center',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);

        thumbnailPaths[`thumbnail_${thumb.name}`] = path.relative(uploadDir, thumbnailPath).replace(/\\/g, '/');
        logger.debug(`Created ${thumb.name} thumbnail`, { filename, size: thumb.size });
      }

      // Create WebP version of original
      const webpPath = path.join(mediaDir, `${filename}.webp`);
      const stats = await sharp(filePath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      // Remove EXIF data for privacy
      await sharp(filePath)
        .withMetadata(false)
        .toFile(`${filePath}.tmp`);

      await fs.promises.rename(`${filePath}.tmp`, filePath);

      // Attach processed image info to request
      req.processedImage = {
        original: req.file.filename,
        originalSize,
        webp: `${filename}.webp`,
        webpSize: stats.size,
        thumbnails: thumbnailPaths,
        quality: {
          original: originalSize,
          compressed: stats.size,
          reduction: `${Math.round((1 - stats.size / originalSize) * 100)}%`
        }
      };

      logger.info('Image processed successfully', {
        filename,
        ...req.processedImage.quality
      });
    } catch (error) {
      logger.warn('Image processing skipped', { filename, error: error.message });
      // Don't fail the upload if image processing fails
    }

    next();
  } catch (error) {
    logger.error('Image processing middleware error', { error: error.message });
    // Don't block upload on processing error
    next();
  }
};

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Endpoint for on-demand image resizing
export const getResizedImage = async (req, res) => {
  try {
    const { filename, width = 640, height = 480, format = 'webp' } = req.query;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // Validate dimensions
    const w = Math.min(parseInt(width) || 640, 2560); // Max 2560px
    const h = Math.min(parseInt(height) || 480, 2560);

    // Find the image file
    let imagePath = path.join(uploadDir, 'media', filename);

    if (!fs.existsSync(imagePath)) {
      // Try other directories
      const dirs = [facesDir, avatarsDir, thumbnailsDir];
      for (const dir of dirs) {
        const tryPath = path.join(dir, filename);
        if (fs.existsSync(tryPath)) {
          imagePath = tryPath;
          break;
        }
      }
    }

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Resize image
    const buffer = await sharp(imagePath)
      .resize(w, h, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      [format === 'webp' ? 'webp' : format]({ quality: 80 })
      .toBuffer();

    res.type(`image/${format}`);
    res.send(buffer);
  } catch (error) {
    logger.error('Image resize error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to resize image'
    });
  }
};
