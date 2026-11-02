"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { listNotifications, readAllNotifications, readNotification } from "@/shared/notifications/actions";
import { noticeTime, safeHref, type NotificationItem, type NotificationList } from "./types";

const POLL_MS = 60000;

/**
 * Unread notifications for the signed-in account. Refreshes every minute
 * while the tab is visible. Marking an item as read removes it at once and
 * restores it if the server rejects the change.
 */
function useNotifications(initial: NotificationList | null, eager: boolean) {
  const [list, setList] = useState<NotificationList | null>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initial && eager);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const result = await listNotifications();
    busy.current = false;
    setLoading(false);
    if (result.ok) {
      setList(result.data);
      setError("");
    } else setError(result.error);
  }, []);
  useEffect(() => {
    if (eager && !initial) void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [eager, initial, refresh]);
  const markRead = async (item: NotificationItem) => {
    const before = list;
    setList((current) =>
      current ? { ...current, unread: Math.max(0, current.unread - 1), rows: current.rows.filter((row) => row.id !== item.id) } : current,
    );
    const result = await readNotification(item.id, item.source);
    if (!result.ok) {
      setList(before);
      setError(result.error);
    }
  };
  const markAll = async () => {
    const before = list;
    setList((current) => (current ? { ...current, unread: 0, rows: [] } : current));
    const result = await readAllNotifications();
    if (!result.ok) {
      setList(before);
      setError(result.error);
    }
  };
  return { list, error, loading, refresh, markRead, markAll };
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
        if (event.currentTarget.open) void refresh();
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
