import React from 'react';
export interface ForecastPoint {
    period: string;
    actual?: number;
    predicted: number;
    lowerBound?: number;
    upperBound?: number;
}
interface ForecastWidgetProps {
    title: string;
    metric: string;
    unit: string;
    currentValue: number;
    forecastValue: number;
    changePercent: number;
    data: ForecastPoint[];
}
export declare const ForecastWidget: React.FC<ForecastWidgetProps>;
export {};
//# sourceMappingURL=ForecastWidget.d.ts.map