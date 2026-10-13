import { spawnSync } from "node:child_process";
import { compileChecks } from "./compile-checks.mjs";
compileChecks();
const result = spawnSync(
  process.execPath,
  [
    "--test",
    ".qa/unit/tests/architecture.test.js",
    ".qa/unit/tests/campus-response.test.js",
    ".qa/unit/tests/analytics.test.js",
    ".qa/unit/tests/supabase-portal.test.js",
    ".qa/unit/tests/batches.test.js",
  ],
  { stdio: "inherit", windowsHide: true },
);
process.exit(result.status ?? 1);
