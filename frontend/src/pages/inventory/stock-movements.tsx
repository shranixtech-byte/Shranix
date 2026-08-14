import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

const movementColumns: ColumnDef[] = [
  {
    key: 'createdAt',
    label: 'Date',
    render: (v) => (v ? new Date(v as string).toLocaleDateString('en-IN') : '—'),
  },
  {
    key: 'transactionType',
    label: 'Type',
    render: (v) => {
      const types: Record<string, string> = {
        purchase_receipt: '📥 Purchase',
        sales_issue: '📤 Sales',
        sales_invoice: '📤 Sales',
        sales_return: '↩️ Sales Return',
        purchase_return: '↩️ Purchase Return',
        adjustment: '⚖️ Adjustment',
        stock_adjustment: '⚖️ Adjustment',
        damage: '💔 Damage',
        transfer_in: '🔄 Transfer In',
        transfer_out: '🔄 Transfer Out',
        opening: '📦 Opening',
        cycle_count: '🔁 Cycle Count',
        correction: '✏️ Correction',
      };
      return types[String(v)] || String(v);
    },
  },
  { key: 'itemId', label: 'Item' },
  { key: 'batchNo', label: 'Batch' },
  {
    key: 'quantity',
    label: 'Qty',
    render: (v, r) => {
      const isIn = [
        'purchase_receipt',
        'sales_return',
        'transfer_in',
        'opening',
        'adjustment',
        'cycle_count',
        'correction',
      ].includes(String((r as any).transactionType));
      return (
        <span className={isIn ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
          {isIn ? '+' : '-'}
          {Number(v).toFixed(0)}
        </span>
      );
    },
  },
  { key: 'unitCost', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
  { key: 'balanceQuantity', label: 'Balance' },
  { key: 'documentType', label: 'Reference' },
  { key: 'remarks', label: 'Reason' },
];

const movementFields: FormField[] = [
  { name: 'itemId', label: 'Item ID', type: 'text', required: true },
  { name: 'variantId', label: 'Variant ID', type: 'text' },
  { name: 'batchNo', label: 'Batch No', type: 'text' },
  { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
  {
    name: 'movementType',
    label: 'Movement Type',
    type: 'select',
    required: true,
    options: [
      { label: 'Purchase Receipt', value: 'purchase_receipt' },
      { label: 'Sales Delivery', value: 'sales_delivery' },
      { label: 'Sales Return', value: 'sales_return' },
      { label: 'Purchase Return', value: 'purchase_return' },
      { label: 'Stock Adjustment', value: 'stock_adjustment' },
      { label: 'Damage', value: 'damage' },
      { label: 'Transfer', value: 'transfer' },
      { label: 'Opening Stock', value: 'opening' },
      { label: 'Manual Correction', value: 'correction' },
    ],
  },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'rate', label: 'Rate', type: 'number' },
  { name: 'amount', label: 'Amount', type: 'number' },
  { name: 'referenceType', label: 'Reference Type', type: 'text' },
  { name: 'referenceId', label: 'Reference ID', type: 'text' },
  { name: 'beforeQuantity', label: 'Qty Before', type: 'number' },
  { name: 'afterQuantity', label: 'Qty After', type: 'number' },
  { name: 'reason', label: 'Reason / Notes', type: 'textarea' },
];

export function StockMovementsPage() {
  return (
    <MasterDataPage
      title="Stock Movements"
      description="Complete audit trail of every stock change — purchases, sales, adjustments, transfers, and corrections"
      columns={movementColumns}
      apiPath="/inventory/stock-movements"
      formFields={movementFields}
    />
  );
}
