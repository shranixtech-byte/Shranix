interface AIInsight {
    type: 'positive' | 'warning' | 'info' | 'tip';
    title: string;
    description: string;
    action?: string;
}
interface AIInsightCardProps {
    insights: AIInsight[];
}
export declare function AIInsightCard({ insights }: AIInsightCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=AIInsightCard.d.ts.map