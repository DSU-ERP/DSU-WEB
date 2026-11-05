import test from "node:test";
import assert from "node:assert/strict";
import { departmentLeader, driveDateWarning } from "../src/features/placement/lib/overview";

test("past-dated active drives are flagged without rewriting their status",()=>{
  for (const status of ["upcoming","ongoing"]) {
    const drive={status,drive_date:"2026-10-22"};
    assert.match(driveDateWarning(drive,"2026-10-26")!,/Review recorded status/);
    assert.equal(drive.status,status);
  }
  for(const drive of [{status:"completed",drive_date:"2026-10-22"},{status:"cancelled",drive_date:"2026-10-22"},{status:"upcoming",drive_date:null},{status:"upcoming",drive_date:"2026-10-26"},{status:"upcoming",drive_date:"2026-10-27"}])
    assert.equal(driveDateWarning(drive,"2026-10-26"),null);
});

test("department leaders: none when every value is zero or missing, all names on a tie", () => {
  const rows = [{ department: "AI & DS", placement_percentage: 0 }, { department: "CSE", placement_percentage: "0" }, { department: "ECE", placement_percentage: null }];
  assert.equal(departmentLeader(rows, "placement_percentage"), null);
  assert.equal(departmentLeader([], "average"), null);
  assert.deepEqual(departmentLeader([{ department: "CSE", average: 6.5 }, { department: "AI & DS", average: "6.5" }, { department: "ECE", average: 4 }], "average"),
    { departments: ["AI & DS", "CSE"], value: 6.5 });
  assert.deepEqual(departmentLeader([{ department: "CSE", highest: 12 }, { department: "ECE", highest: 8 }], "highest"), { departments: ["CSE"], value: 12 });
});
