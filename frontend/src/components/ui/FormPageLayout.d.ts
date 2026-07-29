import type { ReactNode } from 'react';
export interface FormAction {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    icon?: ReactNode;
    onClick: () => void;
}
export interface FormPageLayoutProps {
    title: string;
    description?: string;
    breadcrumbs?: Array<{
        label: string;
        path?: string;
    }>;
    actions?: FormAction[];
    children: ReactNode;
    className?: string;
    size?: 'default' | 'full';
}
export declare function FormPageLayout({ title, description, breadcrumbs, actions, children, className, size, }: FormPageLayoutProps): import("react").JSX.Element;
//# sourceMappingURL=FormPageLayout.d.ts.map