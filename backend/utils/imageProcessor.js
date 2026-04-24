import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import logger from '../config/logger.js';

// Image processing configuration
const THUMBNAIL_SIZES = {
  small: { width: 320, height: 240, name: 'small' },
  medium: { width: 640, height: 480, name: 'medium' },
  large: { width: 1280, height: 960, name: 'large' }
};

const AVATAR_SIZE = { width: 256, height: 256 };
const QUALITY = 80;

/**
 * Process uploaded image: create thumbnails and optimize
 * @param {string} filePath - Path to original image
 * @param {string} type - 'post' | 'avatar' | 'face'
 * @returns {object} - Paths to original and thumbnails
 */
export async function processImage(filePath, type = 'post') {
  try {
    const filename = path.basename(filePath);
    const filenameWithoutExt = path.parse(filename).name;
    const directory = path.dirname(filePath);

    const result = {
      original: `/uploads/${path.relative(path.join(path.dirname(directory), 'uploads'), filePath).replace(/\\/g, '/')}`
    };

    if (type === 'post') {
      // Create thumbnails for posts
      for (const [key, size] of Object.entries(THUMBNAIL_SIZES)) {
        const thumbnailPath = path.join(directory, `${filenameWithoutExt}_${size.name}.webp`);

        await sharp(filePath)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: QUALITY })
          .toFile(thumbnailPath);

        result[`thumbnail_${key}`] = `/uploads/${path.relative(path.join(path.dirname(directory), 'uploads'), thumbnailPath).replace(/\\/g, '/')}`;
      }

      // Also create WebP version of original
      const webpPath = path.join(directory, `${filenameWithoutExt}.webp`);
      await sharp(filePath)
        .webp({ quality: QUALITY + 10 })
        .toFile(webpPath);
      result.original_webp = `/uploads/${path.relative(path.join(path.dirname(directory), 'uploads'), webpPath).replace(/\\/g, '/')}`;

    } else if (type === 'avatar') {
      // Optimize and square avatars
      const optimizedPath = path.join(directory, `${filenameWithoutExt}_optimized.webp`);

      await sharp(filePath)
        .resize(AVATAR_SIZE.width, AVATAR_SIZE.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: QUALITY + 10 })
        .toFile(optimizedPath);

      result.optimized = `/uploads/${path.relative(path.join(path.dirname(directory), 'uploads'), optimizedPath).replace(/\\/g, '/')}`;
    }

    // Remove EXIF data from original for privacy
    await removeExifData(filePath);

    logger.info(`Image processed successfully: ${type}`, { filename });
    return result;
  } catch (error) {
    logger.error('Image processing error:', { error: error.message, filePath });
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Remove EXIF data from image for privacy
 */
export async function removeExifData(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    await sharp(filePath)
      .withMetadata(false)
      .toFile(`${filePath}.tmp`);

    await fs.rename(`${filePath}.tmp`, filePath);
    logger.debug('EXIF data removed', { filePath });
  } catch (error) {
    logger.warn('Failed to remove EXIF data:', { filePath, error: error.message });
  }
}

/**
 * Resize image on-demand via URL parameters
 * Used for serving images at different sizes without storing multiple copies
 */
export async function resizeImageOnDemand(filePath, width, height, format = 'webp') {
  try {
    const buffer = await sharp(filePath)
      .resize(parseInt(width), parseInt(height), {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      [format === 'webp' ? 'webp' : 'jpeg']({ quality: QUALITY })
      .toBuffer();

    return buffer;
  } catch (error) {
    logger.error('On-demand resize error:', { error: error.message });
    return null;
  }
}

/**
 * Validate image dimensions before processing
 */
export async function validateImageDimensions(filePath, minWidth = 100, minHeight = 100) {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.width >= minWidth && metadata.height >= minHeight;
  } catch (error) {
    logger.error('Image validation error:', { error: error.message });
    return false;
  }
}

export default {
  processImage,
  removeExifData,
  resizeImageOnDemand,
  validateImageDimensions,
  THUMBNAIL_SIZES,
  AVATAR_SIZE
};
