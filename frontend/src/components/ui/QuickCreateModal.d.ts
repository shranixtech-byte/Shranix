import { type ReactNode } from 'react';
export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';
export interface QuickCreateModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    title: string;
    size?: ModalSize;
    children: ReactNode;
    className?: string;
}
export declare function QuickCreateModal({ open, onClose, title, size, children, className, onSuccess: _onSuccess, }: QuickCreateModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=QuickCreateModal.d.ts.map