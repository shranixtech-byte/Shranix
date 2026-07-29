interface AppInfo {
    name: string;
    version: string;
    platform: string;
    arch: string;
}
export declare function useTauri(): {
    isTauri: boolean;
    appInfo: AppInfo | null;
    minimizeToTray: () => Promise<void>;
    toggleWindowVisibility: () => Promise<boolean | undefined>;
    showNotification: (title: string, body: string) => Promise<void>;
    getAppDataDir: () => Promise<string | null>;
    checkForUpdates: () => Promise<unknown>;
    listen: (event: string, handler: (payload: unknown) => void) => () => void;
};
export {};
//# sourceMappingURL=useTauri.d.ts.map