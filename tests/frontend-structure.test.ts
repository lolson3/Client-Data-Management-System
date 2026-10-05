import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  flattenMiscNotes,
  isAffirmativeValue,
  recordNoteFields,
} from "../src/components/dashboard/recordTransforms";

const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
const sidebar = readFileSync("src/components/dashboard/DashboardSidebar.tsx", "utf8");
const categoryModals = readFileSync("src/components/dashboard/DashboardCategoryModals.tsx", "utf8");
const recordDialogs = readFileSync("src/components/dashboard/DashboardRecordDialogs.tsx", "utf8");

test("sidebar navigation targets have a corresponding category surface", () => {
  const navigationTargets = new Set(
    [...sidebar.matchAll(/<NavigationItem\s+id="([^"]+)"/g)].map(match => match[1]),
  );
  const modalTargets = new Set(
    [...categoryModals.matchAll(/isOpen=\{openModal === ['"]([^'"]+)['"]\}/g)].map(match => match[1]),
  );
  // Search results are opened by submitting the sidebar search rather than a navigation item.
  modalTargets.delete("searchResults");

  assert.deepEqual([...navigationTargets].sort(), [...modalTargets].sort());
});

test("removed frontend surfaces and fields do not return through the dashboard composition", () => {
  for (const staleModal of ["coreInfra", "workstationsUsers", "externalInfo", "adminCredentials", "acronisDetail"]) {
    assert.doesNotMatch(categoryModals, new RegExp(`openModal === ['"]${staleModal}['"]`));
  }
  assert.doesNotMatch(dashboard, /Open Attendance|Navigation Buttons|className="hidden"/);
  assert.doesNotMatch(categoryModals, />Cell<|user\.cell/);
  assert.doesNotMatch(dashboard, /user\.Cell/);
  assert.doesNotMatch(recordDialogs, /key: ["']Cell["']|key: ["']Asset ID["']/);
});

test("dashboard record transforms retain notes and normalize affirmative values", () => {
  assert.deepEqual(recordNoteFields({ Name: "Router", Notes: "Rack 2", "Notes 2": "Replace", Status: "Active" }), {
    Notes: "Rack 2",
    "Notes 2": "Replace",
  });
  assert.equal(isAffirmativeValue("enabled"), true);
  assert.equal(isAffirmativeValue("no"), false);
  assert.deepEqual(flattenMiscNotes([{
    _apiId: 12,
    Notes: "Standard note",
    "Critical Note": "Urgent note",
    Other: "Ignored",
  }]), [
    { Note: "Standard note", _apiId: 12, _rowIndex: 0, _columnKey: "Notes" },
    { Note: "Urgent note", _original: { "Critical Note": "Urgent note" }, _apiId: 12, _rowIndex: 0, _columnKey: "Critical Note" },
  ]);
});
