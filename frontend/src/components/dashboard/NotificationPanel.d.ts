interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string | null;
}
interface NotificationPanelProps {
    notifications: Notification[];
    viewAllPath?: string;
}
export declare function NotificationPanel({ notifications, viewAllPath }: NotificationPanelProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=NotificationPanel.d.ts.map