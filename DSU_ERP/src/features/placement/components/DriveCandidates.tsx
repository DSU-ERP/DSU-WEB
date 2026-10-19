"use client";
import { useState } from "react";
import type { Row } from "@/features/placement/lib/types";
import { number, text } from "@/features/placement/lib/types";
import { Table, Facts } from "./UI";
import { ChangeForm } from "./Controls";
export function DriveCandidates({ drive, rows }: { drive: Row; rows: Row[] }) {
  const [selected, setSelected] = useState<string[]>([]),
    [action, setAction] = useState("interest.record");
  const chosen = rows.filter((r) => selected.includes(String(r.student_id)));
  const rounds = Array.isArray(drive.rounds) ? drive.rounds.map(String) : [];
  const all = rows.length > 0 && selected.length === rows.length;
  return (
    <>
      <div className="po-actions">
        <button
          className="erp-secondary"
          onClick={() =>
            setSelected(all ? [] : rows.map((r) => String(r.student_id)))
          }
        >
          {all ? "Clear selection" : "Select this page"}
        </button>
        <span>{number(chosen.length)} selected</span>
      </div>
      <Table
        caption="Drive candidate pool"
        rows={rows}
        columns={[
          {
            key: "selection",
            title: "Select",
            render: (r) => (
              <input
                type="checkbox"
                aria-label={`Select ${r.name}`}
                checked={selected.includes(String(r.student_id))}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, String(r.student_id)]
                      : old.filter((id) => id !== r.student_id),
                  )
                }
              />
            ),
          },
          {
            key: "usn",
            title: "USN",
            link: (r) => `/placement/students/${r.student_id}`,
          },
          { key: "name" },
          { key: "department" },
          { key: "cgpa", title: "CGPA", numeric: true },
          { key: "backlogs", numeric: true },
          { key: "interest" },
          { key: "status", title: "Recruitment status" },
          {
            key: "current_round",
            render: (r) =>
              r.status === "selected" || r.status === "placed"
                ? "All rounds passed"
                : rounds[Number(r.current_round) - 1] || "Not registered",
          },
          {
            key: "reason",
            title: "Selection restrictions",
            render: (r) =>
              r.reason
                ? text(r.reason)
                : r.registration_id
                  ? "Already registered"
                  : "Meets requirements",
          },
          { key: "current_category" },
          {
            key: "highest_package",
            title: "Highest active (LPA)",
            numeric: true,
          },
        ]}
        details={(r) => (
          <>
            {Array.isArray(r.results) && r.results.length ? (
              r.results.map((v, i) => <Facts key={i} data={v as Row} />)
            ) : (
              <p>No round results recorded.</p>
            )}
          </>
        )}
      />
      <div className="po-split">
        <section>
          <h3>Act on selected candidates</h3>
          <label className="po-note">
            Action{" "}
            <select
              aria-label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="interest.record">
                Record invitation / interest
              </option>
              <option value="registration.add">Register candidates</option>
              <option value="round.record">Record round results</option>
              <option value="registration.withdraw">Withdraw candidates</option>
              <option value="offer.create">
                Create offers for selected candidates
              </option>
            </select>
          </label>
          {chosen.length > 0 &&
          (["interest.record", "registration.add"].includes(action) ||
            chosen.every((r) => r.registration_id)) ? (
            <ChangeForm
              key={action}
              action={action}
              base={{
                drive_id: drive.id,
                student_ids: chosen.map((r) => r.student_id),
                registration_ids: chosen
                  .filter((r) => r.registration_id)
                  .map((r) => r.registration_id),
              }}
              submit={
                action === "round.record"
                  ? "Apply result to selection"
                  : "Apply to selection"
              }
            >
              {action === "interest.record" && (
                <label>
                  Recorded response
                  <select name="state">
                    <option value="invited">Invited</option>
                    <option value="interested">Interested</option>
                    <option value="not-interested">Not Interested</option>
                  </select>
                </label>
              )}
              {action === "registration.add" && (
                <label className="po-checkbox">
                  <input name="override_interest" type="checkbox" />
                  Confirm registration without a recorded Interested response
                </label>
              )}
              {action === "round.record" && (
                <>
                  <label>
                    Round
                    <select name="round">
                      {rounds.map((r, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}. {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Result
                    <select name="result">
                      <option value="pass">Pass All selected</option>
                      <option value="fail">Fail All selected</option>
                      <option value="absent">Absent</option>
                    </select>
                  </label>
                  <label>
                    Remarks
                    <textarea name="remarks" maxLength={2000} />
                  </label>
                </>
              )}
              {action === "offer.create" && (
                <label>
                  Offered package (LPA)
                  <input
                    name="package_lpa"
                    type="number"
                    min="0"
                    max="10000"
                    step="any"
                    defaultValue={String(drive.package_lpa)}
                    required
                  />
                </label>
              )}
              <p className="po-note">
                Select one student for an individual update. Bulk changes
                succeed together or make no changes if any selection is invalid.
              </p>
            </ChangeForm>
          ) : (
            <p className="po-note">
              Select candidates first. Round, withdrawal and offer actions
              require every selected candidate to be registered.
            </p>
          )}
        </section>
        <section>
          <h3>Register all interested</h3>
          <p className="po-note">
            Registers every eligible Interested student who is not already
            registered, across all pages. Other candidates remain unchanged.
          </p>
          <ChangeForm
            action="registration.interested"
            base={{ drive_id: drive.id }}
            submit="Register all eligible interested students"
          />
        </section>
      </div>
    </>
  );
}
