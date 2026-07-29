import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
const initialForm = {
    name: '', sku: '', productCode: '', hsnCode: '', barcode: '', qrCode: '',
    type: 'product', description: '', categoryId: '', subCategoryId: '', brandId: '',
    unitId: '', packSize: '', manufacturer: '', supplierId: '', gstRateId: '',
    purchaseRate: 0, salesRate: 0, mrp: 0,
    openingStock: 0, minStock: 0, maxStock: 0, reorderLevel: 0,
    hasBatch: false, hasSerial: false, hasExpiry: false, notes: '',
};
export function CreateProductPage() {
    return _jsx(ProductFormPage, {});
}
export function EditProductPage() {
    return _jsx(ProductFormPage, { isEditing: true });
}
function ProductFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/inventory/items/${id}`)
                .then((data) => { if (data && typeof data === 'object')
                setForm({ ...initialForm, ...data }); })
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [isEditing, id]);
    const update = useCallback((field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);
    const handleSave = useCallback(async () => {
        setSubmitting(true);
        setError(null);
        try {
            if (isEditing && id) {
                await apiRequest(`/inventory/items/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/inventory/items', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/inventory/products');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    }, [form, isEditing, id, navigate]);
    const sections = [
        {
            title: 'Basic Information',
            description: 'Product identification and naming',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Product Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter product name" }), _jsx(FormInput, { label: "SKU Code", required: true, value: form.sku, onChange: (e) => update('sku', e.target.value), placeholder: "SKU-001" }), _jsx(FormInput, { label: "Product Code", value: form.productCode, onChange: (e) => update('productCode', e.target.value), placeholder: "Optional code" }), _jsx(FormSelect, { label: "Type", value: form.type, onChange: (e) => update('type', e.target.value), options: [
                            { label: 'Product', value: 'product' }, { label: 'Service', value: 'service' },
                            { label: 'Raw Material', value: 'raw_material' }, { label: 'Packaging', value: 'packaging' },
                            { label: 'Consumable', value: 'consumable' }, { label: 'Asset', value: 'asset' },
                        ] })] })),
        },
        {
            title: 'Classification',
            description: 'Category, brand and unit',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Category ID", value: form.categoryId, onChange: (e) => update('categoryId', e.target.value), placeholder: "Category" }), _jsx(FormInput, { label: "Sub Category ID", value: form.subCategoryId, onChange: (e) => update('subCategoryId', e.target.value), placeholder: "Sub category" }), _jsx(FormInput, { label: "Brand ID", value: form.brandId, onChange: (e) => update('brandId', e.target.value), placeholder: "Brand" }), _jsx(FormInput, { label: "Unit ID", value: form.unitId, onChange: (e) => update('unitId', e.target.value), placeholder: "Unit" })] })),
        },
        {
            title: 'Pricing',
            description: 'Product pricing information',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Purchase Rate (\u20B9)", type: "number", value: String(form.purchaseRate), onChange: (e) => update('purchaseRate', Number(e.target.value)), placeholder: "0.00" }), _jsx(FormInput, { label: "Sales Rate (\u20B9)", type: "number", value: String(form.salesRate), onChange: (e) => update('salesRate', Number(e.target.value)), placeholder: "0.00" }), _jsx(FormInput, { label: "MRP (\u20B9)", type: "number", value: String(form.mrp), onChange: (e) => update('mrp', Number(e.target.value)), placeholder: "0.00" })] })),
        },
        {
            title: 'Tax & Compliance',
            description: 'GST and HSN details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "HSN Code", value: form.hsnCode, onChange: (e) => update('hsnCode', e.target.value), placeholder: "HSN code" }), _jsx(FormInput, { label: "GST Rate ID", value: form.gstRateId, onChange: (e) => update('gstRateId', e.target.value), placeholder: "GST rate" }), _jsx(FormInput, { label: "Barcode", value: form.barcode, onChange: (e) => update('barcode', e.target.value), placeholder: "Barcode" }), _jsx(FormInput, { label: "QR Code", value: form.qrCode, onChange: (e) => update('qrCode', e.target.value), placeholder: "QR code" })] })),
        },
        {
            title: 'Stock Settings',
            description: 'Inventory management settings',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Opening Stock", type: "number", value: String(form.openingStock), onChange: (e) => update('openingStock', Number(e.target.value)), placeholder: "0" }), _jsx(FormInput, { label: "Min Stock", type: "number", value: String(form.minStock), onChange: (e) => update('minStock', Number(e.target.value)), placeholder: "0" }), _jsx(FormInput, { label: "Max Stock", type: "number", value: String(form.maxStock), onChange: (e) => update('maxStock', Number(e.target.value)), placeholder: "0" }), _jsx(FormInput, { label: "Reorder Level", type: "number", value: String(form.reorderLevel), onChange: (e) => update('reorderLevel', Number(e.target.value)), placeholder: "0" })] })),
        },
        {
            title: 'Tracking',
            description: 'Batch, serial and expiry tracking',
            fields: (_jsx(_Fragment, { children: [
                    { key: 'hasBatch', label: 'Batch Tracking', desc: 'Track inventory by batch numbers' },
                    { key: 'hasSerial', label: 'Serial Tracking', desc: 'Track individual serial numbers' },
                    { key: 'hasExpiry', label: 'Expiry Tracking', desc: 'Track manufacturing and expiry dates' },
                ].map(({ key, label, desc }) => (_jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form[key], onChange: (e) => update(key, e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: label }), _jsx("p", { className: "text-xs text-slate-500", children: desc })] })] }, key))) })),
        },
        {
            title: 'Additional Info',
            description: 'Manufacturer, supplier and notes',
            className: 'md:col-span-2',
            fields: (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(FormInput, { label: "Pack Size", value: form.packSize, onChange: (e) => update('packSize', e.target.value), placeholder: "10 kg" }), _jsx(FormInput, { label: "Manufacturer", value: form.manufacturer, onChange: (e) => update('manufacturer', e.target.value), placeholder: "Manufacturer" }), _jsx(FormInput, { label: "Supplier ID", value: form.supplierId, onChange: (e) => update('supplierId', e.target.value), placeholder: "Supplier" })] }), _jsx(FormTextarea, { label: "Description", value: form.description, onChange: (e) => update('description', e.target.value), placeholder: "Product description..." }), _jsx(FormTextarea, { label: "Notes", value: form.notes, onChange: (e) => update('notes', e.target.value), placeholder: "Additional notes..." })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Product", description: "Enterprise product master with stock, pricing, GST, batch/serial tracking", module: "Inventory", listPath: "/inventory/products", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/inventory/products') }));
}
//# sourceMappingURL=product-form.js.map