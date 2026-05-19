export interface GridLayout {
  cols: number;
  rows: number;
  cellSize: number;
}

/** Find the grid layout that maximizes square cell size for `itemCount` items. */
export function computeSquareGridLayout(
  width: number,
  height: number,
  itemCount: number,
  gap: number
): GridLayout {
  let best: GridLayout = { cols: 1, rows: itemCount, cellSize: 0 };
  for (let cols = 1; cols <= itemCount; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const cellW = (width - gap * (cols - 1)) / cols;
    const cellH = (height - gap * (rows - 1)) / rows;
    const cellSize = Math.floor(Math.min(cellW, cellH));
    if (cellSize > best.cellSize) best = { cols, rows, cellSize };
  }
  return best;
}
