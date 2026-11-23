"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { listNotifications, readAllNotifications, readNotification } from "@/shared/notifications/actions";
import { noticeTime, safeHref, type NotificationItem, type NotificationList } from "./types";

const POLL_MS = 180_000;
// Returning to the tab or opening the bell refreshes only when the list is
// older than this, so quick tab switches do not each cost a server round trip.
const STALE_MS = 30_000;

/**
 * One notification store per browser tab, shared by every bell and panel on
 * the page. Previously each mounted component polled on its own (two pollers
 * on the dashboard and overview pages) and the bell refetched data the server
 * had just rendered.
 */
type Store = { list: NotificationList | null; error: string; loading: boolean; at: number };
let store: Store = { list: null, error: "", loading: false, at: 0 };
const listeners = new Set<() => void>();
const emit = (patch: Partial<Store>) => {
  store = { ...store, ...patch };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => store;
let inflight: Promise<void> | null = null;
function load(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && store.list && Date.now() - store.at < STALE_MS) return Promise.resolve();
  if (!store.list) emit({ loading: true });
  inflight = listNotifications()
    .then((result) => {
      if (result.ok) emit({ list: result.data, error: "", loading: false, at: Date.now() });
      else emit({ error: result.error, loading: false });
    })
    .catch(() => emit({ loading: false, error: "Notifications are unavailable right now." }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
let pollers = 0;
let timer: number | undefined;
const onVisible = () => {
  if (document.visibilityState === "visible") void load();
};
function startPolling() {
  if (pollers++ > 0) return;
  timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void load(true);
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
}
function stopPolling() {
  if (--pollers > 0) return;
  window.clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
}

/**
 * Unread notifications for the signed-in account. Marking an item as read
 * removes it at once and restores it if the server rejects the change.
 */
function useNotifications(initial: NotificationList | null, eager: boolean) {
  const shared = useSyncExternalStore(subscribe, snapshot, snapshot);
  const seeded = useRef(false);
  useEffect(() => {
    // Server-rendered data is the freshest copy: share it instead of refetching.
    let deferred: number | undefined;
    if (initial && !seeded.current) {
      seeded.current = true;
      emit({ list: initial, error: "", loading: false, at: Date.now() });
    }
    // Deferred so a server-seeded panel mounting in the same commit fills the
    // store first; load() then sees fresh data and skips the request.
    else if (eager) deferred = window.setTimeout(() => void load(), 0);
    startPolling();
    return () => {
      window.clearTimeout(deferred);
      stopPolling();
    };
  }, [eager, initial]);
  const list = shared.list ?? initial;
  const loading = !list && (shared.loading || eager);
  const refresh = useCallback((force = true) => load(force), []);
  const markRead = async (item: NotificationItem) => {
    const before = store.list;
    if (before)
      emit({ list: { ...before, unread: Math.max(0, before.unread - 1), rows: before.rows.filter((row) => row.id !== item.id) } });
    const result = await readNotification(item.id, item.source);
    if (!result.ok) emit({ list: before, error: result.error });
  };
  const markAll = async () => {
    const before = store.list;
    if (before) emit({ list: { ...before, unread: 0, rows: [] } });
    const result = await readAllNotifications();
    if (!result.ok) emit({ list: before, error: result.error });
  };
  return { list, error: shared.error, loading, refresh, markRead, markAll };
}

function Items({ rows, onRead, onNavigate }: { rows: NotificationItem[]; onRead: (item: NotificationItem) => void; onNavigate?: () => void }) {
  return (
    <ul className="dsu-notices-list">
      {rows.map((item) => {
        const href = safeHref(item.href);
        return (
          <li key={`${item.source}-${item.id}`}>
            <div className="dsu-notice-text">
              {href ? (
                <Link href={href} onClick={onNavigate}>
                  {item.title}
                </Link>
              ) : (
                <strong>{item.title}</strong>
              )}
              {item.body && <p>{item.body}</p>}
              <time dateTime={item.created_at}>{noticeTime(item.created_at)}</time>
            </div>
            <button type="button" className="dsu-notice-read" onClick={() => onRead(item)} aria-label={`Mark "${item.title}" as read`}>
              <Check size={14} aria-hidden="true" />
              <span>Mark as read</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The dashboard "Notifications" column. */
export function NotificationsPanel({
  initial,
  title = "Notifications",
  empty = "You are all caught up. New notifications will appear here.",
  className = "",
}: {
  initial: NotificationList | null;
  title?: string;
  empty?: string;
  className?: string;
}) {
  const { list, error, loading, refresh, markRead, markAll } = useNotifications(initial, true);
  const rows = list?.rows ?? [];
  return (
    <section className={`dsu-notices ${className}`} aria-labelledby="dsu-notices-title" aria-busy={loading || undefined}>
      <header>
        <h2 id="dsu-notices-title">
          {title}
          {list && list.unread > 0 && <span className="dsu-notices-count">{list.unread}</span>}
        </h2>
        {rows.length > 1 && (
          <button type="button" className="dsu-notices-all" onClick={() => void markAll()}>
            <CheckCheck size={14} aria-hidden="true" />
            Mark all as read
          </button>
        )}
      </header>
      {loading ? (
        <p className="dsu-notices-quiet" role="status">Loading notifications…</p>
      ) : error && !rows.length ? (
        <p className="dsu-notices-quiet" role="alert">
          {error}{" "}
          <button type="button" className="dsu-notices-retry" onClick={() => void refresh()}>
            Try again
          </button>
        </p>
      ) : rows.length ? (
        <>
          {error && <p className="dsu-notices-error" role="alert">{error}</p>}
          <Items rows={rows} onRead={(item) => void markRead(item)} />
          {list && list.unread > rows.length && (
            <p className="dsu-notices-quiet">Showing the latest {rows.length} of {list.unread}.</p>
          )}
        </>
      ) : (
        <p className="dsu-notices-quiet">{empty}</p>
      )}
    </section>
  );
}

/** Top-bar bell with the unread count and the same list. */
export function NotificationBell({ className = "", popoverClassName = "" }: { className?: string; popoverClassName?: string }) {
  const { list, error, loading, refresh, markRead, markAll } = useNotifications(null, true);
  const details = useRef<HTMLDetailsElement>(null);
  const rows = list?.rows ?? [];
  const unread = list?.unread ?? 0;
  return (
    <details
      ref={details}
      className={`dsu-bell ${className}`}
      onToggle={(event) => {
        if (event.currentTarget.open) void refresh(false);
      }}
    >
      <summary aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && <span className="dsu-bell-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </summary>
      <div className={`dsu-bell-popover ${popoverClassName}`}>
        <div className="dsu-bell-heading">
          <h3>Notifications</h3>
          {rows.length > 1 && (
            <button type="button" className="dsu-notices-all" onClick={() => void markAll()}>
              <CheckCheck size={14} aria-hidden="true" />
              Mark all as read
            </button>
          )}
        </div>
        {loading && !list ? (
          <p className="dsu-notices-quiet" role="status">Loading notifications…</p>
        ) : error && !rows.length ? (
          <p className="dsu-notices-quiet" role="alert">{error}</p>
        ) : rows.length ? (
          <Items rows={rows} onRead={(item) => void markRead(item)} onNavigate={() => details.current?.removeAttribute("open")} />
        ) : (
          <p className="dsu-notices-quiet">You are all caught up.</p>
        )}
      </div>
    </details>
  );
}
