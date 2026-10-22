import Link from "next/link";
import { PageTitle, Panel, Metric, Empty, DateLabel, Progress } from "./UI";
import type { Notice, OfficialStudent } from "../lib/types";
import { academicStanding, deadlineLabel, readinessChecklist, statusText } from "../lib/progress";
export type DashboardData = {
  official: OfficialStudent;
  profile: { fullName?: string };
  onboarded: boolean;
  score: number | null;
  band: string;
  basis: string;
  skills: {
    overall: number | null;
    communication: number | null;
    accuracy: number | null;
    confidence: number | null;
  };
  sessions: number;
  plans: number;
  assessments: number;
  resume: { id: string; created_at: string } | null;
  latestSession: {
    id: string;
    report: { strengths: string[]; improvements: string[]; nextPlan: string[] };
    ended_at: string;
  } | null;
  streak: { current: number; best: number };
  activityDates: string[];
  schedule: {
    id: string;
    title: string;
    kind: string;
    starts_at: string;
    location: string | null;
  }[];
  deadlines: {
    id: string;
    title: string;
    company: string;
    registration_deadline: string;
  }[];
  applications: {
    id: string;
    company: string;
    title: string;
    status: string;
    drive_id: string;
  }[];
  notifications: Notice[];
  next: { title: string; reason: string; href: string; label: string };
  academicEligibility: boolean | null;
};
export function ReadinessRing({ data }: { data: DashboardData }) {
  return (
    <div
      className="st-ring"
      style={{ "--score": `${data.score ?? 0}%` } as React.CSSProperties}
    >
      <div>
        <strong>{data.score ?? "—"}</strong>
        <small>{data.band}</small>
      </div>
    </div>
  );
}
export function Dashboard({ data }: { data: DashboardData }) {
  const name = (data.profile.fullName || data.official.full_name).split(" ")[0];
  const now = new Date(),
    hour = Number(
      now.toLocaleString("en-GB", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
    );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const standing = academicStanding(data.official.cgpa);
  const checklist = readinessChecklist({
    onboarded: data.onboarded,
    resume: !!data.resume,
    sessions: data.sessions,
    assessments: data.assessments,
    applications: data.applications.length,
  });
  return (
    <>
      <section className="st-hero">
        <div>
          <p className="st-eyebrow">
            <i />
            {now.toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>
            {greeting}, {name}.
          </h1>
          <p className="st-muted">
            Every small step is a step toward your next chapter.
          </p>
          <div className="st-actions">
            <Link href="/student/interview?new=1" className="st-button">
              Start an interview ↗
            </Link>
            <Link
              href="/student/observation-haki"
              className="st-button st-button-secondary"
            >
              Ask Observation Haki
            </Link>
            <Link
              href="/student/ai-mock-test"
              className="st-button st-button-secondary"
            >
              Take a mock test
            </Link>
          </div>
        </div>
        <div className="st-recommendation">
          <p className="st-eyebrow">RECOMMENDED NEXT</p>
          <h3>{data.next.title}</h3>
          <p>{data.next.reason}</p>
          <Link href={data.next.href} className="st-button st-button-secondary">
            {data.next.label} →
          </Link>
        </div>
      </section>
      <div className="st-metrics">
        <Metric
          label="Completed interviews"
          value={data.sessions}
          note={`${data.plans} saved interview plans`}
        />
        <Metric
          label="Completed assessments"
          value={data.assessments}
          note="Completed attempts, not generated tests"
        />
        <Metric
          label="Preparation streak"
          value={
            data.streak.current ? `${data.streak.current} days` : "Start today"
          }
          note={`Best recorded streak: ${data.streak.best} days`}
        />
        <Metric
          label="Official CGPA"
          value={standing.value}
          note={
            data.academicEligibility === null && standing.eligible === null
              ? "Academic data unavailable"
              : standing.note
          }
        />
      </div>
      <div className="st-two-col">
        <div>
          <Panel
            title="Your preparation, in perspective."
            subtitle="A useful signal. A clearer next step."
          >
            <div
              className="st-two-col"
              style={{
                gridTemplateColumns: "170px minmax(0,1fr)",
                alignItems: "center",
              }}
            >
              <ReadinessRing data={data} />
              <div>
                {data.sessions ? (
                  <>
                    {Object.entries(data.skills)
                      .filter(([key]) => key !== "overall")
                      .map(([key, value]) => (
                        <Progress
                          key={key}
                          label={
                            key === "accuracy"
                              ? "Technical & business"
                              : key[0].toUpperCase() + key.slice(1)
                          }
                          value={value}
                        />
                      ))}
                    <Link href="/student/readiness" className="st-muted">
                      Explore your readiness ↗
                    </Link>
                  </>
                ) : (
                  <Empty
                    title="Your baseline starts with one interview."
                    href="/student/interview"
                    label="Create your first interview"
                  >
                    Complete an interview to see preparation scores and useful
                    coaching.
                  </Empty>
                )}
              </div>
            </div>
            <p className="st-muted" style={{ marginTop: 18 }}>
              {data.basis}
            </p>
          </Panel>
          <Panel
            title="Next 48 hours"
            subtitle="Your real calendar, with room for preparation."
          >
            {data.schedule.length ? (
              <div className="st-list">
                {data.schedule.map((event) => (
                  <div className="st-list-row" key={event.id}>
                    <div>
                      <span className="st-tag">{event.kind}</span>
                      <p>{event.title}</p>
                      <small>{event.location || "Location not added"}</small>
                    </div>
                    <small>
                      <DateLabel value={event.starts_at} />
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="A little breathing room."
                href="/student/timetable"
                label="Plan your week"
              >
                No scheduled events in the next 48 hours. Add a focused
                preparation session.
              </Empty>
            )}
          </Panel>
          <Panel
            title="Deadline radar"
            subtitle="Opportunities worth a closer look."
          >
            {data.deadlines.length ? (
              data.deadlines.map((drive) => (
                <div className="st-list-row" key={drive.id}>
                  <div>
                    <p>{drive.company}</p>
                    <small>
                      {drive.title} · Closes{" "}
                      {String(drive.registration_deadline).slice(0, 10)}
                    </small>
                    <span
                      className={`st-chip st-chip-${deadlineLabel(drive.registration_deadline).tone}`}
                    >
                      {deadlineLabel(drive.registration_deadline).text}
                    </span>
                  </div>
                  <Link
                    className="st-button st-button-secondary"
                    href={`/student/placement?drive=${drive.id}`}
                  >
                    Review ↗
                  </Link>
                </div>
              ))
            ) : (
              <Empty
                title="No upcoming drive deadlines."
                href="/student/placement"
                label="Browse opportunities"
              >
                Published opportunities for your batch will appear here.
              </Empty>
            )}
          </Panel>
        </div>
        <div>
          {checklist.done < checklist.steps.length && (
            <Panel
              title="Get placement-ready"
              subtitle={`${checklist.done} of ${checklist.steps.length} steps done`}
            >
              <progress
                className="st-checklist-progress"
                aria-label="Placement readiness steps completed"
                max={100}
                value={checklist.percent}
              />
              <ol className="st-checklist">
                {checklist.steps.map((step) => (
                  <li key={step.key} className={step.done ? "is-done" : ""}>
                    <span aria-hidden="true">{step.done ? "✓" : ""}</span>
                    {step.done ? (
                      <div>
                        <p>{step.title}</p>
                        <small>Done</small>
                      </div>
                    ) : (
                      <Link href={step.href}>
                        <p>{step.title} ↗</p>
                        <small>{step.hint}</small>
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          <Panel
            title="Your placement journey"
            subtitle={`${data.applications.length} recent applications`}
          >
            <div className="st-pipeline">
              {[
                ["Applied", ["registered"]],
                ["In progress", ["in-progress"]],
                ["Selected", ["selected", "placed"]],
                ["Rejected", ["rejected"]],
              ].map(([title, states]) => (
                <div key={String(title)}>
                  <strong>
                    {
                      data.applications.filter((item) =>
                        (states as string[]).includes(item.status),
                      ).length
                    }
                  </strong>
                  <span>{title}</span>
                </div>
              ))}
            </div>
            {data.applications.length ? (
              data.applications.slice(0, 5).map((item) => (
                <Link
                  className="st-list-row"
                  key={item.id}
                  href={`/student/placement?drive=${item.drive_id}`}
                >
                  <div>
                    <p>{item.company}</p>
                    <small>{item.title}</small>
                  </div>
                  <span className="st-tag">{statusText(item.status)}</span>
                </Link>
              ))
            ) : (
              <p className="st-muted">
                Your applications will appear after you register for a drive.
              </p>
            )}
          </Panel>
          <Panel title="Make preparation a habit">
            <div className="st-list">
              {[
                [
                  "Interview practice",
                  `${data.sessions} completed`,
                  "/student/interview",
                ],
                [
                  "Assessments",
                  `${data.assessments} completed`,
                  "/student/assessments",
                ],
                [
                  "Resume intelligence",
                  data.resume ? "Report ready" : "Ready when you are",
                  "/student/resume",
                ],
              ].map(([title, note, href]) => (
                <Link key={title} className="st-list-row" href={href}>
                  <div>
                    <p>{title}</p>
                    <small>{note}</small>
                  </div>
                  <span>↗</span>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="One useful insight">
            <span className="st-tag">OBSERVATION HAKI</span>
            <h3 style={{ margin: "15px 0 8px" }}>{data.next.title}</h3>
            <p className="st-muted">{data.next.reason}</p>
            <Link
              href={data.next.href}
              className="st-button st-button-secondary"
              style={{ marginTop: 15 }}
            >
              Take the next step ↗
            </Link>
          </Panel>
          <Panel title="Campus signals">
            {data.notifications.length ? (
              data.notifications.map((item) => (
                <div key={item.id} className="st-list-row">
                  <div>
                    {item.href ? (
                      <Link href={item.href}>{item.title} ↗</Link>
                    ) : (
                      <p>{item.title}</p>
                    )}
                    <small>{item.body}</small>
                  </div>
                  {!item.read_at && <span className="st-online-dot" />}
                </div>
              ))
            ) : (
              <p className="st-muted">
                You’re all caught up. New campus updates will appear here.
              </p>
            )}
          </Panel>
        </div>
      </div>
      <div className="st-action-dock">
        {[
          ["AI Interview", "interview"],
          ["Career Report", "resume"],
          ["Practice", "assessments"],
          ["Observation Haki", "observation-haki"],
        ].map(([label, href]) => (
          <Link key={href} href={`/student/${href}`}>
            {label}
            <span>↗</span>
          </Link>
        ))}
      </div>
    </>
  );
}
