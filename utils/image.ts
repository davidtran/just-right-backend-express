import Jimp from 'jimp';
import { randomString } from './general';
import fs from 'fs/promises';
export async function resizeAndConvertImageToBase64(path: string, maxSize = 500) {
  try {
    const image = await Jimp.read(path);

    // Get image dimensions
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Check if either dimension is greater than 800
    if (width > maxSize || height > maxSize) {
      // Determine resize dimensions
      if (width > height) {
        // Resize based on width
        image.resize(maxSize, Jimp.AUTO);
      } else {
        // Resize based on height
        image.resize(Jimp.AUTO, maxSize);
      }

      // Save resized image and convert to base64
      const resizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      const filename = randomString(10) + '.jpg';
      await image.writeAsync(filename); // Save to file
      const base64Image = resizedBuffer.toString('base64');
      fs.unlink(filename);
      return base64Image;
    } else {
      // Image is within size limits, convert original to base64
      const originalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      return originalBuffer.toString('base64');
    }
  } catch (e) {
    throw e;
  }
}
