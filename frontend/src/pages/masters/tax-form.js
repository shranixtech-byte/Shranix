import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
const initialTaxGroup = { name: '', description: '', type: 'gst', isDefault: false };
export function CreateTaxGroupPage() {
    return _jsx(TaxGroupFormPage, {});
}
export function EditTaxGroupPage() {
    return _jsx(TaxGroupFormPage, { isEditing: true });
}
function TaxGroupFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialTaxGroup);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/tax-groups/${id}`)
                .then((data) => { if (data && typeof data === 'object')
                setForm({ ...initialTaxGroup, ...data }); })
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
                await apiRequest(`/tax-groups/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/tax-groups', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/tax-groups');
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
            title: 'Tax Group Details',
            description: 'Tax category information',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Tax Group Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter tax group name" }), _jsx(FormSelect, { label: "Type", value: form.type, onChange: (e) => update('type', e.target.value), options: [
                            { label: 'GST', value: 'gst' }, { label: 'VAT', value: 'vat' }, { label: 'Custom', value: 'custom' },
                        ] }), _jsx(FormTextarea, { label: "Description", value: form.description, onChange: (e) => update('description', e.target.value), placeholder: "Tax group description..." })] })),
        },
        {
            title: 'Settings',
            fields: (_jsx(_Fragment, { children: _jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isDefault, onChange: (e) => update('isDefault', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Default Group" }), _jsx("p", { className: "text-xs text-slate-500", children: "Set as the default tax group" })] })] }) })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Tax Group", description: "Configure tax categories and groupings", module: "Tax Groups", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/tax-groups') }));
}
const initialGstRate = {
    name: '', description: '', rate: 0, type: 'igst',
    igst: 0, cgst: 0, sgst: 0, cess: 0, isDefault: false, hsnSacCode: '',
};
export function CreateGstRatePage() {
    return _jsx(GstRateFormPage, {});
}
export function EditGstRatePage() {
    return _jsx(GstRateFormPage, { isEditing: true });
}
function GstRateFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialGstRate);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/gst-rates/${id}`)
                .then((data) => { if (data && typeof data === 'object')
                setForm({ ...initialGstRate, ...data }); })
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
                await apiRequest(`/gst-rates/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/gst-rates', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/gst-rates');
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
            title: 'Rate Information',
            description: 'GST rate identification',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Rate Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "GST 18%" }), _jsx(FormInput, { label: "Rate (%)", required: true, type: "number", value: String(form.rate), onChange: (e) => update('rate', Number(e.target.value)), placeholder: "18" }), _jsx(FormSelect, { label: "Type", value: form.type, onChange: (e) => update('type', e.target.value), options: [
                            { label: 'IGST', value: 'igst' }, { label: 'CGST+SGST', value: 'cgst_sgst' }, { label: 'Cess', value: 'cess' },
                        ] }), _jsx(FormInput, { label: "HSN/SAC Code", value: form.hsnSacCode, onChange: (e) => update('hsnSacCode', e.target.value), placeholder: "HSN code" })] })),
        },
        {
            title: 'Tax Breakdown',
            description: 'Component-wise tax rates',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "IGST %", type: "number", value: String(form.igst), onChange: (e) => update('igst', Number(e.target.value)), placeholder: "18" }), _jsx(FormInput, { label: "CGST %", type: "number", value: String(form.cgst), onChange: (e) => update('cgst', Number(e.target.value)), placeholder: "9" }), _jsx(FormInput, { label: "SGST %", type: "number", value: String(form.sgst), onChange: (e) => update('sgst', Number(e.target.value)), placeholder: "9" }), _jsx(FormInput, { label: "Cess %", type: "number", value: String(form.cess), onChange: (e) => update('cess', Number(e.target.value)), placeholder: "0" })] })),
        },
        {
            title: 'Description & Settings',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormTextarea, { label: "Description", value: form.description, onChange: (e) => update('description', e.target.value), placeholder: "Rate description..." }), _jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isDefault, onChange: (e) => update('isDefault', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Default Rate" }), _jsx("p", { className: "text-xs text-slate-500", children: "Set as the default GST rate" })] })] })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "GST Rate", description: "Configure GST tax slabs and rates for compliance", module: "GST Rates", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/gst-rates') }));
}
//# sourceMappingURL=tax-form.js.map