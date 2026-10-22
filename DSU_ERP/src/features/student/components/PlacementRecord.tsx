import { Panel, Metric } from "./UI";
import { applicationStage, statusText } from "../lib/progress";

export type PlacementRecordData = {
  registrations: {
    id: string;
    status: string;
    current_round: number;
    created_at: string;
    drive_id: string;
    title: string;
    company: string;
    rounds: string[];
    package_lpa: string | number;
    job_category: string | null;
    employment_type: string | null;
    results: { round: number; name: string; result: "pass" | "fail" | "absent"; recorded_at: string }[];
  }[];
  offers: {
    id: string;
    company: string;
    title: string;
    package_lpa: string | number;
    category: string;
    status: string;
    created_at: string;
  }[];
  summary: {
    applied: number;
    interviews: number;
    roundsAttended: number;
    roundsCleared: number;
    absences: number;
    inProgress: number;
    selected: number;
    offers: number;
    activeOffers: number;
    accepted: number;
    highestPackage: number | null;
    highestCategory: string | null;
  };
};

const tone = (value: string) =>
  ["pass", "selected", "placed", "accepted", "offered"].includes(value)
    ? "good"
    : ["fail", "rejected", "revoked", "declined"].includes(value)
      ? "bad"
      : ["absent", "withdrawn"].includes(value)
        ? "warn"
        : "neutral";

// The student's own recruitment history: every drive they joined, each round
// result recorded by the placement office, and every offer they received.
export function PlacementRecord({ record }: { record: PlacementRecordData }) {
  const { summary } = record;
  return (
    <section className="st-record" aria-labelledby="st-record-title">
      <div className="st-panel-title">
        <h2 id="st-record-title">My placement track record</h2>
        <p className="st-muted">
          Recorded by the placement office after each round and offer decision.
        </p>
      </div>
      <div className="st-metrics">
        <Metric label="Drives applied" value={summary.applied} note={`${summary.inProgress} in progress`} />
        <Metric
          label="Interview opportunities"
          value={summary.interviews}
          note={`${summary.roundsAttended} rounds attended${summary.absences ? ` · ${summary.absences} missed` : ""}`}
        />
        <Metric label="Rounds cleared" value={summary.roundsCleared} note={`${summary.selected} final selections`} />
        <Metric
          label="Offers"
          value={summary.activeOffers}
          note={
            summary.highestPackage === null
              ? `${summary.offers} recorded in total`
              : `Highest ${summary.highestPackage} LPA · ${statusText(summary.highestCategory || "")}`
          }
        />
      </div>
      <div className="st-two-col">
        <Panel title="Applications and rounds">
          {record.registrations.length ? (
            <div className="st-list">
              {record.registrations.map((item) => (
                <div className="st-list-row st-record-row" key={item.id}>
                  <div>
                    <p>
                      {item.company} · {item.title}
                    </p>
                    <small>
                      {item.package_lpa} LPA
                      {item.job_category ? ` · ${item.job_category}` : ""}
                      {" · "}
                      {applicationStage(item, item.rounds)?.label}
                    </small>
                    <div className="st-opportunity-chips">
                      {item.rounds.map((round, index) => {
                        const result = item.results.find((r) => r.round === index + 1);
                        return (
                          <span
                            key={index}
                            className={`st-chip st-chip-${result ? tone(result.result) : "neutral"}`}
                            title={result ? `Recorded ${new Date(result.recorded_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}` : "Not yet held"}
                          >
                            {round}: {result ? statusText(result.result) : "Pending"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <span className={`st-chip st-chip-${tone(item.status)}`}>{statusText(item.status)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="st-muted">
              You have not applied to any drive yet. Eligible drives appear above,
              and you are notified when a new one matches your profile.
            </p>
          )}
        </Panel>
        <Panel title="Offers received">
          {record.offers.length ? (
            <div className="st-list">
              {record.offers.map((offer) => (
                <div className="st-list-row" key={offer.id}>
                  <div>
                    <p>
                      {offer.company} · {offer.title}
                    </p>
                    <small>
                      {offer.package_lpa} LPA · {statusText(offer.category)} ·{" "}
                      {new Date(offer.created_at).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                      })}
                    </small>
                  </div>
                  <span className={`st-chip st-chip-${tone(offer.status)}`}>{statusText(offer.status)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="st-muted">No offers recorded yet.</p>
          )}
          <p className="st-muted" style={{ marginTop: 12 }}>
            Upward-only rule: after an active offer, you can apply only to a
            higher package category.
          </p>
        </Panel>
      </div>
    </section>
  );
}
