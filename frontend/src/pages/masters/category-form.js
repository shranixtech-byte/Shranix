import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
const initialForm = { name: '', description: '', type: 'item', sortOrder: 0 };
export function CreateCategoryPage() {
    return _jsx(CategoryFormPage, {});
}
export function EditCategoryPage() {
    return _jsx(CategoryFormPage, { isEditing: true });
}
function CategoryFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/categories/${id}`)
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
                await apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/categories', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/categories');
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
            title: 'Category Information',
            description: 'Category identification and type',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Category Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Enter category name" }), _jsx(FormSelect, { label: "Type", value: form.type, onChange: (e) => update('type', e.target.value), options: [
                            { label: 'Item', value: 'item' }, { label: 'Party', value: 'party' },
                            { label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' },
                        ] }), _jsx(FormInput, { label: "Sort Order", type: "number", value: String(form.sortOrder), onChange: (e) => update('sortOrder', Number(e.target.value)), placeholder: "0" })] })),
        },
        {
            title: 'Description',
            description: 'Additional details',
            fields: (_jsx(_Fragment, { children: _jsx(FormTextarea, { label: "Description", value: form.description, onChange: (e) => update('description', e.target.value), placeholder: "Category description..." }) })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Category", description: "Organize items, parties, and transactions", module: "Categories", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/categories') }));
}
//# sourceMappingURL=category-form.js.map