import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
const initialForm = { name: '', description: '' };
export function CreateBrandPage() {
    return _jsx(BrandFormPage, {});
}
export function EditBrandPage() {
    return _jsx(BrandFormPage, { isEditing: true });
}
function BrandFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/brands/${id}`)
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
                await apiRequest(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/brands', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/brands');
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
            title: 'Brand Details',
            description: 'Product brand information',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Brand Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter brand name" }), _jsx(FormTextarea, { label: "Description", value: form.description, onChange: (e) => update('description', e.target.value), placeholder: "Brand description..." })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Brand", description: "Manage product brands and manufacturers", module: "Brands", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/brands') }));
}
//# sourceMappingURL=brand-form.js.map