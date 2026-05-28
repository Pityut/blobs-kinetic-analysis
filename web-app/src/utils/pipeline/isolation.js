import { euclideanDistance, groupBy } from './helpers';

export function computeFrameIsolationMetrics(frameRows, config) {
  const { x_col, y_col, radius_col, overlap_margin, overlap_factor } = config;
  const n = frameRows.length;

  if (n === 1) {
    return [{
      ...frameRows[0],
      nn_distance: null,
      min_center_distance: null,
      is_overlapping: false,
      overlap_neighbor_count: 0,
    }];
  }

  return frameRows.map((rowI, i) => {
    const xi = rowI[x_col];
    const yi = rowI[y_col];
    const ri = rowI[radius_col];

    let distances = [];
    let overlapCount = 0;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const rowJ = frameRows[j];
      const xj = rowJ[x_col];
      const yj = rowJ[y_col];
      const rj = rowJ[radius_col];

      const d = euclideanDistance(xi, yi, xj, yj);
      distances.push(d);

      if (d <= (overlap_factor * (ri + rj) + overlap_margin)) {
        overlapCount++;
      }
    }

    const nn_distance = Math.min(...distances);

    return {
      ...rowI,
      nn_distance,
      min_center_distance: nn_distance,
      is_overlapping: overlapCount > 0,
      overlap_neighbor_count: overlapCount,
    };
  });
}

export function computeIsolationMetricsAllFrames(df, config) {
  const grouped = groupBy(df, config.frame_col);
  const frames = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  let result = [];
  for (const frame of frames) {
    result = result.concat(computeFrameIsolationMetrics(grouped[frame], config));
  }
  return result;
}

export function markIsolatedBlobs(df, config) {
  const minNnDistance = config.min_nn_distance;
  const useOverlap = config.use_overlap_for_isolation;

  return df.map(row => {
    const nnOk = row.nn_distance === null || row.nn_distance >= minNnDistance;
    const overlapOk = !row.is_overlapping;

    return {
      ...row,
      is_isolated: useOverlap ? (nnOk && overlapOk) : nnOk,
    };
  });
}
