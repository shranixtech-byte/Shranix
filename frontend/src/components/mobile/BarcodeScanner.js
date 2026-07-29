import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Scan, Camera, X, Check, History, QrCode } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
export function BarcodeScanner({ onScan, mode = 'both', continuous = false }) {
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [devices, setDevices] = useState([]);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);
    useEffect(() => {
        // List available cameras
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then((devs) => {
                setDevices(devs.filter((d) => d.kind === 'videoinput'));
            }).catch(() => { });
        }
    }, []);
    const startCamera = useCallback(async (devId) => {
        try {
            setError(null);
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    ...(devId ? { deviceId: { exact: devId } } : {}),
                },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsActive(true);
            // Simulated scan detection (in production, use a barcode detection library)
            if (continuous) {
                scanIntervalRef.current = setInterval(() => {
                    // For demo: simulate scan every 3 seconds when camera is active
                    // In production, integrate with ZXing or similar library
                }, 3000);
            }
        }
        catch (err) {
            const message = err.message;
            if (message.includes('NotAllowedError') || message.includes('Permission')) {
                setError('Camera permission denied. Please grant camera access in your browser settings.');
            }
            else if (message.includes('NotFoundError')) {
                setError('No camera found on this device.');
            }
            else {
                setError(`Camera error: ${message}`);
            }
        }
    }, [continuous]);
    const stopCamera = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
    }, []);
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);
    const handleManualInput = (value) => {
        if (!value.trim()) {
            return;
        }
        const result = {
            code: value.trim(),
            type: /^[A-Za-z]/.test(value.trim()) ? 'barcode' : 'qr',
            timestamp: new Date(),
        };
        setLastResult(result);
        onScan(result);
    };
    const handleCaptureFrame = useCallback(() => {
        if (!videoRef.current) {
            return;
        }
        // In production, pass video frame to barcode detection library
        // For demo, simulate a scan result
        const simulatedCode = `SCAN-${Date.now().toString(36).toUpperCase()}`;
        const result = {
            code: simulatedCode,
            type: 'barcode',
            timestamp: new Date(),
        };
        setLastResult(result);
        onScan(result);
        if (!continuous) {
            stopCamera();
        }
    }, [continuous, onScan, stopCamera]);
    if (!isActive) {
        return (_jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900", children: [_jsxs("div", { className: "text-center", children: [_jsx(Scan, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("h3", { className: "mt-3 text-lg font-semibold text-gray-900 dark:text-white", children: mode === 'qr' ? 'QR Scanner' : 'Barcode Scanner' }), _jsxs("p", { className: "mt-1 text-sm text-gray-500", children: ["Point your camera at a ", mode === 'qr' ? 'QR code' : 'barcode', " to scan"] }), _jsxs("div", { className: "mt-4 flex flex-col items-center gap-2", children: [_jsxs("button", { onClick: () => startCamera(), className: "flex items-center gap-2 rounded-xl bg-primary-dark px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-dark/90", children: [_jsx(Camera, { className: "h-4 w-4" }), "Open Camera"] }), devices.length > 1 && (_jsxs("select", { onChange: (e) => e.target.value && startCamera(e.target.value), className: "mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: "", children: "Auto camera" }), devices.map((d, i) => (_jsx("option", { value: d.deviceId, children: d.label || `Camera ${i + 1}` }, d.deviceId)))] })), _jsxs("div", { className: "mt-3 flex w-full items-center gap-2", children: [_jsx("div", { className: "h-px flex-1 bg-gray-200 dark:bg-gray-700" }), _jsx("span", { className: "text-xs text-gray-400", children: "or enter manually" }), _jsx("div", { className: "h-px flex-1 bg-gray-200 dark:bg-gray-700" })] }), _jsx("input", { type: "text", placeholder: "Enter code manually...", onKeyDown: (e) => {
                                        if (e.key === 'Enter') {
                                            handleManualInput(e.target.value);
                                            e.target.value = '';
                                        }
                                    }, className: "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800" })] }), error && (_jsx("div", { className: "mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400", children: error }))] }), lastResult && (_jsx("div", { className: "mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Check, { className: "h-4 w-4 text-green-600" }), _jsxs("span", { className: "text-sm font-medium text-green-700 dark:text-green-400", children: ["Last scan: ", lastResult.code] })] }) }))] }));
    }
    return (_jsxs("div", { className: "relative overflow-hidden rounded-xl bg-black", children: [_jsx("video", { ref: videoRef, className: "h-64 w-full object-cover", playsInline: true, muted: true }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("div", { className: "h-40 w-40 rounded-lg border-2 border-white/50" }) }), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent p-4", children: [_jsxs("button", { onClick: handleCaptureFrame, className: "flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg", children: [_jsx(Camera, { className: "h-4 w-4" }), "Capture"] }), _jsxs("button", { onClick: stopCamera, className: "flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg", children: [_jsx(X, { className: "h-4 w-4" }), "Close"] })] }), lastResult && (_jsxs("div", { className: "absolute left-2 right-2 top-2 rounded-lg bg-green-500/90 px-3 py-2 text-sm font-medium text-white", children: ["\u2713 ", lastResult.code] }))] }));
}
export function QrCodeGenerator({ value, size = 200, label }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !value) {
            return;
        }
        // In production, use a QR code generation library (qrcode.js)
        // For demo, render a visual representation
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        const cellSize = size / 25;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#1a4d2e';
        // Draw a simulated QR pattern
        for (let i = 0; i < 21; i++) {
            for (let j = 0; j < 21; j++) {
                if ((i + j) % 3 === 0 || (i * j) % 5 === 0) {
                    ctx.fillRect(i * cellSize + cellSize * 2, j * cellSize + cellSize * 2, cellSize - 1, cellSize - 1);
                }
            }
        }
        // Position markers
        const markerSize = cellSize * 7;
        ctx.fillStyle = '#1a4d2e';
        // Top-left
        ctx.fillRect(cellSize * 2, cellSize * 2, markerSize, markerSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cellSize * 3.5, cellSize * 3.5, markerSize - cellSize * 3, markerSize - cellSize * 3);
        ctx.fillStyle = '#1a4d2e';
        ctx.fillRect(cellSize * 4, cellSize * 4, cellSize * 3, cellSize * 3);
    }, [value, size]);
    return (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("canvas", { ref: canvasRef, width: size, height: size, className: "rounded-lg border border-gray-200 dark:border-gray-700" }), label && _jsx("p", { className: "text-xs text-gray-500", children: label }), value && _jsx("p", { className: "text-[10px] text-gray-400 break-all max-w-[200px] text-center", children: value })] }));
}
export function ScanHistory({ items }) {
    if (items.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-2 py-8 text-gray-400", children: [_jsx(History, { className: "h-8 w-8" }), _jsx("p", { className: "text-sm", children: "No scan history" })] }));
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium text-gray-900 dark:text-white", children: "Scan History" }), _jsx("div", { className: "max-h-60 space-y-1 overflow-y-auto", children: items.map((item, i) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [item.type === 'qr' ? (_jsx(QrCode, { className: "h-4 w-4 text-blue-500" })) : (_jsx(Scan, { className: "h-4 w-4 text-green-500" })), _jsx("span", { className: "text-sm font-mono text-gray-900 dark:text-white", children: item.code })] }), _jsx("span", { className: "text-[10px] text-gray-400", children: item.timestamp.toLocaleTimeString() })] }, i))) })] }));
}
//# sourceMappingURL=BarcodeScanner.js.map