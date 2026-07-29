export interface ColumnDef {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}
export interface MasterDataPageProps {
    title: string;
    description?: string;
    columns: ColumnDef[];
    apiPath: string;
    formFields: FormField[];
    basePath?: string;
}
export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'textarea' | 'select' | 'boolean' | 'number' | 'date';
    required?: boolean;
    options?: {
        label: string;
        value: string;
    }[];
    placeholder?: string;
}
export declare function MasterDataPage({ title, description, columns, apiPath, formFields: _formFields, basePath }: MasterDataPageProps): import("react").JSX.Element;
//# sourceMappingURL=master-data-page.d.ts.map