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
const dashboardHeader = readFileSync("src/components/dashboard/DashboardHeader.tsx", "utf8");
const overviewWorkspace = readFileSync("src/components/dashboard/DashboardOverviewWorkspace.tsx", "utf8");
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const globalStyles = readFileSync("src/app/globals.css", "utf8");
const tailwindConfig = readFileSync("tailwind.config.ts", "utf8");

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

test("dark mode uses a shared black-based neutral palette", () => {
  const darkTheme = globalStyles.match(/\.dark \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  const darkShell = globalStyles.match(/\.dark \.cdms-shell \{([\s\S]*?)\n  \}/)?.[1] ?? "";

  assert.match(darkTheme, /--background:\s*0 0% 0%/);
  assert.match(darkTheme, /--gray-900:\s*0 0 0/);
  assert.match(darkShell, /--cdms-bg:\s*#000/);
  assert.match(darkShell, /--cdms-surface:\s*#08090c/);
  assert.match(tailwindConfig, /gray:\s*\{/);
  assert.match(tailwindConfig, /rgb\(var\(--gray-800\) \/ <alpha-value>\)/);
});

test("category navigation uses a persistent portal host", () => {
  assert.match(dashboard, /id="dashboard-section-panel"/);
  assert.match(dashboard, /className=\{`cdms-section-panel \$\{openModal \? 'is-open' : ''\}`\}/);
  assert.match(dashboard, /\{!openModal && \(/);
  assert.doesNotMatch(overviewWorkspace, /dashboard-section-panel|hasOpenCategory/);
});

test("dark mode uses brighter semantic row and header-action highlights", () => {
  const darkShell = globalStyles.match(/\.dark \.cdms-shell \{([\s\S]*?)\n  \}/)?.[1] ?? "";

  assert.match(darkShell, /--cdms-positive:\s*#a3e635/);
  assert.match(darkShell, /--cdms-negative:\s*#fb7185/);
  assert.match(darkShell, /--cdms-info:\s*#7dd3fc/);
  assert.match(globalStyles, /\.dark \.cdms-guac-button, \.dark \.cdms-data-row\.is-active/);
  assert.match(globalStyles, /\.dark \.cdms-contact-button \{/);
});

test("settings actions dismiss the header menu", () => {
  const themeHandler = dashboardHeader.match(
    /const handleThemeSelection = \(selectedTheme: Theme\) => \{([\s\S]*?)\n  \};/,
  )?.[1] ?? "";

  assert.match(themeHandler, /setTheme\(selectedTheme\)/);
  assert.match(themeHandler, /setUserMenuOpen\(false\)/);
  assert.match(dashboardHeader, /handleThemeSelection\('light'\)/);
  assert.match(dashboardHeader, /handleThemeSelection\('dark'\)/);
  assert.match(dashboardHeader, /handleThemeSelection\('system'\)/);
});

test("frontend preferences are browser-local", () => {
  assert.doesNotMatch(dashboard, /\/api\/preferences/);
  assert.doesNotMatch(dashboard, /localStorage\.getItem\(["']token["']\)/);
  assert.doesNotMatch(dashboard, /Authorization:/);
  assert.match(dashboard, /localStorage\.setItem\(SORT_PREFS_STORAGE_KEY/);
  assert.match(dashboard, /localStorage\.setItem\(CLIENT_STORAGE_KEY/);
  assert.match(dashboard, /localStorage\.getItem\(SORT_PREFS_STORAGE_KEY\)/);
  assert.match(dashboard, /localStorage\.getItem\(CLIENT_STORAGE_KEY\)/);
});

test("root layout does not require a network font during build", () => {
  assert.doesNotMatch(rootLayout, /next\/font\/google/);
  assert.match(rootLayout, /<body className="font-sans">/);
});

test("dashboard API integration handles partial failures and encoded clients", () => {
  assert.match(dashboard, /Promise\.allSettled/);
  assert.match(dashboard, /isUnauthorizedApiError/);
  assert.match(dashboard, /router\.replace\(["']\/login["']\)/);
  assert.match(dashboard, /encodeURIComponent\(selectedClient\)/);
  assert.match(dashboard, /setDataLoadErrors\(failures\)/);
  assert.match(dashboard, /role="alert"/);
});

test("organized aggregate categories expose typed add flows", () => {
  assert.match(categoryModals, /setAddModalType\('networkDevices'\)/);
  assert.match(categoryModals, /setAddModalType\('cameras'\)/);
  assert.match(categoryModals, /setAddModalType\('accountsAccess'\)/);
  assert.match(recordDialogs, /networkDevices:\s*\{[\s\S]*?Device Type[\s\S]*?required:\s*true/);
  assert.match(recordDialogs, /cameras:\s*\{[\s\S]*?Device Type[\s\S]*?required:\s*true/);
  assert.match(recordDialogs, /accountsAccess:\s*\{[\s\S]*?Account Type[\s\S]*?required:\s*true/);
});
