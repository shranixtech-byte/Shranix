import type { FormField } from '@/pages/masters/master-data-page';
export interface DynamicFormPageProps {
    title: string;
    description: string;
    apiPath: string;
    formFields: FormField[];
    module: string;
    listPath: string;
    sectionSize?: number;
}
export declare function DynamicFormPage({ title, description, apiPath, formFields, module, listPath, }: DynamicFormPageProps): import("react").JSX.Element;
//# sourceMappingURL=DynamicFormPage.d.ts.map