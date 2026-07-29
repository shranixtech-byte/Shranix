import type { ReactNode } from 'react';
export interface FormCardProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    actions?: ReactNode;
}
export declare function FormCard({ title, description, children, className, actions }: FormCardProps): import("react").JSX.Element;
//# sourceMappingURL=FormCard.d.ts.map