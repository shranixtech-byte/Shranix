import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
const initialForm = { name: '', startDate: '', endDate: '', isActive: true, isClosed: false };
export function CreateFinancialYearPage() {
    return _jsx(FYFormPage, {});
}
export function EditFinancialYearPage() {
    return _jsx(FYFormPage, { isEditing: true });
}
function FYFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/financial-years/${id}`)
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
                await apiRequest(`/financial-years/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/financial-years', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/financial-years');
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
            title: 'Financial Year Details',
            description: 'Define the financial period',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "FY Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "2025-2026" }), _jsx(FormInput, { label: "Start Date", required: true, type: "date", value: form.startDate, onChange: (e) => update('startDate', e.target.value) }), _jsx(FormInput, { label: "End Date", required: true, type: "date", value: form.endDate, onChange: (e) => update('endDate', e.target.value) })] })),
        },
        {
            title: 'Status',
            description: 'Financial year status settings',
            fields: (_jsxs(_Fragment, { children: [_jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isActive, onChange: (e) => update('isActive', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Active" }), _jsx("p", { className: "text-xs text-slate-500", children: "Set as the active financial year" })] })] }), _jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isClosed, onChange: (e) => update('isClosed', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Closed" }), _jsx("p", { className: "text-xs text-slate-500", children: "Mark as closed (no further entries allowed)" })] })] })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Financial Year", description: "Configure financial period for accounting cycles", module: "Financial Years", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/financial-years') }));
}
//# sourceMappingURL=financial-year-form.js.map