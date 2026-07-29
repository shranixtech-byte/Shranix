interface Payable {
    id: string;
    reference: string;
    party: string;
    amount: number;
    date: string | null;
    status: string;
}
interface PendingPayablesWidgetProps {
    payables?: Payable[];
    totalUnpaid?: number;
}
export declare function PendingPayablesWidget({ payables, totalUnpaid }: PendingPayablesWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PendingPayablesWidget.d.ts.map