import React, { useState, useCallback } from "react";
import {
  processImageAdvanced,
  batchProcessImages,
  shouldProcessImage,
  ProcessedImage,
} from "../utils/ImageProcessor";

interface ImageUploadComponentProps {
  onImagesProcessed: (images: ProcessedImage[]) => void;
  maxFiles?: number;
  targetSizeKB?: number;
}

export const ImageUploadComponent: React.FC<ImageUploadComponentProps> = ({
  onImagesProcessed,
  maxFiles = 5,
  targetSizeKB = 500,
}) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [processingStats, setProcessingStats] = useState<{
    originalSizes: number[];
    finalSizes: number[];
    compressionRatios: number[];
  }>({ originalSizes: [], finalSizes: [], compressionRatios: [] });

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []).slice(0, maxFiles);

      if (files.length === 0) return;

      setProcessing(true);
      setProgress(0);
      setProcessedImages([]);

      try {
        // Check which files need processing
        const fileChecks = await Promise.all(
          files.map(async (file) => ({
            file,
            needsProcessing: shouldProcessImage(file, targetSizeKB),
            originalSize: file.size,
          }))
        );

        console.log(
          `${fileChecks.filter((f) => f.needsProcessing).length} of ${
            files.length
          } files need processing`
        );

        // Process all images
        const processed = await batchProcessImages(
          files,
          {
            maxFileSizeKB: targetSizeKB,
            preferJPEG: true,
            initialQuality: 0.85,
            minQuality: 0.3,
          },
          (completed, total) => {
            setProgress((completed / total) * 100);
          }
        );

        // Calculate compression statistics
        const originalSizes = fileChecks.map((f) => f.originalSize);
        const finalSizes = processed.map((p) => p.size);
        const compressionRatios = originalSizes.map(
          (original, index) => ((original - finalSizes[index]) / original) * 100
        );

        setProcessingStats({
          originalSizes,
          finalSizes,
          compressionRatios,
        });

        setProcessedImages(processed);
        onImagesProcessed(processed);

        // Log results
        processed.forEach((img, index) => {
          const originalKB = originalSizes[index] / 1024;
          const finalKB = img.size / 1024;
          const ratio = compressionRatios[index];

          console.log(
            `${img.file.name}: ${originalKB.toFixed(2)}KB → ${finalKB.toFixed(
              2
            )}KB (${ratio.toFixed(1)}% reduction, quality: ${(
              img.finalQuality * 100
            ).toFixed(0)}%)`
          );
        });
      } catch (error) {
        console.error("Image processing failed:", error);
        alert("Failed to process images. Please try again.");
      } finally {
        setProcessing(false);
        setProgress(0);
      }
    },
    [maxFiles, targetSizeKB, onImagesProcessed]
  );

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(2) + " KB";
  };

  const getCompressionColor = (ratio: number) => {
    if (ratio > 50) return "#ef4444"; // red - high compression
    if (ratio > 25) return "#f59e0b"; // yellow - medium compression
    return "#10b981"; // green - low compression
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div>
        <label className="block text-sm font-medium mb-2">
          Upload Images (Max {maxFiles}, Target: {targetSizeKB}KB each)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={processing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {processing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing images...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {processedImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Processed Images</h3>

          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {formatFileSize(
                  processingStats.originalSizes.reduce((a, b) => a + b, 0)
                )}
              </div>
              <div className="text-xs text-gray-600">Total Original</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {formatFileSize(
                  processingStats.finalSizes.reduce((a, b) => a + b, 0)
                )}
              </div>
              <div className="text-xs text-gray-600">Total Final</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {(
                  processingStats.compressionRatios.reduce((a, b) => a + b, 0) /
                  processingStats.compressionRatios.length
                ).toFixed(1)}
                %
              </div>
              <div className="text-xs text-gray-600">Avg Compression</div>
            </div>
          </div>

          {/* Individual Image Results */}
          <div className="space-y-2">
            {processedImages.map((img, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border rounded"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={img.url}
                    alt={img.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <div className="font-medium text-sm">{img.file.name}</div>
                    <div className="text-xs text-gray-500">
                      {img.width} × {img.height}px
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-sm">
                    {formatFileSize(processingStats.originalSizes[index])} →{" "}
                    {formatFileSize(img.size)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="text-xs px-2 py-1 rounded text-white"
                      style={{
                        backgroundColor: getCompressionColor(
                          processingStats.compressionRatios[index]
                        ),
                      }}
                    >
                      {processingStats.compressionRatios[index].toFixed(1)}%
                      saved
                    </span>
                    {img.compressionApplied && (
                      <span className="text-xs text-gray-500">
                        Q: {(img.finalQuality * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadComponent;
