interface Column {
    key: string;
    label: string;
    render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}
interface ActivityTableProps {
    title: string;
    subtitle?: string;
    columns: Column[];
    data: Record<string, unknown>[];
    emptyMessage?: string;
    viewAllPath?: string;
    variant?: 'sales' | 'purchase';
}
export declare function ActivityTable({ title, subtitle, columns, data, emptyMessage, viewAllPath, variant, }: ActivityTableProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ActivityTable.d.ts.map