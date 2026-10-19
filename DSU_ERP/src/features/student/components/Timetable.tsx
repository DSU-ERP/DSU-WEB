"use client";
import { useRef, useState } from "react";
import { studentFetch } from "../lib/client";
import { PageTitle, Panel, Empty, ErrorNote, DateLabel } from "./UI";
export type CalendarEvent = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  description: string | null;
  user_id: string | null;
};
import { weekStart } from "../lib/calendar";
export function Timetable({ initial }: { initial: CalendarEvent[] }) {
  const [events, setEvents] = useState(initial),
    [offset, setOffset] = useState(0),
    [view, setView] = useState("week"),
    [showForm, setShowForm] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const request = useRef(0);
  const load = async (next = offset) => {
    const start = weekStart(next),
      end = new Date(start),
      token = ++request.current;
    end.setTime(end.getTime() + 7 * 86400000);
    setOffset(next);
    try {
      const loaded = await studentFetch<CalendarEvent[]>(
        "calendar?" +
          new URLSearchParams({
            from: start.toISOString(),
            to: end.toISOString(),
          }),
      );
      // A slower response for a week no longer on screen must not win.
      if (token === request.current) setEvents(loaded);
    } catch (e) {
      if (token === request.current) setError((e as Error).message);
    }
  };
  const save = async (form: FormData) => {
    setBusy(true);
    setError("");
    try {
      await studentFetch("calendar", {
        method: "POST",
        body: {
          title: String(form.get("title")),
          kind: String(form.get("kind")),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
          location: String(form.get("location") || ""),
          description: String(form.get("description") || ""),
        },
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Remove this personal calendar event?")) return;
    try {
      await studentFetch(`calendar/${id}/delete`, { method: "POST", body: {} });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const exportCalendar = () => {
    const esc = (value: string) =>
      value
        .replaceAll("\\", "\\\\")
        .replaceAll("\n", "\\n")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;");
    const stamp = (value: string) =>
      new Date(value)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DSU//Student Calendar//EN",
      ...events.flatMap((event) => [
        "BEGIN:VEVENT",
        `UID:${event.id}@dsu-calendar`,
        `DTSTAMP:${stamp(new Date().toISOString())}`,
        `DTSTART:${stamp(event.starts_at)}`,
        `DTEND:${stamp(event.ends_at)}`,
        `SUMMARY:${esc(event.title)}`,
        `LOCATION:${esc(event.location || "")}`,
        `DESCRIPTION:${esc(event.description || "")}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dsu-calendar.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const start = weekStart(offset);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setTime(start.getTime() + index * 86400000);
    return date;
  });
  return (
    <>
      <PageTitle
        title="Make room for what matters."
        description="Your published campus events and personal preparation, in one useful week."
        action={
          <div className="st-actions">
            <button
              className="st-button st-button-secondary"
              onClick={exportCalendar}
              disabled={!events.length}
            >
              Export calendar (.ics) ↗
            </button>
            <button
              className="st-button"
              onClick={() => setShowForm(!showForm)}
            >
              Add preparation time +
            </button>
          </div>
        }
      />
      <ErrorNote message={error} />
      {showForm && (
        <Panel title="Plan a focused session">
          <form className="st-form" action={(form) => void save(form)}>
            <div className="st-form-grid">
              <label>
                Title
                <input name="title" required minLength={2} maxLength={200} />
              </label>
              <label>
                Type
                <select name="kind">
                  {["practice", "interview", "mentoring", "other"].map(
                    (kind) => (
                      <option key={kind}>{kind}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Starts
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Ends
                <input name="endsAt" type="datetime-local" required />
              </label>
              <label>
                Location
                <input name="location" maxLength={200} />
              </label>
            </div>
            <label>
              Notes
              <textarea name="description" maxLength={3000} />
            </label>
            <button className="st-button" disabled={busy}>
              {busy ? "Saving…" : "Save event"}
            </button>
          </form>
        </Panel>
      )}
      <Panel>
        <div className="st-calendar-controls">
          <div className="st-actions">
            <button
              className="st-button st-button-secondary"
              onClick={() => void load(offset - 1)}
            >
              ← Previous week
            </button>
            <button
              className="st-button st-button-secondary"
              onClick={() => void load(0)}
            >
              Today
            </button>
            <button
              className="st-button st-button-secondary"
              onClick={() => void load(offset + 1)}
            >
              Next week →
            </button>
          </div>
          <div className="st-tabs">
            <button
              aria-selected={view === "week"}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              aria-selected={view === "list"}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        </div>
        <p className="st-muted" style={{ marginBottom: 20 }}>
          Week of{" "}
          {start.toLocaleDateString("en-IN", {
            month: "long",
            day: "numeric",
            timeZone: "Asia/Kolkata",
          })}{" "}
          · Event times are displayed in Asia/Kolkata.
        </p>
        {!events.length && (
          <Empty title="A week of possibilities.">
            No events have been scheduled here. Add a personal preparation
            session or wait for your placement office’s published timetable.
          </Empty>
        )}
        {view === "week"
          ? days.map((day) => {
              const key = day.toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata",
              });
              return (
                <div className="st-calendar-day" key={key}>
                  <div>
                    <strong>
                      {day.toLocaleDateString("en-IN", {
                        weekday: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </strong>
                    <small>
                      {day.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                  </div>
                  <div>
                    {events
                      .filter(
                        (event) =>
                          new Date(event.starts_at).toLocaleDateString(
                            "en-CA",
                            { timeZone: "Asia/Kolkata" },
                          ) === key,
                      )
                      .map((event) => (
                        <article className="st-calendar-event" key={event.id}>
                          <span className="st-tag">{event.kind}</span>
                          <h3>{event.title}</h3>
                          <small>
                            <DateLabel value={event.starts_at} />
                          </small>
                          {event.location && <p>{event.location}</p>}
                          {event.user_id && (
                            <button
                              className="st-muted"
                              onClick={() => void remove(event.id)}
                            >
                              Remove personal event
                            </button>
                          )}
                        </article>
                      ))}
                  </div>
                </div>
              );
            })
          : events.map((event) => (
              <div className="st-list-row" key={event.id}>
                <div>
                  <span className="st-tag">{event.kind}</span>
                  <h3>{event.title}</h3>
                  <p className="st-muted">
                    {event.location || "Location not added"}
                  </p>
                </div>
                <small>
                  <DateLabel value={event.starts_at} />
                </small>
              </div>
            ))}
      </Panel>
    </>
  );
}
