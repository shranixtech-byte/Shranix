interface LowStockItem {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
}
interface LowStockWidgetProps {
    lowStock: LowStockItem[];
    lowStockCount: number;
}
export declare function LowStockWidget({ lowStock, lowStockCount }: LowStockWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=LowStockWidget.d.ts.map