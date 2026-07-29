interface Insight {
    type: 'positive' | 'warning' | 'info';
    title: string;
    description: string;
    actionPath: string;
}
interface AIBusinessSummaryProps {
    insights: Insight[];
    lowStockCount: number;
    pendingApprovalsCount: number;
    revenueChange: number | null;
}
export declare function AIBusinessSummary({ insights, lowStockCount, pendingApprovalsCount, revenueChange, }: AIBusinessSummaryProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=AIBusinessSummary.d.ts.map