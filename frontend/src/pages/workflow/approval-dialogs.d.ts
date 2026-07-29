interface ApprovalDialogsProps {
    instanceId: string;
    documentType?: string;
    documentNumber?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    onComplete?: () => void;
}
export declare function ApproveDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }: ApprovalDialogsProps): import("react").JSX.Element;
export declare function RejectDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }: ApprovalDialogsProps): import("react").JSX.Element;
export declare function ReturnDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }: ApprovalDialogsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=approval-dialogs.d.ts.map