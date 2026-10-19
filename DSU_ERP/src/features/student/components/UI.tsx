import Link from "next/link";
import type { ReactNode } from "react";
export function PageTitle({
  eyebrow = "DSU / STUDENT",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="st-heading">
      <div>
        <p className="st-eyebrow">
          <i />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="st-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`st-panel ${className}`}>
      {title && (
        <div className="st-panel-title">
          <h2>{title}</h2>
          {subtitle && <p className="st-muted">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  children,
  href,
  label,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <div className="st-empty">
      <span aria-hidden="true">↗</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <Link className="st-button" href={href}>
          {label || "Get started"} ↗
        </Link>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <article className="st-metric">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
export function ErrorNote({ message }: { message?: string }) {
  return message ? (
    <p className="st-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function DateLabel({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </time>
  );
}
export function Progress({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  return (
    <div className="st-progress">
      <div>
        <span>{label}</span>
        <strong>
          {value === null ? "Not scored" : `${Math.round(value)}%`}
        </strong>
      </div>
      <progress aria-label={label} max={100} value={value ?? 0} />
    </div>
  );
}
