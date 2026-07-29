import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from './CreateEditPage';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormTextarea } from './FormTextarea';
export function DynamicFormPage({ title, description, apiPath, formFields, module, listPath, }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const [form, setForm] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    // ── Init form with defaults ──────────────────────────
    useEffect(() => {
        const defaults = {};
        formFields.forEach((f) => {
            if (f.type === 'boolean')
                defaults[f.name] = false;
            else if (f.type === 'number')
                defaults[f.name] = 0;
            else
                defaults[f.name] = '';
        });
        setForm(defaults);
    }, [formFields]);
    // ── Load existing record if editing ──────────────────
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`${apiPath}/${id}`)
                .then((data) => {
                if (data && typeof data === 'object') {
                    setForm((prev) => ({ ...prev, ...data }));
                }
            })
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [isEditing, id, apiPath]);
    const update = useCallback((name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    }, []);
    const handleSave = useCallback(async () => {
        setSubmitting(true);
        setError(null);
        try {
            if (isEditing && id) {
                await apiRequest(`${apiPath}/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest(apiPath, { method: 'POST', body: JSON.stringify(form) });
            }
            navigate(listPath);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    }, [form, isEditing, id, apiPath, navigate, listPath]);
    // ── Split fields into sections ──────────────────────
    const sections = [];
    const fieldCount = formFields.length;
    const half = Math.ceil(fieldCount / 2);
    // Section 1: first half of fields
    const firstHalf = formFields.slice(0, half);
    const secondHalf = formFields.slice(half);
    if (firstHalf.length > 0) {
        sections.push({
            title: `${title} Details`,
            description: 'Basic information',
            fields: (_jsx(DynamicFields, { fields: firstHalf, form: form, update: update })),
        });
    }
    if (secondHalf.length > 0) {
        sections.push({
            title: 'Additional Information',
            description: 'Extended details',
            fields: (_jsx(DynamicFields, { fields: secondHalf, form: form, update: update })),
        });
    }
    return (_jsx(CreateEditPage, { title: title, description: description, module: module, listPath: listPath, sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate(listPath) }));
}
// ── Dynamic field renderer ──────────────────────────────
function DynamicFields({ fields, form, update, }) {
    return (_jsx(_Fragment, { children: fields.map((field) => {
            const value = form[field.name];
            const key = field.name;
            if (field.type === 'textarea') {
                return (_jsx(FormTextarea, { label: field.label, required: field.required, placeholder: field.placeholder, value: String(value ?? ''), onChange: (e) => update(field.name, e.target.value) }, key));
            }
            if (field.type === 'select') {
                return (_jsx(FormSelect, { label: field.label, required: field.required, placeholder: field.placeholder || 'Select...', value: String(value ?? ''), onChange: (e) => update(field.name, e.target.value), options: field.options || [] }, key));
            }
            if (field.type === 'boolean') {
                return (_jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: Boolean(value), onChange: (e) => update(field.name, e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: field.label }), _jsx("p", { className: "text-xs text-slate-500", children: field.placeholder || `Toggle ${field.label.toLowerCase()}` })] })] }, key));
            }
            return (_jsx(FormInput, { label: field.label, required: field.required, placeholder: field.placeholder, type: field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text', value: field.type === 'number' ? String(value ?? 0) : String(value ?? ''), onChange: (e) => update(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value) }, key));
        }) }));
}
//# sourceMappingURL=DynamicFormPage.js.map