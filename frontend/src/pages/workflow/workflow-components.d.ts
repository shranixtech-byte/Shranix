interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}
export declare function WorkflowStatusBadge({ status, size, showLabel }: StatusBadgeProps): import("react").JSX.Element;
interface ProgressIndicatorProps {
    currentState: string;
    steps?: string[];
    size?: 'sm' | 'md';
}
export declare function WorkflowProgressIndicator({ currentState, steps, size }: ProgressIndicatorProps): import("react").JSX.Element;
interface SummaryCardProps {
    workflowInstanceId?: string;
    documentType?: string;
    documentId?: string;
    onViewDetails?: () => void;
}
export declare function WorkflowSummaryCard({ workflowInstanceId, documentType, documentId, onViewDetails }: SummaryCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=workflow-components.d.ts.map