import { jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
const barcodeGenColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'barcode', label: 'Barcode/QR' },
    { key: 'type', label: 'Type' },
    { key: 'isDefault', label: 'Default', render: (v) => v ? '✅ Yes' : '—' },
    { key: 'createdAt', label: 'Generated', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
];
const barcodeGenFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'barcode', label: 'Barcode / QR Value', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', options: [
            { label: 'EAN-13', value: 'ean13' },
            { label: 'Code-128', value: 'code128' },
            { label: 'UPC', value: 'upc' },
            { label: 'QR Code', value: 'qr' },
            { label: 'DataMatrix', value: 'datamatrix' },
        ] },
    { name: 'isDefault', label: 'Set as Default', type: 'boolean' },
];
export function BarcodeGenPage() {
    return (_jsx(MasterDataPage, { title: "Barcode & QR Generation", description: "Generate and print barcodes, QR codes, and product labels", columns: barcodeGenColumns, apiPath: "/inventory/barcodes", formFields: barcodeGenFields }));
}
//# sourceMappingURL=barcode-gen.js.map