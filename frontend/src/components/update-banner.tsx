import { useEffect, useState } from 'react';

import { getUpdateInfo } from '@/services/activation.service';

interface UpdateInfo {
  latestVersion?: string | null;
  updateUrl?: string;
  updateAvailable: boolean;
}

/**
 * Checks the server update channel once per session and shows a dismissible
 * banner when a newer version is available. Purely informational — updates are
 * delivered by the platform updater (Tauri), never by downloading arbitrary
 * executables from this banner.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const currentVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined;
    void getUpdateInfo(currentVersion)
      .then((res) => {
        if (!cancelled) {
          setInfo({
            latestVersion: res.latestVersion,
            updateUrl: res.updateUrl,
            updateAvailable: Boolean(res.updateAvailable),
          });
        }
      })
      .catch(() => {
        /* offline/silent — banner simply never shows */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info?.updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-200/60 bg-amber-50 px-5 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <p className="flex-1">
        A new version of SHRANIX ({info.latestVersion}) is available.
        {info.updateUrl ? (
          <a
            href={info.updateUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
          >
            Download update
          </a>
        ) : (
          <span className="ml-1 font-semibold">Please update from the installer.</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notice"
        className="rounded-md px-2 py-1 text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20"
      >
        ✕
      </button>
    </div>
  );
}
