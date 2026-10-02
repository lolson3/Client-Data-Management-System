import test from "node:test";
import assert from "node:assert/strict";
import {
  overviewLayoutHasOverlap,
  placeOverviewPanel,
  resizeOverviewLayout,
  type OverviewLayoutItem,
  type OverviewResizeDirection,
} from "../src/lib/overviewLayout";

const bounds = { columns: 12, rows: 12, minimumColumns: 3, minimumRows: 1 };
const defaultLayout: OverviewLayoutItem[] = [
  { id: "servers", column: 1, row: 1, columns: 6, rows: 7 },
  { id: "workstations", column: 7, row: 1, columns: 6, rows: 7 },
  { id: "network", column: 1, row: 8, columns: 6, rows: 5 },
  { id: "credentials", column: 7, row: 8, columns: 6, rows: 5 },
];

function assertValidLayout(layout: OverviewLayoutItem[]) {
  assert.equal(overviewLayoutHasOverlap(layout), false);
  for (const item of layout) {
    assert.ok(item.column >= 1 && item.row >= 1);
    assert.ok(item.columns >= bounds.minimumColumns && item.rows >= bounds.minimumRows);
    assert.ok(item.column + item.columns <= bounds.columns + 1);
    assert.ok(item.row + item.rows <= bounds.rows + 1);
  }
}

test("shrinking an outside edge does not resize an unrelated neighbor", () => {
  const resized = resizeOverviewLayout(defaultLayout, "servers", "w", 1, 0, bounds);
  assert.deepEqual(resized.find(item => item.id === "servers"), {
    id: "servers", column: 2, row: 1, columns: 5, rows: 7,
  });
  assert.deepEqual(
    resized.find(item => item.id === "workstations"),
    defaultLayout.find(item => item.id === "workstations")
  );
  assertValidLayout(resized);
});

test("a neighbor predictably grows into space released at a shared edge", () => {
  const resized = resizeOverviewLayout(defaultLayout, "servers", "e", -1, 0, bounds);
  assert.deepEqual(resized.find(item => item.id === "servers"), {
    id: "servers", column: 1, row: 1, columns: 5, rows: 7,
  });
  assert.deepEqual(resized.find(item => item.id === "workstations"), {
    id: "workstations", column: 6, row: 1, columns: 7, rows: 7,
  });
  assertValidLayout(resized);
});

test("all resize directions preserve bounds and prevent overlap", () => {
  const directions: OverviewResizeDirection[] = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];
  for (const item of defaultLayout) {
    for (const direction of directions) {
      for (let delta = -12; delta <= 12; delta += 1) {
        assertValidLayout(resizeOverviewLayout(defaultLayout, item.id, direction, delta, delta, bounds));
      }
    }
  }
});

test("a remaining panel can be moved to a newly opened edge", () => {
  const withoutServers = defaultLayout.filter(item => item.id !== "servers");
  const moved = placeOverviewPanel(withoutServers, "workstations", 1, 1, 12, 12);
  assert.ok(moved);
  assert.equal(moved.find(item => item.id === "workstations")?.column, 1);
  assertValidLayout(moved);
});
