import { ArrowLeft, Save, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { Breadcrumb } from './Breadcrumb';
import { Button } from './Button';
import { FormCard } from './FormCard';

export interface FormSection {
  title: string;
  description?: string;
  fields: ReactNode;
  className?: string;
}

export interface CreateEditPageProps {
  title: string;
  description?: string;
  module: string;
  listPath?: string;
  sections: FormSection[];
  isEditing?: boolean;
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
  onSave: () => void;
  onSaveDraft?: () => void;
  onSaveNew?: () => void;
  onCancel?: () => void;
  showDraft?: boolean;
  showSaveNew?: boolean;
}

export function CreateEditPage({
  title,
  description,
  module,
  listPath,
  sections,
  isEditing,
  loading,
  submitting,
  error,
  onSave,
  onSaveDraft,
  onSaveNew,
  onCancel,
  showDraft = false,
  showSaveNew = false,
}: CreateEditPageProps) {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', path: '/' },
    { label: module, path: listPath || `/${module.toLowerCase().replace(/\s+/g, '-')}` },
    { label: isEditing ? `Edit ${title}` : `Create ${title}` },
  ];

  const handleCancel = onCancel || (() => navigate(-1));

  if (loading) {
    return (
      <div className="animate-in fade-in space-y-6 duration-300">
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center justify-between">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="flex gap-3">
              <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((f) => (
                  <div
                    key={f}
                    className="h-[42px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isEditing ? `Edit ${title}` : `Create ${title}`}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="secondary" onClick={handleCancel} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          {showDraft && onSaveDraft && (
            <Button variant="outline" loading={submitting} onClick={onSaveDraft}>
              Save Draft
            </Button>
          )}
          {showSaveNew && onSaveNew && (
            <Button variant="secondary" loading={submitting} onClick={onSaveNew}>
              Save & New
            </Button>
          )}
          <Button
            variant="primary"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
            onClick={onSave}
          >
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Form Sections in 2-column grid (32px gap per spec) */}
      <div className="grid gap-8 md:grid-cols-2">
        {sections.map((section, idx) => (
          <FormCard
            key={idx}
            title={section.title}
            description={section.description}
            className={section.className}
          >
            <div className={cn('space-y-4', section.className)}>{section.fields}</div>
          </FormCard>
        ))}
      </div>
    </div>
  );
}
