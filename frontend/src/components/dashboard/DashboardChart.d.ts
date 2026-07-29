interface ChartSeries {
    key: string;
    name: string;
    color: string;
}
interface DashboardChartProps {
    title: string;
    subtitle?: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    type?: 'bar' | 'area';
    height?: number;
    legend?: boolean;
    grid?: boolean;
    formatValue?: (value: number) => string;
}
export declare function DashboardChart({ title, subtitle, data, series, type, height, legend, grid, formatValue, }: DashboardChartProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=DashboardChart.d.ts.map