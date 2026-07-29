import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
const initialForm = {
    name: '', code: '', address: '', city: '', state: '', phone: '', email: '',
};
export function CreateBranchPage() {
    return _jsx(BranchFormPage, {});
}
export function EditBranchPage() {
    return _jsx(BranchFormPage, { isEditing: true });
}
function BranchFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/branches/${id}`)
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
                await apiRequest(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/branches', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/branches');
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
            title: 'Branch Details',
            description: 'Basic branch identification',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Branch Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter branch name" }), _jsx(FormInput, { label: "Branch Code", required: true, value: form.code, onChange: (e) => update('code', e.target.value), placeholder: "BR-001" })] })),
        },
        {
            title: 'Contact',
            description: 'Primary contact details',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Phone", type: "tel", value: form.phone, onChange: (e) => update('phone', e.target.value), placeholder: "+91-9876543210" }), _jsx(FormInput, { label: "Email", type: "email", value: form.email, onChange: (e) => update('email', e.target.value), placeholder: "branch@example.com" })] })),
        },
        {
            title: 'Address',
            description: 'Branch location',
            className: 'md:col-span-2',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormTextarea, { label: "Address", value: form.address, onChange: (e) => update('address', e.target.value), placeholder: "Street, building, area..." }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(FormInput, { label: "City", value: form.city, onChange: (e) => update('city', e.target.value), placeholder: "City" }), _jsx(FormInput, { label: "State", value: form.state, onChange: (e) => update('state', e.target.value), placeholder: "State" })] })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Branch", description: "Manage branch office and regional location", module: "Branches", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/branches') }));
}
//# sourceMappingURL=branch-form.js.map