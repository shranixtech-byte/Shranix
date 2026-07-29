import { jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
const subCategoryColumns = [
    { key: 'name', label: 'Sub Category Name' },
    { key: 'categoryId', label: 'Category ID' },
    { key: 'description', label: 'Description' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const subCategoryFields = [
    { name: 'name', label: 'Sub Category Name', type: 'text', required: true },
    { name: 'categoryId', label: 'Category ID', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
];
export function SubCategoriesPage() {
    return (_jsx(MasterDataPage, { title: "Sub Categories", description: "Manage product sub-categories for detailed classification", columns: subCategoryColumns, apiPath: "/inventory/sub-categories", formFields: subCategoryFields }));
}
//# sourceMappingURL=sub-categories.js.map