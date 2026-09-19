import test from "node:test";
import assert from "node:assert/strict";
import { authorizeDtrRequest } from "../middleware.js";
import { DTR_PERMISSION_KEYS } from "./dtrPermissions.js";

const allowed = (permissions, method, path) => {
  let authorized = false;
  const res = { status() { return this; }, json() {} };
  authorizeDtrRequest(
    { user: { categoryId: 2, dtrPermissions: permissions }, method, path },
    res,
    () => { authorized = true; }
  );
  return authorized;
};

test("group managers can load and manage groups without template access", () => {
  const permissions = ["dtr.groups"];
  assert.equal(allowed(permissions, "GET", "/schedules/employees"), true);
  assert.equal(allowed(permissions, "GET", "/schedules/groups"), true);
  assert.equal(allowed(permissions, "DELETE", "/schedules/groups/1"), true);
  assert.equal(allowed(permissions, "GET", "/shifts"), false);
});

test("scheduling permissions allow shift options but never template mutations", () => {
  for (const permission of ["dtr.assignments", "dtr.overrides"]) {
    assert.equal(allowed([permission], "GET", "/shifts"), true);
    assert.equal(allowed([permission], "GET", "/shifts/"), true);
    for (const [method, path] of [["POST", "/shifts"], ["PUT", "/shifts/1"], ["DELETE", "/shifts/1"]]) {
      assert.equal(allowed([permission], method, path), false);
    }
  }
  assert.equal(allowed([], "GET", "/shifts"), false);
});

test("assignment managers can read group options without managing memberships", () => {
  const permissions = ["dtr.assignments"];
  assert.equal(allowed(permissions, "GET", "/schedules/groups"), true);
  assert.equal(allowed(permissions, "GET", "/schedules/groups/1/members"), false);
  assert.equal(allowed(permissions, "POST", "/schedules/groups"), false);
  assert.equal(allowed(permissions, "DELETE", "/schedules/groups/1"), false);
  assert.equal(allowed([], "GET", "/schedules/groups"), false);
});

test("each DTR page can read its dependencies with only its own permission", () => {
  const reads = {
    "dtr.batches": ["/batches", "/summary/1", "/detail/1/2", "/export/1", "/export-xlsx/1", "/schedule-exceptions/1", "/DTRemployees", "/holidays", "/overview"],
    "dtr.import": [], // Upload form does not request batch-management data.
    "dtr.calendar": ["/schedules/calendar", "/schedules/employees"],
    "dtr.assignments": ["/schedules/employees", "/schedules/groups", "/shifts", "/schedules/assignments", "/schedules/assignment-preview"],
    "dtr.groups": ["/schedules/employees", "/schedules/groups", "/schedules/groups/1/members"],
    "dtr.overrides": ["/schedules/employees", "/shifts", "/schedules/overrides"],
    "dtr.shifts": ["/shifts"],
    "dtr.holidays": ["/holidays"],
    "dtr.monthly": ["/monthly", "/overview"],
    "dtr.absences": ["/absences", "/overview"],
  };
  assert.deepEqual(Object.keys(reads).sort(), [...DTR_PERMISSION_KEYS].sort());
  for (const [permission, paths] of Object.entries(reads)) {
    for (const path of paths) {
      assert.equal(allowed([permission], "GET", path), true, `${permission}: ${path}`);
      assert.equal(allowed([], "GET", path), false, `No permission: ${path}`);
    }
  }
});

test("reference reads never grant another DTR feature's write permissions", () => {
  const writes = [
    ["dtr.import", "POST", "/upload"],
    ["dtr.batches", "POST", "/add-to-batch/1"],
    ["dtr.batches", "DELETE", "/DTRdelete/1"],
    ["dtr.batches", "POST", "/update-entries/1"],
    ["dtr.batches", "POST", "/compare-schedules/1"],
    ["dtr.batches", "PUT", "/schedule-exceptions/1/approve"],
    ["dtr.holidays", "POST", "/add-holiday"],
    ["dtr.shifts", "POST", "/shifts"],
    ["dtr.shifts", "PUT", "/shifts/1"],
    ["dtr.shifts", "DELETE", "/shifts/1"],
    ["dtr.groups", "POST", "/schedules/groups"],
    ["dtr.groups", "POST", "/schedules/groups/1/members"],
    ["dtr.groups", "DELETE", "/schedules/members/1"],
    ["dtr.assignments", "POST", "/schedules/assignments"],
    ["dtr.assignments", "DELETE", "/schedules/assignments/1"],
    ["dtr.overrides", "POST", "/schedules/overrides"],
    ["dtr.overrides", "DELETE", "/schedules/overrides/1"],
  ];
  for (const [owner, method, path] of writes) {
    for (const permission of DTR_PERMISSION_KEYS) {
      assert.equal(allowed([permission], method, path), permission === owner, `${permission}: ${method} ${path}`);
    }
    assert.equal(allowed([], method, path), false);
  }
});
