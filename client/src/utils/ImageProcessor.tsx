// utils/imageProcessor.ts
export interface ProcessedImage {
  file: File;
  originalFile: File;
  url: string;
  width: number;
  height: number;
  size: number;
  compressionApplied: boolean;
  finalQuality: number;
}

export interface ImageProcessOptions {
  maxSize?: number;
  maxFileSizeKB?: number;
  initialQuality?: number;
  minQuality?: number;
  preferJPEG?: boolean;
}

export const processImage = (
  file: File,
  options: ImageProcessOptions = {}
): Promise<ProcessedImage> => {
  const {
    maxSize = 1920,
    maxFileSizeKB = 500,
    initialQuality = 0.85,
    minQuality = 0.3,
    preferJPEG = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          maxSize
        );

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and scale the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Determine the best format based on the original file and preferences
        const outputFormat = determineOptimalFormat(file, preferJPEG);

        // Compress with iterative quality reduction to meet file size requirements
        const result = await compressToTargetSize(
          canvas,
          outputFormat,
          maxFileSizeKB * 1024, // Convert KB to bytes
          initialQuality,
          minQuality
        );

        // Create new file with processed image
        const processedFile = new File(
          [result.blob],
          generateFileName(file.name, outputFormat.type),
          { type: outputFormat.type }
        );

        const processedUrl = URL.createObjectURL(result.blob);

        resolve({
          file: processedFile,
          originalFile: file,
          url: processedUrl,
          width: newWidth,
          height: newHeight,
          size: result.blob.size,
          compressionApplied: result.compressionApplied,
          finalQuality: result.finalQuality,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Determines the optimal output format based on image content and preferences
 */
const determineOptimalFormat = (file: File, preferJPEG: boolean) => {
  const originalType = file.type.toLowerCase();

  // For photos/complex images with many colors, JPEG is usually better
  // For simple graphics, logos, or images with transparency, PNG might be better
  // But since we want to minimize file size, we generally prefer JPEG

  if (preferJPEG && originalType !== "image/png") {
    return { type: "image/jpeg", extension: ".jpg" };
  }

  // Keep PNG for images that might have transparency or are already PNG
  if (originalType === "image/png") {
    return { type: "image/png", extension: ".png" };
  }

  // Default to JPEG for best compression
  return { type: "image/jpeg", extension: ".jpg" };
};

/**
 * Generates appropriate filename with correct extension
 */
const generateFileName = (originalName: string, mimeType: string): string => {
  const baseName = originalName.split(".")[0];
  const extension = mimeType === "image/jpeg" ? ".jpg" : ".png";
  return `${baseName}${extension}`;
};

/**
 * Compresses image iteratively until target file size is achieved
 */
const compressToTargetSize = (
  canvas: HTMLCanvasElement,
  format: { type: string; extension: string },
  maxSizeBytes: number,
  initialQuality: number,
  minQuality: number
): Promise<{
  blob: Blob;
  compressionApplied: boolean;
  finalQuality: number;
}> => {
  return new Promise((resolve, reject) => {
    let currentQuality = initialQuality;
    let compressionApplied = false;
    const qualityStep = 0.1;

    const tryCompress = () => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          console.log(
            `Compressed to ${(blob.size / 1024).toFixed(
              2
            )}KB at quality ${currentQuality.toFixed(2)}`
          );
          // Check if we've met the size requirement or reached minimum quality
          if (blob.size <= maxSizeBytes || currentQuality <= minQuality) {
            resolve({
              blob,
              compressionApplied,
              finalQuality: currentQuality,
            });
            return;
          }

          // Reduce quality and try again
          currentQuality = Math.max(minQuality, currentQuality - qualityStep);
          compressionApplied = true;

          // Use setTimeout to prevent blocking the UI
          // Use requestAnimationFrame to prevent blocking the UI
          requestAnimationFrame(tryCompress);
        },
        format.type,
        format.type === "image/jpeg" ? currentQuality : undefined // PNG doesn't use quality parameter
      );
    };

    tryCompress();
  });
};

const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } => {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize,
    };
  }
};

export const batchProcessImages = async (
  files: File[],
  options: ImageProcessOptions = {},
  onProgress?: (processed: number, total: number) => void
): Promise<ProcessedImage[]> => {
  const processedImages: ProcessedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const processed = await processImage(files[i], options);
      processedImages.push(processed);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to process image ${files[i].name}:`, error);
      throw error;
    }
  }

  return processedImages;
};

/**
 * Advanced image processing with smart format selection and size optimization
 */
export const processImageAdvanced = async (
  file: File,
  targetSizeKB: number = 500
): Promise<ProcessedImage> => {
  // First, try with JPEG format (usually gives smaller file sizes)
  try {
    const jpegResult = await processImage(file, {
      maxFileSizeKB: targetSizeKB,
      preferJPEG: true,
      initialQuality: 0.85,
      minQuality: 0.3,
    });

    // If JPEG result is good, return it
    if (jpegResult.size <= targetSizeKB * 1024) {
      return jpegResult;
    }
  } catch (error) {
    console.warn("JPEG processing failed, trying PNG:", error);
  }

  // If JPEG doesn't work or fails, try PNG
  const pngResult = await processImage(file, {
    maxFileSizeKB: targetSizeKB,
    preferJPEG: false,
    initialQuality: 0.85,
    minQuality: 0.3,
  });

  return pngResult;
};

/**
 * Utility function to check if an image needs processing
 */
export const shouldProcessImage = (
  file: File,
  maxSizeKB: number = 500
): boolean => {
  const fileSizeKB = file.size / 1024;
  return (
    fileSizeKB > maxSizeKB ||
    !["image/jpeg", "image/jpg", "image/png"].includes(file.type)
  );
};

/**
 * Get image dimensions without processing
 */
export const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for dimension check"));
    };

    img.src = URL.createObjectURL(file);
  });
};
