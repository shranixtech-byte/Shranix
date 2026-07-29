import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

const locationColumns: ColumnDef[] = [
  { key: 'warehouseId', label: 'Warehouse' },
  { key: 'godown', label: 'Godown' },
  { key: 'rack', label: 'Rack' },
  { key: 'shelf', label: 'Shelf' },
  { key: 'bin', label: 'Bin' },
  { key: 'locationCode', label: 'Location Code' },
  { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];

const locationFields: FormField[] = [
  { name: 'warehouseId', label: 'Warehouse ID', type: 'text', required: true },
  { name: 'godown', label: 'Godown Name', type: 'text' },
  { name: 'rack', label: 'Rack Number', type: 'text' },
  { name: 'shelf', label: 'Shelf Number', type: 'text' },
  { name: 'bin', label: 'Bin Number', type: 'text' },
  { name: 'locationCode', label: 'Location Code', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'boolean' },
];

export function WarehouseLocationsPage() {
  return (
    <MasterDataPage
      title="Warehouse Locations"
      description="Manage godowns, racks, shelves, and bins for precise inventory location tracking"
      columns={locationColumns}
      apiPath="/inventory/warehouse-locations"
      formFields={locationFields}
    />
  );
}
