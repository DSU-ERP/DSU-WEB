import { test } from "node:test";
import assert from "node:assert/strict";
import { CampusError, readCampusResponse } from "../src/lib/campus-response";

test("HTML hosting pages return a recoverable service error for both 200 and 503", async () => {
  for (const status of [200, 503]) {
    await assert.rejects(
      readCampusResponse(new Response("<!DOCTYPE html><h1>Service starting</h1>", {
        status, headers: { "content-type": "text/html" },
      })),
      (error: unknown) => error instanceof CampusError && error.status === 503 && !error.message.includes("DOCTYPE"),
    );
  }
});

test("malformed JSON and missing data become recoverable errors", async () => {
  for (const body of ["<html>", "null", "[]", "{}", '{"data":null}']) {
    await assert.rejects(
      readCampusResponse(new Response(body, { headers: { "content-type": "application/json" } })),
      CampusError,
    );
  }
});

test("valid API data is preserved", async () => {
  const payload = { data: { role: "admin", studentId: null } };
  assert.deepEqual(await readCampusResponse(Response.json(payload)), payload);
  assert.deepEqual(await readCampusResponse(Response.json({ data: [] })), { data: [] });
});

test("authorization and rate-limit responses keep their status without leaking response details", async () => {
  for (const status of [403, 429, 500]) {
    await assert.rejects(
      readCampusResponse(Response.json({ error: { message: "private upstream detail" } }, { status })),
      (error: unknown) => error instanceof CampusError && error.status === status && !error.message.includes("private upstream"),
    );
  }
});
