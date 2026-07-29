interface Transaction {
    id: string;
    type: 'sales' | 'purchase';
    reference: string;
    party: string;
    amount: number;
    date: string | null;
    status: string;
}
interface RecentTransactionsProps {
    transactions: Transaction[];
}
export declare function RecentTransactions({ transactions }: RecentTransactionsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=RecentTransactions.d.ts.map