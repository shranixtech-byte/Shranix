import { type SelectHTMLAttributes } from 'react';
export interface FormSelectOption {
    label: string;
    value: string;
}
export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: FormSelectOption[];
    placeholder?: string;
    quickCreate?: boolean;
    onQuickCreate?: () => void;
}
export declare const FormSelect: import("react").ForwardRefExoticComponent<FormSelectProps & import("react").RefAttributes<HTMLSelectElement>>;
//# sourceMappingURL=FormSelect.d.ts.map