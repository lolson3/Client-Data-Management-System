import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyDeviceRecord } from "../src/components/dashboard/recordTransforms";

test("device classification routes reported production examples correctly", () => {
  assert.equal(classifyDeviceRecord({ Name: "HP Pro Curve switch" }), "network");
  assert.equal(classifyDeviceRecord({ Name: "PowerBIServer" }), "server");
  assert.equal(classifyDeviceRecord({ Name: "ESET Inspect Server" }), "server");
});

test("device classification prioritizes explicit types and print groupings", () => {
  assert.equal(classifyDeviceRecord({ "Device Type": "Firewall" }), "network");
  assert.equal(classifyDeviceRecord({ "Device Type": "Application Server" }), "server");
  assert.equal(classifyDeviceRecord({ "Device Type": "Multifunction Printer" }), "printScan");
  assert.equal(classifyDeviceRecord({ Grouping: "Scanners" }), "printScan");
  assert.equal(classifyDeviceRecord({ Name: "Unclassified appliance" }), "other");
});

test("devices API mapping retains Device Type", () => {
  const datasets = readFileSync("src/lib/data/silver-datasets.ts", "utf8");
  assert.match(datasets, /device_type:\s*"Device Type"/);
});
