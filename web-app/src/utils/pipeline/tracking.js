import { euclideanDistance, groupBy } from './helpers';

export function linkTwoConsecutiveFrames(rowsT, rowsT1, config) {
  const { x_col, y_col, radius_col, max_link_distance, max_radius_delta } = config;

  let candidates = [];
  for (let i = 0; i < rowsT.length; i++) {
    const rowT = rowsT[i];
    const xt = rowT[x_col];
    const yt = rowT[y_col];
    const rt = rowT[radius_col];

    for (let j = 0; j < rowsT1.length; j++) {
      const rowT1 = rowsT1[j];
      const x1 = rowT1[x_col];
      const y1 = rowT1[y_col];
      const r1 = rowT1[radius_col];

      const d = euclideanDistance(xt, yt, x1, y1);
      if (d > max_link_distance) continue;

      if (max_radius_delta !== null && max_radius_delta !== undefined) {
        if (Math.abs(rt - r1) > max_radius_delta) continue;
      }

      candidates.push({ row_index_t: i, row_index_t1: j, link_distance: d });
    }
  }

  candidates.sort((a, b) => a.link_distance - b.link_distance);

  const usedT = new Set();
  const usedT1 = new Set();
  const accepted = [];

  for (const cand of candidates) {
    if (usedT.has(cand.row_index_t) || usedT1.has(cand.row_index_t1)) continue;

    usedT.add(cand.row_index_t);
    usedT1.add(cand.row_index_t1);
    accepted.push(cand);
  }

  return accepted;
}

export function buildBlobTracks(df, config) {
  const frameCol = config.frame_col;
  const isoRows = df.filter(r => r.is_isolated);
  const grouped = groupBy(isoRows, frameCol);
  const frames = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  let nextTrackId = 1;
  const trackIdMap = new Map();

  for (let fIdx = 0; fIdx < frames.length - 1; fIdx++) {
    const frameT = frames[fIdx];
    const frameT1 = frames[fIdx + 1];

    if (frameT1 !== frameT + 1) continue;

    const rowsT = grouped[frameT];
    const rowsT1 = grouped[frameT1];

    const links = linkTwoConsecutiveFrames(rowsT, rowsT1, config);

    for (const link of links) {
      const rowT = rowsT[link.row_index_t];
      const rowT1 = rowsT1[link.row_index_t1];

      let trackId = trackIdMap.get(rowT);
      if (trackId === undefined) {
        trackId = nextTrackId++;
        trackIdMap.set(rowT, trackId);
      }
      trackIdMap.set(rowT1, trackId);
    }
  }

  return df.map(row => ({
    ...row,
    track_id: trackIdMap.get(row) ?? null,
  }));
}

function isConsecutiveTrack(rows, frameCol) {
  const frames = [...new Set(rows.map(r => r[frameCol]))].sort((a, b) => a - b);
  if (frames.length < 2) return false;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i] - frames[i - 1] !== 1) return false;
  }
  return true;
}

export function selectContinuousTracks(df, config) {
  const minConsecutive = config.min_consecutive_frames;

  const trackedRows = df.filter(r => r.track_id !== null);
  const groupedByTrack = groupBy(trackedRows, 'track_id');

  const validTrackIds = new Set();

  for (const [trackId, rows] of Object.entries(groupedByTrack)) {
    if (rows.length >= minConsecutive && isConsecutiveTrack(rows, config.frame_col)) {
      validTrackIds.add(Number(trackId));
    }
  }

  const selectedDf = df
    .filter(r => r.track_id !== null && validTrackIds.has(r.track_id))
    .map(r => ({ ...r }));

  return { finalDf: df.map(r => ({
    ...r,
    track_id: (r.track_id !== null && validTrackIds.has(r.track_id)) ? r.track_id : null,
  })), selectedDf };
}
