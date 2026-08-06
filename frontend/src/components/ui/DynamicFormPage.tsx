import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { FormField } from '@/pages/masters/master-data-page';
import { apiRequest } from '@/services/api-client';

import { CreateEditPage, type FormSection } from './CreateEditPage';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormTextarea } from './FormTextarea';

export interface DynamicOptionSource {
  field: string;
  apiPath: string;
  labelKey?: string;
  valueKey?: string;
}

export interface DynamicFormPageProps {
  title: string;
  description: string;
  apiPath: string;
  formFields: FormField[];
  module: string;
  listPath: string;
  sectionSize?: number;
  /** Optional async defaults loader (e.g. prefill from /finance/settings).
   *  Returned keys that match a form field name are applied as initial values. */
  defaultsLoader?: () => Promise<Record<string, unknown>>;
  /** Optional banner rendered above the form (e.g. default ledger/tax hint). */
  banner?: React.ReactNode;
  /** Optional runtime-loaded select options (e.g. branches from /branches). */
  dynamicOptions?: DynamicOptionSource[];
}

export function DynamicFormPage({
  title,
  description,
  apiPath,
  formFields,
  module,
  listPath,
  defaultsLoader,
  banner,
  dynamicOptions,
}: DynamicFormPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [extraOptions, setExtraOptions] = useState<
    Record<string, { label: string; value: string }[]>
  >({});

  // ── Load runtime select options (e.g. branches) ──────────────
  useEffect(() => {
    if (!dynamicOptions?.length) {
      return;
    }
    let cancelled = false;
    (async () => {
      const out: Record<string, { label: string; value: string }[]> = {};
      for (const src of dynamicOptions) {
        try {
          const res = await apiRequest<any>(`${src.apiPath}?pageSize=200`);
          const body =
            res?.data && typeof res.data === 'object' && 'data' in res.data
              ? (res.data as any).data
              : res?.data;
          const rows = Array.isArray(body) ? body : Array.isArray(res) ? res : [];
          out[src.field] = rows.map((r: Record<string, unknown>) => ({
            label: String(r[src.labelKey || 'name'] ?? r.id ?? ''),
            value: String(r[src.valueKey || 'id'] ?? ''),
          }));
        } catch {
          out[src.field] = [];
        }
      }
      if (!cancelled) {
        setExtraOptions(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dynamicOptions]);

  // ── Init form with defaults (plus optional async settings defaults) ──
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    formFields.forEach((f) => {
      if (f.type === 'boolean') {
        defaults[f.name] = false;
      } else if (f.type === 'number') {
        defaults[f.name] = 0;
      } else {
        defaults[f.name] = '';
      }
    });
    setForm(defaults);
    if (defaultsLoader && !isEditing) {
      defaultsLoader()
        .then((extra) => {
          if (!extra || typeof extra !== 'object') {
            return;
          }
          const fieldNames = new Set(formFields.map((f) => f.name));
          setForm((prev) => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(extra)) {
              // Skip keys the user already edited (value diverged from the empty default)
              if (
                fieldNames.has(k) &&
                v !== undefined &&
                v !== null &&
                (prev[k] === undefined || prev[k] === '' || prev[k] === 0 || prev[k] === false)
              ) {
                merged[k] = v;
              }
            }
            return merged;
          });
        })
        .catch(() => {
          // Defaults are a convenience — never block the form on their failure
        });
    }
  }, [formFields, defaultsLoader, isEditing]);

  // ── Load existing record if editing ──────────────────
  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<Record<string, unknown>>(`${apiPath}/${id}`)
        .then((data) => {
          if (data && typeof data === 'object') {
            setForm((prev) => ({ ...prev, ...data }) as Record<string, unknown>);
          }
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id, apiPath]);

  const update = useCallback((name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`${apiPath}/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest(apiPath, { method: 'POST', body: JSON.stringify(form) });
      }
      navigate(listPath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, apiPath, navigate, listPath]);

  // ── Split fields into sections ──────────────────────
  const sections: FormSection[] = [];
  const fieldCount = formFields.length;
  const half = Math.ceil(fieldCount / 2);

  // Section 1: first half of fields
  const firstHalf = formFields.slice(0, half);
  const secondHalf = formFields.slice(half);

  if (firstHalf.length > 0) {
    sections.push({
      title: `${title} Details`,
      description: 'Basic information',
      fields: (
        <DynamicFields fields={firstHalf} form={form} update={update} extraOptions={extraOptions} />
      ),
    });
  }

  if (secondHalf.length > 0) {
    sections.push({
      title: 'Additional Information',
      description: 'Extended details',
      fields: (
        <DynamicFields
          fields={secondHalf}
          form={form}
          update={update}
          extraOptions={extraOptions}
        />
      ),
    });
  }

  return (
    <div className="space-y-4">
      {banner && <div>{banner}</div>}
      <CreateEditPage
        title={title}
        description={description}
        module={module}
        listPath={listPath}
        sections={sections}
        isEditing={isEditing}
        loading={loading}
        submitting={submitting}
        error={error}
        onSave={handleSave}
        onCancel={() => navigate(listPath)}
      />
    </div>
  );
}

// ── Dynamic field renderer ──────────────────────────────
function DynamicFields({
  fields,
  form,
  update,
  extraOptions,
}: {
  fields: FormField[];
  form: Record<string, unknown>;
  update: (name: string, value: unknown) => void;
  extraOptions: Record<string, { label: string; value: string }[]>;
}) {
  return (
    <>
      {fields.map((field) => {
        const value = form[field.name];
        const key = field.name;

        if (field.type === 'textarea') {
          return (
            <FormTextarea
              key={key}
              label={field.label}
              required={field.required}
              placeholder={field.placeholder}
              value={String(value ?? '')}
              onChange={(e) => update(field.name, e.target.value)}
            />
          );
        }

        if (field.type === 'select') {
          const options = field.options || extraOptions[field.name] || [];
          return (
            <FormSelect
              key={key}
              label={field.label}
              required={field.required}
              placeholder={field.placeholder || 'Select...'}
              value={String(value ?? '')}
              onChange={(e) => update(field.name, e.target.value)}
              options={options}
            />
          );
        }

        if (field.type === 'boolean') {
          return (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => update(field.name, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {field.label}
                </p>
                <p className="text-xs text-slate-500">
                  {field.placeholder || `Toggle ${field.label.toLowerCase()}`}
                </p>
              </div>
            </label>
          );
        }

        return (
          <FormInput
            key={key}
            label={field.label}
            required={field.required}
            placeholder={field.placeholder}
            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
            value={field.type === 'number' ? String(value ?? 0) : String(value ?? '')}
            onChange={(e) =>
              update(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
            }
          />
        );
      })}
    </>
  );
}
