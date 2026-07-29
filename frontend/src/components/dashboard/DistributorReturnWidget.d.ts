interface ReturnItem {
    id: string;
    reference: string;
    party: string;
    amount: number;
    status: string;
    type: 'sales_return' | 'purchase_return';
}
interface DistributorReturnWidgetProps {
    returns?: ReturnItem[];
    totalPending?: number;
}
export declare function DistributorReturnWidget({ returns, totalPending }: DistributorReturnWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=DistributorReturnWidget.d.ts.map