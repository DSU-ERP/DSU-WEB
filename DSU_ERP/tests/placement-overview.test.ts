import test from "node:test";
import assert from "node:assert/strict";
import { driveDateWarning } from "../src/features/placement/lib/overview";

test("past-dated active drives are flagged without rewriting their status",()=>{
  for (const status of ["upcoming","ongoing"]) {
    const drive={status,drive_date:"2026-10-22"};
    assert.match(driveDateWarning(drive,"2026-10-26")!,/Review recorded status/);
    assert.equal(drive.status,status);
  }
  for(const drive of [{status:"completed",drive_date:"2026-10-22"},{status:"cancelled",drive_date:"2026-10-22"},{status:"upcoming",drive_date:null},{status:"upcoming",drive_date:"2026-10-26"},{status:"upcoming",drive_date:"2026-10-27"}])
    assert.equal(driveDateWarning(drive,"2026-10-26"),null);
});
