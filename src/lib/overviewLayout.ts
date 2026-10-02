export interface OverviewLayoutItem {
  id: string;
  column: number;
  row: number;
  columns: number;
  rows: number;
}

export type OverviewResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

interface LayoutBounds {
  columns: number;
  rows: number;
  minimumColumns: number;
  minimumRows: number;
}

const right = (item: OverviewLayoutItem) => item.column + item.columns;
const bottom = (item: OverviewLayoutItem) => item.row + item.rows;
const rangesOverlap = (firstStart: number, firstSize: number, secondStart: number, secondSize: number) => (
  firstStart < secondStart + secondSize && firstStart + firstSize > secondStart
);

export const overviewItemsOverlap = (first: OverviewLayoutItem, second: OverviewLayoutItem) => (
  rangesOverlap(first.column, first.columns, second.column, second.columns)
  && rangesOverlap(first.row, first.rows, second.row, second.rows)
);

export const overviewLayoutHasOverlap = (layout: OverviewLayoutItem[]) => layout.some((item, index) => (
  layout.slice(index + 1).some(other => overviewItemsOverlap(item, other))
));

const isWithinBounds = (item: OverviewLayoutItem, bounds: LayoutBounds) => (
  item.column >= 1
  && item.row >= 1
  && right(item) <= bounds.columns + 1
  && bottom(item) <= bounds.rows + 1
  && item.columns >= bounds.minimumColumns
  && item.rows >= bounds.minimumRows
);

function applySharedBoundaryFollowers(
  layout: OverviewLayoutItem[],
  originalLayout: OverviewLayoutItem[],
  original: OverviewLayoutItem,
  resized: OverviewLayoutItem,
  direction: OverviewResizeDirection,
  columnDelta: number,
  rowDelta: number,
) {
  const originals = new Map(originalLayout.map(item => [item.id, item]));

  layout.forEach(item => {
    if (item.id === original.id) return;
    const before = originals.get(item.id)!;

    // When a shared edge retreats, the panel on the other side grows into the
    // released space. An outside edge has no follower, so no unrelated panel moves.
    if (direction.includes('e') && columnDelta < 0 && before.column === right(original)
      && rangesOverlap(before.row, before.rows, original.row, original.rows)) {
      const oldRight = right(item);
      item.column = right(resized);
      item.columns = oldRight - item.column;
    }
    if (direction.includes('w') && columnDelta > 0 && right(before) === original.column
      && rangesOverlap(before.row, before.rows, original.row, original.rows)) {
      item.columns = resized.column - item.column;
    }
    if (direction.includes('s') && rowDelta < 0 && before.row === bottom(original)
      && rangesOverlap(before.column, before.columns, original.column, original.columns)) {
      const oldBottom = bottom(item);
      item.row = bottom(resized);
      item.rows = oldBottom - item.row;
    }
    if (direction.includes('n') && rowDelta > 0 && bottom(before) === original.row
      && rangesOverlap(before.column, before.columns, original.column, original.columns)) {
      item.rows = resized.row - item.row;
    }
  });
}

function propagateExpansion(
  layout: OverviewLayoutItem[],
  originalLayout: OverviewLayoutItem[],
  resizedId: string,
  axisDirection: 'e' | 'w' | 's' | 'n',
  bounds: LayoutBounds,
): boolean {
  const originals = new Map(originalLayout.map(item => [item.id, item]));
  const queue = [resizedId];
  let operations = 0;

  const isEligible = (item: OverviewLayoutItem, moverId: string) => {
    const before = originals.get(item.id)!;
    const moverBefore = originals.get(moverId)!;
    if (axisDirection === 'e') return before.column >= right(moverBefore);
    if (axisDirection === 'w') return right(before) <= moverBefore.column;
    if (axisDirection === 's') return before.row >= bottom(moverBefore);
    return bottom(before) <= moverBefore.row;
  };

  while (queue.length > 0 && operations < layout.length * layout.length * 4) {
    const moverId = queue.shift()!;
    const mover = layout.find(item => item.id === moverId)!;

    for (const item of layout) {
      const itemBefore = originals.get(item.id)!;
      const overlapsOnMovingAxis = axisDirection === 'e' || axisDirection === 'w'
        ? rangesOverlap(mover.column, mover.columns, item.column, item.columns)
        : rangesOverlap(mover.row, mover.rows, item.row, item.rows);
      const overlapsOnCrossAxis = axisDirection === 'e' || axisDirection === 'w'
        ? rangesOverlap(mover.row, mover.rows, item.row, item.rows)
          || rangesOverlap(mover.row, mover.rows, itemBefore.row, itemBefore.rows)
        : rangesOverlap(mover.column, mover.columns, item.column, item.columns)
          || rangesOverlap(mover.column, mover.columns, itemBefore.column, itemBefore.columns);
      if (item.id === moverId || !isEligible(item, moverId) || !overlapsOnMovingAxis || !overlapsOnCrossAxis) continue;
      const previous = { ...item };

      if (axisDirection === 'e') {
        const previousRight = right(item);
        item.column = right(mover);
        item.columns = Math.max(bounds.minimumColumns, previousRight - item.column);
      } else if (axisDirection === 'w') {
        const previousLeft = item.column;
        const nextRight = mover.column;
        item.columns = Math.max(bounds.minimumColumns, nextRight - previousLeft);
        item.column = nextRight - item.columns;
      } else if (axisDirection === 's') {
        const previousBottom = bottom(item);
        item.row = bottom(mover);
        item.rows = Math.max(bounds.minimumRows, previousBottom - item.row);
      } else {
        const previousTop = item.row;
        const nextBottom = mover.row;
        item.rows = Math.max(bounds.minimumRows, nextBottom - previousTop);
        item.row = nextBottom - item.rows;
      }

      if (!isWithinBounds(item, bounds)) return false;

      // Moving a panel's near edge releases space behind it. Grow every panel
      // sharing that original boundary so connected rows/columns remain coherent.
      for (const follower of layout) {
        if (follower.id === item.id) continue;
        const followerBefore = originals.get(follower.id)!;
        if (axisDirection === 'e' && right(followerBefore) === itemBefore.column
          && rangesOverlap(followerBefore.row, followerBefore.rows, itemBefore.row, itemBefore.rows)) {
          follower.columns = item.column - follower.column;
        } else if (axisDirection === 'w' && followerBefore.column === right(itemBefore)
          && rangesOverlap(followerBefore.row, followerBefore.rows, itemBefore.row, itemBefore.rows)) {
          const followerRight = right(follower);
          follower.column = right(item);
          follower.columns = followerRight - follower.column;
        } else if (axisDirection === 's' && bottom(followerBefore) === itemBefore.row
          && rangesOverlap(followerBefore.column, followerBefore.columns, itemBefore.column, itemBefore.columns)) {
          follower.rows = item.row - follower.row;
        } else if (axisDirection === 'n' && followerBefore.row === bottom(itemBefore)
          && rangesOverlap(followerBefore.column, followerBefore.columns, itemBefore.column, itemBefore.columns)) {
          const followerBottom = bottom(follower);
          follower.row = bottom(item);
          follower.rows = followerBottom - follower.row;
        }
        if (!isWithinBounds(follower, bounds)) return false;
      }

      if (item.column !== previous.column || item.row !== previous.row || item.columns !== previous.columns || item.rows !== previous.rows) {
        queue.push(item.id);
      }
      operations += 1;
    }
  }

  return operations < layout.length * layout.length * 4;
}

function tryResizeOverviewLayout(
  originalLayout: OverviewLayoutItem[],
  panelId: string,
  direction: OverviewResizeDirection,
  columnDelta: number,
  rowDelta: number,
  bounds: LayoutBounds,
): OverviewLayoutItem[] | null {
  const layout = originalLayout.map(item => ({ ...item }));
  const original = originalLayout.find(item => item.id === panelId);
  const resized = layout.find(item => item.id === panelId);
  if (!original || !resized) return null;

  if (direction.includes('e')) resized.columns += columnDelta;
  if (direction.includes('w')) {
    resized.column += columnDelta;
    resized.columns -= columnDelta;
  }
  if (direction.includes('s')) resized.rows += rowDelta;
  if (direction.includes('n')) {
    resized.row += rowDelta;
    resized.rows -= rowDelta;
  }
  if (!isWithinBounds(resized, bounds)) return null;

  applySharedBoundaryFollowers(layout, originalLayout, original, resized, direction, columnDelta, rowDelta);
  if (layout.some(item => !isWithinBounds(item, bounds))) return null;

  if (direction.includes('e') && columnDelta > 0 && !propagateExpansion(layout, originalLayout, panelId, 'e', bounds)) return null;
  if (direction.includes('w') && columnDelta < 0 && !propagateExpansion(layout, originalLayout, panelId, 'w', bounds)) return null;
  if (direction.includes('s') && rowDelta > 0 && !propagateExpansion(layout, originalLayout, panelId, 's', bounds)) return null;
  if (direction.includes('n') && rowDelta < 0 && !propagateExpansion(layout, originalLayout, panelId, 'n', bounds)) return null;

  return overviewLayoutHasOverlap(layout) ? null : layout;
}

const deltasTowardZero = (value: number) => {
  const values: number[] = [];
  const step = value < 0 ? 1 : -1;
  for (let current = value; current !== 0; current += step) values.push(current);
  values.push(0);
  return values;
};

export function resizeOverviewLayout(
  layout: OverviewLayoutItem[],
  panelId: string,
  direction: OverviewResizeDirection,
  requestedColumnDelta: number,
  requestedRowDelta: number,
  bounds: LayoutBounds,
): OverviewLayoutItem[] {
  requestedColumnDelta = Math.max(-bounds.columns, Math.min(bounds.columns, requestedColumnDelta));
  requestedRowDelta = Math.max(-bounds.rows, Math.min(bounds.rows, requestedRowDelta));
  const horizontalDeltas = deltasTowardZero(direction.includes('e') || direction.includes('w') ? requestedColumnDelta : 0);
  const verticalDeltas = deltasTowardZero(direction.includes('n') || direction.includes('s') ? requestedRowDelta : 0);
  const candidates = horizontalDeltas.flatMap(columnDelta => verticalDeltas.map(rowDelta => ({ columnDelta, rowDelta })))
    .sort((first, second) => (
      Math.hypot(first.columnDelta - requestedColumnDelta, first.rowDelta - requestedRowDelta)
      - Math.hypot(second.columnDelta - requestedColumnDelta, second.rowDelta - requestedRowDelta)
    ));

  for (const candidate of candidates) {
    const resized = tryResizeOverviewLayout(layout, panelId, direction, candidate.columnDelta, candidate.rowDelta, bounds);
    if (resized) return resized;
  }
  return layout;
}

export function placeOverviewPanel(
  layout: OverviewLayoutItem[],
  panelId: string,
  column: number,
  row: number,
  gridColumns: number,
  gridRows: number,
): OverviewLayoutItem[] | null {
  const moving = layout.find(item => item.id === panelId);
  if (!moving) return null;
  const candidate = {
    ...moving,
    column: Math.min(gridColumns - moving.columns + 1, Math.max(1, column)),
    row: Math.min(gridRows - moving.rows + 1, Math.max(1, row)),
  };
  if (layout.some(item => item.id !== panelId && overviewItemsOverlap(candidate, item))) return null;
  return layout.map(item => item.id === panelId ? candidate : item);
}
