import { type LucideIcon } from 'lucide-react';
export declare function AnimatedValue({ value, duration, prefix, suffix, className }: {
    value: string | number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}): import("react").JSX.Element;
export declare function AnimatedScore({ value, suffix, className }: {
    value: number;
    suffix?: string;
    className?: string;
}): import("react").JSX.Element;
interface KPICardProps {
    title: string;
    value: string | React.ReactNode;
    change: number | null;
    icon: LucideIcon;
    iconColor?: string;
    subtitle?: string;
    trend?: number[];
    onClick?: () => void;
    variant?: string;
    format?: string;
    iconGradient?: string;
}
export declare function KPICard({ title, value, change, icon: Icon, iconColor: _iconColor, iconGradient, subtitle, trend, onClick, }: KPICardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=KPICard.d.ts.map