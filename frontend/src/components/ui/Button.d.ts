import { type ButtonHTMLAttributes, type ReactNode } from 'react';
declare const variants: {
    readonly primary: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm border-transparent";
    readonly secondary: "bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:border-slate-700";
    readonly danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm border-transparent";
    readonly ghost: "bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700";
    readonly outline: "bg-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100 border-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-600";
};
declare const sizes: {
    readonly sm: "h-8 px-3 text-xs gap-1.5";
    readonly md: "h-10 px-4 text-sm gap-2";
    readonly lg: "h-12 px-6 text-base gap-2.5";
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    loading?: boolean;
    icon?: ReactNode;
}
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export {};
//# sourceMappingURL=Button.d.ts.map