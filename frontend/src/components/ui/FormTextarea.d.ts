import { type TextareaHTMLAttributes } from 'react';
export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}
export declare const FormTextarea: import("react").ForwardRefExoticComponent<FormTextareaProps & import("react").RefAttributes<HTMLTextAreaElement>>;
//# sourceMappingURL=FormTextarea.d.ts.map