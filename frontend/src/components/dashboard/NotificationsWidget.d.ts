interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string | null;
}
interface NotificationsWidgetProps {
    notifications: NotificationItem[];
}
export declare function NotificationsWidget({ notifications }: NotificationsWidgetProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=NotificationsWidget.d.ts.map