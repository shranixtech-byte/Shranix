import type { ReactNode } from 'react';
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
export declare function CreateEditPage({ title, description, module, listPath, sections, isEditing, loading, submitting, error, onSave, onSaveDraft, onSaveNew, onCancel, showDraft, showSaveNew, }: CreateEditPageProps): import("react").JSX.Element;
//# sourceMappingURL=CreateEditPage.d.ts.map