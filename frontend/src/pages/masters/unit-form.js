import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
const initialForm = { name: '', shortName: '', type: 'general' };
export function CreateUnitPage() {
    return _jsx(UnitFormPage, {});
}
export function EditUnitPage() {
    return _jsx(UnitFormPage, { isEditing: true });
}
function UnitFormPage({ isEditing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            apiRequest(`/units/${id}`)
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
                await apiRequest(`/units/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            else {
                await apiRequest('/units', { method: 'POST', body: JSON.stringify(form) });
            }
            navigate('/units');
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
            title: 'Unit Details',
            description: 'Measurement unit information',
            fields: (_jsxs(_Fragment, { children: [_jsx(FormInput, { label: "Unit Name", required: true, value: form.name, onChange: (e) => update('name', e.target.value), placeholder: "Kilogram" }), _jsx(FormInput, { label: "Short Name", required: true, value: form.shortName, onChange: (e) => update('shortName', e.target.value), placeholder: "kg" }), _jsx(FormSelect, { label: "Type", value: form.type, onChange: (e) => update('type', e.target.value), options: [
                            { label: 'General', value: 'general' }, { label: 'Weight', value: 'weight' },
                            { label: 'Volume', value: 'volume' }, { label: 'Length', value: 'length' },
                            { label: 'Area', value: 'area' }, { label: 'Count', value: 'count' },
                        ] })] })),
        },
    ];
    return (_jsx(CreateEditPage, { title: "Unit", description: "Define measurement units for items and commodities", module: "Units", sections: sections, isEditing: isEditing, loading: loading, submitting: submitting, error: error, onSave: handleSave, onCancel: () => navigate('/units') }));
}
//# sourceMappingURL=unit-form.js.map