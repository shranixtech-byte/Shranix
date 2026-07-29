import { Camera, Upload, X, Trash2 } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

interface CapturedImage {
  id: string;
  dataUrl: string;
  thumbnail: string;
  fileName: string;
  fileSize: number;
  timestamp: Date;
  width: number;
  height: number;
}

interface CameraCaptureProps {
  maxImages?: number;
  onImagesCapture: (images: CapturedImage[]) => void;
  compressionQuality?: number;
  maxWidth?: number;
}

export function CameraCapture({
  maxImages = 10,
  onImagesCapture,
  compressionQuality = 0.7,
  maxWidth = 1920,
}: CameraCaptureProps) {
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback((dataUrl: string, quality: number, maxW: number): Promise<CapturedImage> => {
    return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxW) {
        height = (height * maxW) / width;
        width = maxW;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      const compressed = canvas.toDataURL('image/jpeg', quality);

      // Create thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 200;
      thumbCanvas.height = (height * 200) / width;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(img, 0, 0, 200, thumbCanvas.height);
      }
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.5);

      resolve({
        id: Date.now().toString(),
        dataUrl: compressed,
        thumbnail,
        fileName: `capture_${Date.now()}.jpg`,
        fileSize: compressed.length,
        timestamp: new Date(),
        width: img.width,
        height: img.height,
      });
    };
    img.src = dataUrl;
    });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOpen(true);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('Permission')) {
        setError('Camera permission denied. Please grant camera access.');
      } else if (message.includes('NotFound')) {
        setError('No camera found.');
      } else {
        setError(`Camera error: ${message}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) {return;}

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const compressed = await compressImage(dataUrl, compressionQuality, maxWidth);

    setImages((prev) => {
      const updated = [...prev, compressed].slice(-maxImages);
      onImagesCapture(updated);
      return updated;
    });
  }, [compressImage, compressionQuality, maxImages, maxWidth, onImagesCapture]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {return;}

    const newImages: CapturedImage[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {continue;}

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(dataUrl, compressionQuality, maxWidth);
      newImages.push(compressed);
    }

    setImages((prev) => {
      const updated = [...prev, ...newImages].slice(-maxImages);
      onImagesCapture(updated);
      return updated;
    });

    if (fileInputRef.current) {fileInputRef.current.value = '';}
  }, [compressImage, compressionQuality, maxImages, onImagesCapture]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      onImagesCapture(updated);
      return updated;
    });
  }, [onImagesCapture]);

  const clearAll = useCallback(() => {
    setImages([]);
    onImagesCapture([]);
  }, [onImagesCapture]);

  return (
    <div className="space-y-4">
      {/* Camera viewfinder */}
      {isCameraOpen && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-64 w-full object-cover"
            playsInline
            muted
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent p-4">
            <button
              onClick={capturePhoto}
              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-transparent transition-transform hover:scale-110"
            >
              <div className="h-10 w-10 rounded-full bg-white" />
            </button>
            <button
              onClick={stopCamera}
              className="absolute right-4 rounded-full bg-red-500 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {!isCameraOpen && (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-dark/90"
          >
            <Camera className="h-4 w-4" />
            Capture
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {images.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Image gallery */}
      {images.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">{images.length} image(s)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <img
                  src={img.thumbnail}
                  alt={img.fileName}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <button
                    onClick={() => removeImage(img.id)}
                    className="rounded-full bg-red-500 p-1.5 text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <p className="text-[9px] text-white/80">
                    {Math.round(img.fileSize / 1024)}KB
                  </p>
                </div>
              </div>
            ))}
          </div>

          {images.length > 0 && (
            <button
              onClick={() => onImagesCapture(images)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Upload {images.length} image(s)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
