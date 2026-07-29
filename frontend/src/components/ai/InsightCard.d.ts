import React from 'react';
export interface Insight {
    id: string;
    type: 'positive' | 'negative' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    confidence: number;
    actionLabel?: string;
    actionPath?: string;
}
interface InsightCardProps {
    insight: Insight;
}
export declare const InsightCard: React.FC<InsightCardProps>;
export {};
//# sourceMappingURL=InsightCard.d.ts.map