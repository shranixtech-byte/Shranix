import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
const initialForm = {
    name: '', alias: '', address: '', city: '', state: '', pincode: '',
    phone: '', email: '', gstin: '', pan: '', cin: '', website: '',
    isHeadOffice: false, financialYearStart: '', currency: 'INR',
};
export function CreateCompanyPage() {
    return _jsx(CompanyFormPage, {});
}
export function EditCompanyPage() {
    return _jsx(CompanyFormPage, { isEditing: true });
}
function CompanyFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/companies/${id}`)
                .then((data) => {
                if (data && typeof data === 'object') {
                    setForm({ ...initialForm, ...data });
                }
            })
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
                await apiRequest(`/companies/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
            }
            else {
                await apiRequest('/companies', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
            }
            navigate('/companies');
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
            description: 'Basic company identification details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Company Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter company name" }), _jsx(FormInput, { label: "Alias", value: form.alias, onChange: (e) => update('alias', e.target.value), placeholder: "Short name / alias" }), _jsx(FormInput, { label: "Website", type: "url", value: form.website, onChange: (e) => update('website', e.target.value), placeholder: "https://example.com" }), _jsx(FormInput, { label: "Currency", value: form.currency, onChange: (e) => update('currency', e.target.value), placeholder: "INR" })] })),
        },
        {
            title: 'Tax & Compliance',
            description: 'GST, PAN and other registration details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "GSTIN", value: form.gstin, onChange: (e) => update('gstin', e.target.value), placeholder: "22AAAAA0000A1Z5" }), _jsx(FormInput, { label: "PAN", value: form.pan, onChange: (e) => update('pan', e.target.value), placeholder: "AAAAA0000A" }), _jsx(FormInput, { label: "CIN", value: form.cin, onChange: (e) => update('cin', e.target.value), placeholder: "U12345MH2020PTC123456" }), _jsx(FormSelect, { label: "FY Start Month", value: form.financialYearStart, onChange: (e) => update('financialYearStart', e.target.value), placeholder: "Select month", options: [
                            { label: 'April', value: 'april' }, { label: 'January', value: 'january' },
                            { label: 'July', value: 'july' }, { label: 'October', value: 'october' },
                        ] })] })),
        },
        {
            title: 'Address',
            description: 'Registered office address',
            className: 'md:col-span-2',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormTextarea, { label: "Address", value: form.address, onChange: (e) => update('address', e.target.value), placeholder: "Street, building, area..." }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(FormInput, { label: "City", value: form.city, onChange: (e) => update('city', e.target.value), placeholder: "City" }), _jsx(FormInput, { label: "State", value: form.state, onChange: (e) => update('state', e.target.value), placeholder: "State" }), _jsx(FormInput, { label: "Pincode", value: form.pincode, onChange: (e) => update('pincode', e.target.value), placeholder: "PIN code" })] })] })),
        },
        {
            title: 'Contact',
            description: 'Primary contact details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Phone", type: "tel", value: form.phone, onChange: (e) => update('phone', e.target.value), placeholder: "+91-9876543210" }), _jsx(FormInput, { label: "Email", type: "email", value: form.email, onChange: (e) => update('email', e.target.value), placeholder: "company@example.com" })] })),
        },
        {
            title: 'Settings',
            description: 'Additional preferences',
            fields: (_jsx(_Fragment, { children: _jsxs("label", { className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800", children: [_jsx("input", { type: "checkbox", checked: form.isHeadOffice, onChange: (e) => update('isHeadOffice', e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100", children: "Head Office" }), _jsx("p", { className: "text-xs text-slate-500", children: "Mark as the primary/head office location" })] })] }) })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Company", description: "Manage business entity and company profile", module: "Companies", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/companies') }));
}
//# sourceMappingURL=company-form.js.map