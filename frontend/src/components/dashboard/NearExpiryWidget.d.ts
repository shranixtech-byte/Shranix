interface ExpiryItem {
    id: string;
    name: string;
    sku: string;
    expiryDate: string | null;
    currentStock: number;
}
interface NearExpiryWidgetProps {
    items?: ExpiryItem[];
}
export declare function NearExpiryWidget({ items }: NearExpiryWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=NearExpiryWidget.d.ts.map