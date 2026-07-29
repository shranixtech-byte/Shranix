import { type LucideIcon } from 'lucide-react';
interface QuickAction {
    label: string;
    path: string;
    icon: LucideIcon;
    description?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning';
}
interface QuickActionCardProps {
    actions: QuickAction[];
    columns?: 2 | 3 | 4;
}
export declare function QuickActionCard({ actions, columns }: QuickActionCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=QuickActionCard.d.ts.map