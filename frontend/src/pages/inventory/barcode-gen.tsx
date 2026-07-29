import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

const barcodeGenColumns: ColumnDef[] = [
  { key: 'itemId', label: 'Item' },
  { key: 'barcode', label: 'Barcode/QR' },
  { key: 'type', label: 'Type' },
  { key: 'isDefault', label: 'Default', render: (v) => v ? '✅ Yes' : '—' },
  { key: 'createdAt', label: 'Generated', render: (v) => v ? new Date(v as string).toLocaleDateString('en-IN') : '—' },
];

const barcodeGenFields: FormField[] = [
  { name: 'itemId', label: 'Item ID', type: 'text', required: true },
  { name: 'variantId', label: 'Variant ID', type: 'text' },
  { name: 'barcode', label: 'Barcode / QR Value', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', options: [
    { label: 'EAN-13', value: 'ean13' },
    { label: 'Code-128', value: 'code128' },
    { label: 'UPC', value: 'upc' },
    { label: 'QR Code', value: 'qr' },
    { label: 'DataMatrix', value: 'datamatrix' },
  ]},
  { name: 'isDefault', label: 'Set as Default', type: 'boolean' },
];

export function BarcodeGenPage() {
  return (
    <MasterDataPage
      title="Barcode & QR Generation"
      description="Generate and print barcodes, QR codes, and product labels"
      columns={barcodeGenColumns}
      apiPath="/inventory/barcodes"
      formFields={barcodeGenFields}
    />
  );
}
