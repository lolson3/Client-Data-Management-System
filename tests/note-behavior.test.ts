import test from "node:test";
import assert from "node:assert/strict";
import {
  CRITICAL_NOTE_PREFIX,
  getRecordCriticalNotes,
  getRecordNotes,
} from "../src/components/ExpandedNoteRows";

test("critical notes remain in API-backed note fields without appearing as ordinary notes", () => {
  const record = {
    Notes: "Routine maintenance",
    "Notes 2": `${CRITICAL_NOTE_PREFIX}UPS battery failing`,
  };

  assert.deepEqual(getRecordNotes(record), [
    { key: "Notes", value: "Routine maintenance" },
  ]);
  assert.deepEqual(getRecordCriticalNotes(record), [
    {
      key: "Notes 2",
      value: "UPS battery failing",
      storagePrefix: CRITICAL_NOTE_PREFIX,
    },
  ]);
});

test("legacy dedicated critical-note fields remain readable", () => {
  assert.deepEqual(getRecordCriticalNotes({ "Critical Note": "Do not reboot" }), [
    { key: "Critical Note", value: "Do not reboot", storagePrefix: undefined },
  ]);
});
