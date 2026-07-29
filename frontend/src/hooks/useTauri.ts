import { useEffect, useState, useCallback } from 'react';

interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
}

export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    setIsTauri(isTauriEnv);

    if (isTauriEnv) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke('get_app_info') as Promise<AppInfo>)
        .then(setAppInfo)
        .catch(() => {});
    }
  }, []);

  const minimizeToTray = useCallback(async () => {
    if (!isTauri) {return;}
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('minimize_to_tray');
  }, [isTauri]);

  const toggleWindowVisibility = useCallback(async () => {
    if (!isTauri) {return;}
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('toggle_window_visibility') as Promise<boolean>;
  }, [isTauri]);

  const showNotification = useCallback(
    async (title: string, body: string) => {
      if (!isTauri) {return;}
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_notification', { title, body });
    },
    [isTauri],
  );

  const getAppDataDir = useCallback(async () => {
    if (!isTauri) {return null;}
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_app_data_dir') as Promise<string>;
  }, [isTauri]);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri) {return;}
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('check_for_updates');
  }, [isTauri]);

  const listen = useCallback(
    (event: string, handler: (payload: unknown) => void) => {
      if (!isTauri) {return () => {};}
      let unlisten: (() => void) | undefined;

      import('@tauri-apps/api/event')
        .then(({ listen: tauriListen }) => {
          tauriListen(event, (eventData) => {
            handler(eventData.payload);
          }).then((fn: () => void) => {
            unlisten = fn;
          });
        })
        .catch(() => {});

      return () => {
        unlisten?.();
      };
    },
    [isTauri],
  );

  return {
    isTauri,
    appInfo,
    minimizeToTray,
    toggleWindowVisibility,
    showNotification,
    getAppDataDir,
    checkForUpdates,
    listen,
  };
}
