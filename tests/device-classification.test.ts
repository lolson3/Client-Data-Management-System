import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyDeviceRecord,
  organizeDeviceRecord,
  prepareAccountRecord,
} from "../src/components/dashboard/recordTransforms";

test("device classification routes reported production examples correctly", () => {
  assert.equal(classifyDeviceRecord({ Name: "HP Pro Curve switch" }), "network");
  assert.equal(classifyDeviceRecord({ Name: "PowerBIServer" }), "server");
  assert.equal(classifyDeviceRecord({ Name: "ESET Inspect Server" }), "server");
});

test("device classification prioritizes explicit types and print groupings", () => {
  assert.equal(classifyDeviceRecord({ "Device Type": "Firewall" }), "network");
  assert.equal(classifyDeviceRecord({ "Device Type": "Application Server" }), "server");
  assert.equal(classifyDeviceRecord({ "Device Type": "Multifunction Printer" }), "printScan");
  assert.equal(classifyDeviceRecord({ "Device Type": "Other Print / Scan Device" }), "printScan");
  assert.equal(classifyDeviceRecord({ Grouping: "Scanners" }), "printScan");
  assert.equal(classifyDeviceRecord({ Name: "Unclassified appliance" }), "other");
});

test("legacy organization distinguishes explicit, inferred, and review records", () => {
  assert.deepEqual(organizeDeviceRecord({ "Device Type": "Switch", Name: "Closet 1" }), {
    category: "network",
    confidence: "explicit",
    basis: "Device Type",
  });
  assert.deepEqual(organizeDeviceRecord({ Name: "PowerBIServer" }), {
    category: "server",
    confidence: "inferred",
    basis: "Name",
  });
  assert.deepEqual(organizeDeviceRecord({ Name: "Legacy box" }), {
    category: "other",
    confidence: "review",
    basis: "No recognized type",
  });
});

test("device API mappings retain Device Type", () => {
  const datasets = readFileSync("src/lib/data/silver-datasets.ts", "utf8");
  assert.match(datasets, /device_type:\s*"Device Type"/);
  assert.match(datasets, /core:[\s\S]*?name:\s*"Name",\s*device_type:\s*"Device Type"/);
  assert.match(datasets, /cameras:[\s\S]*?name:\s*"Name",\s*device_type:\s*"Device Type"/);
});

test("aggregate account entry routes to the selected source dataset", () => {
  assert.deepEqual(prepareAccountRecord({
    Client: "ACME",
    "Account Type": "Application",
    Account: "svc-app",
    Password: "secret",
    Resource: "Line of Business App",
    URL: "https://app.example",
    Notes: "Shared account",
  }), {
    fileKey: "services",
    rowData: {
      Client: "ACME",
      Service: "Line of Business App",
      Username: "svc-app",
      Password: "secret",
      "Host / URL": "https://app.example",
      Notes: "Shared account",
    },
  });

  assert.equal(prepareAccountRecord({
    Client: "ACME",
    "Account Type": "Remote Access",
    Account: "admin",
    Resource: "Cloud Host",
  }).fileKey, "guacamoleHosts");

  const expectedRoutes: Record<string, string> = {
    "Windows / Domain": "users",
    "Application": "services",
    "Administrative Email": "adminEmails",
    "VoIP Administration": "adminVoipLogins",
    "Backup Administration": "acronisBackups",
    "DNS Administration": "cloudflareAdmins",
    "Remote Access": "guacamoleHosts",
  };
  for (const [accountType, fileKey] of Object.entries(expectedRoutes)) {
    assert.equal(prepareAccountRecord({
      Client: "ACME",
      "Account Type": accountType,
      Account: "account",
      Resource: "resource",
    }).fileKey, fileKey);
  }
});
