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
export declare function CameraCapture({ maxImages, onImagesCapture, compressionQuality, maxWidth, }: CameraCaptureProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=CameraCapture.d.ts.map