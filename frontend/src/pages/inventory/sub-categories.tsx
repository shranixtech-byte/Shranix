import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

const subCategoryColumns: ColumnDef[] = [
  { key: 'name', label: 'Sub Category Name' },
  { key: 'categoryId', label: 'Category ID' },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];

const subCategoryFields: FormField[] = [
  { name: 'name', label: 'Sub Category Name', type: 'text', required: true },
  { name: 'categoryId', label: 'Category ID', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'boolean' },
];

export function SubCategoriesPage() {
  return (
    <MasterDataPage
      title="Sub Categories"
      description="Manage product sub-categories for detailed classification"
      columns={subCategoryColumns}
      apiPath="/inventory/sub-categories"
      formFields={subCategoryFields}
    />
  );
}
