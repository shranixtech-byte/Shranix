interface TaskItem {
    id: string;
    title: string;
    documentType: string;
    dueDate: string | null;
    priority: string;
}
interface TodayTasksProps {
    tasks: TaskItem[];
}
export declare function TodayTasks({ tasks }: TodayTasksProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TodayTasks.d.ts.map