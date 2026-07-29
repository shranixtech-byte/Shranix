interface ProductData {
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
}
interface TopProductsProps {
    products: ProductData[];
}
export declare function TopProducts({ products }: TopProductsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TopProducts.d.ts.map