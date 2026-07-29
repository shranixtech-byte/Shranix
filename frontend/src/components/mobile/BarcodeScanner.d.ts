interface ScanResult {
    code: string;
    type: 'barcode' | 'qr';
    timestamp: Date;
}
interface BarcodeScannerProps {
    onScan: (result: ScanResult) => void;
    mode?: 'barcode' | 'qr' | 'both';
    continuous?: boolean;
}
export declare function BarcodeScanner({ onScan, mode, continuous }: BarcodeScannerProps): import("react").JSX.Element;
export declare function QrCodeGenerator({ value, size, label }: {
    value: string;
    size?: number;
    label?: string;
}): import("react").JSX.Element;
export declare function ScanHistory({ items }: {
    items: ScanResult[];
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=BarcodeScanner.d.ts.map