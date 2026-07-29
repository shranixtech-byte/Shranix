interface Receivable {
    id: string;
    reference: string;
    party: string;
    amount: number;
    date: string | null;
    status: string;
}
interface PendingReceivablesWidgetProps {
    receivables?: Receivable[];
    totalOverdue?: number;
}
export declare function PendingReceivablesWidget({ receivables, totalOverdue }: PendingReceivablesWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PendingReceivablesWidget.d.ts.map