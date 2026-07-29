import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
const initialForm = {
    name: '', code: '', warehouseType: 'storage', address: '', state: '', district: '',
    city: '', pincode: '', contactPerson: '', phone: '', mobile: '', email: '',
    gstin: '', remarks: '', isMain: false,
};
export function CreateWarehousePage() {
    return _jsx(WarehouseFormPage, {});
}
export function EditWarehousePage() {
    return _jsx(WarehouseFormPage, { isEditing: true });
}
function WarehouseFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/warehouses/${id}`)
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
                await apiRequest(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/warehouses', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/warehouses');
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
            title: 'General Information',
            description: 'Warehouse identification',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Warehouse Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter warehouse name" }), _jsx(FormInput, { label: "Warehouse Code", required: true, value: form.code, onChange: (e) => update('code', e.target.value), placeholder: "WH-001" }), _jsx(FormSelect, { label: "Warehouse Type", value: form.warehouseType, onChange: (e) => update('warehouseType', e.target.value), options: [
                            { label: 'Storage', value: 'storage' },
                            { label: 'Distribution', value: 'distribution' },
                            { label: 'Transit', value: 'transit' },
                        ] })] })),
        },
        {
            title: 'Contact Person',
            description: 'Warehouse in-charge details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Contact Person", value: form.contactPerson, onChange: (e) => update('contactPerson', e.target.value), placeholder: "Full name" }), _jsx(FormInput, { label: "Phone", type: "tel", value: form.phone, onChange: (e) => update('phone', e.target.value), placeholder: "Landline" }), _jsx(FormInput, { label: "Mobile", type: "tel", value: form.mobile, onChange: (e) => update('mobile', e.target.value), placeholder: "+91-9876543210" }), _jsx(FormInput, { label: "Email", type: "email", value: form.email, onChange: (e) => update('email', e.target.value), placeholder: "warehouse@example.com" })] })),
        },
        {
            title: 'Address',
            description: 'Warehouse location',
            className: 'md:col-span-2',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormTextarea, { label: "Address", value: form.address, onChange: (e) => update('address', e.target.value), placeholder: "Street, building, area..." }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(FormInput, { label: "City", value: form.city, onChange: (e) => update('city', e.target.value), placeholder: "City" }), _jsx(FormInput, { label: "District", value: form.district, onChange: (e) => update('district', e.target.value), placeholder: "District" }), _jsx(FormInput, { label: "State", value: form.state, onChange: (e) => update('state', e.target.value), placeholder: "State" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(FormInput, { label: "Pincode", value: form.pincode, onChange: (e) => update('pincode', e.target.value), placeholder: "PIN code" }), _jsx(FormInput, { label: "GST Number", value: form.gstin, onChange: (e) => update('gstin', e.target.value), placeholder: "22AAAAA0000A1Z5" })] })] })),
        },
        {
            title: 'Settings',
            description: 'Additional preferences',
            fields: (_jsxs(_Fragment, { children: [_jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isMain, onChange: (e) => update('isMain', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Main Warehouse" }), _jsx("p", { className: "text-xs text-slate-500", children: "Mark as the primary warehouse" })] })] }), _jsx(FormTextarea, { label: "Remarks", value: form.remarks, onChange: (e) => update('remarks', e.target.value), placeholder: "Additional notes..." })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Warehouse", description: "Manage storage location and distribution center", module: "Warehouses", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/warehouses') }));
}
//# sourceMappingURL=warehouse-form.js.map