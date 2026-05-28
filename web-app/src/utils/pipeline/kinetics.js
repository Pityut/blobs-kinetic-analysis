import { groupBy } from './helpers';

export function computeIndividualKinetics(selectedDf, config) {
  const { frame_col, intensity_col, frame_interval_min, stable_eps } = config;

  const groupedByTrack = groupBy(selectedDf, 'track_id');

  const selectedPointDf = [];
  const selectedIntervalDf = [];

  for (const [trackIdStr, rows] of Object.entries(groupedByTrack)) {
    const trackId = Number(trackIdStr);
    rows.sort((a, b) => a[frame_col] - b[frame_col]);

    for (const row of rows) {
      const timeMin = row[frame_col] * frame_interval_min;
      selectedPointDf.push({
        ...row,
        time_min: timeMin,
        time_hr: timeMin / 60.0,
      });
    }

    for (let i = 0; i < rows.length - 1; i++) {
      const rowT = rows[i];
      const rowT1 = rows[i + 1];

      const frameT = rowT[frame_col];
      const frameT1 = rowT1[frame_col];

      const timeTMin = frameT * frame_interval_min;
      const timeT1Min = frameT1 * frame_interval_min;
      const timeTHr = timeTMin / 60.0;
      const timeT1Hr = timeT1Min / 60.0;

      const it = rowT[intensity_col];
      const it1 = rowT1[intensity_col];

      const deltaTimeHr = timeT1Hr - timeTHr;
      const deltaIntensity = it1 - it;
      const dIdt = (deltaTimeHr === 0) ? null : deltaIntensity / deltaTimeHr;

      let phaseClass = "undefined";
      if (dIdt !== null) {
        if (dIdt > stable_eps) phaseClass = "brightening";
        else if (dIdt < -stable_eps) phaseClass = "dimming";
        else phaseClass = "stable";
      }

      selectedIntervalDf.push({
        track_id: trackId,
        frame_t: frameT,
        frame_t1: frameT1,
        time_t_min: timeTMin,
        time_t1_min: timeT1Min,
        time_mid_min: (timeTMin + timeT1Min) / 2.0,
        time_t_hr: timeTHr,
        time_t1_hr: timeT1Hr,
        time_mid_hr: (timeTHr + timeT1Hr) / 2.0,
        delta_time_hr: deltaTimeHr,
        I_t: it,
        I_t1: it1,
        delta_intensity: deltaIntensity,
        dI_dt: dIdt,
        phase_class: phaseClass,
      });
    }
  }

  return { selectedPointDf, selectedIntervalDf };
}

export function buildTrackLevelSummary(selectedPointDf, selectedIntervalDf, config) {
  const { frame_col, intensity_col } = config;
  const groupedPoints = groupBy(selectedPointDf, 'track_id');
  const groupedIntervals = groupBy(selectedIntervalDf, 'track_id');

  const rows = [];

  for (const [trackIdStr, ptRows] of Object.entries(groupedPoints)) {
    ptRows.sort((a, b) => a[frame_col] - b[frame_col]);

    const intRows = groupedIntervals[trackIdStr] || [];

    const frames = ptRows.map(r => r[frame_col]);
    const intensities = ptRows.map(r => r[intensity_col]);
    const gradients = intRows.map(r => r.dI_dt).filter(v => v !== null);

    rows.push({
      track_id: Number(trackIdStr),
      track_length_points: frames.length,
      track_length_intervals: intRows.length,
      first_frame: Math.min(...frames),
      last_frame: Math.max(...frames),
      first_time_min: Math.min(...ptRows.map(r => r.time_min)),
      last_time_min: Math.max(...ptRows.map(r => r.time_min)),
      first_time_hr: Math.min(...ptRows.map(r => r.time_hr)),
      last_time_hr: Math.max(...ptRows.map(r => r.time_hr)),
      start_mean_r: intensities[0],
      end_mean_r: intensities[intensities.length - 1],
      min_mean_r: Math.min(...intensities),
      max_mean_r: Math.max(...intensities),
      mean_mean_r: intensities.reduce((a, b) => a + b, 0) / intensities.length,
      mean_dI_dt: gradients.length ? gradients.reduce((a, b) => a + b, 0) / gradients.length : null,
      max_dI_dt: gradients.length ? Math.max(...gradients) : null,
      min_dI_dt: gradients.length ? Math.min(...gradients) : null,
      n_brightening_intervals: intRows.filter(r => r.phase_class === 'brightening').length,
      n_dimming_intervals: intRows.filter(r => r.phase_class === 'dimming').length,
      n_stable_intervals: intRows.filter(r => r.phase_class === 'stable').length,
    });
  }

  return rows;
}
