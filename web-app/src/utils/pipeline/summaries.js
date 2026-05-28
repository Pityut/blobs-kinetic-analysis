import { groupBy } from './helpers';

export function buildTimepointSummary(selectedPointDf, selectedIntervalDf, config) {
  const intensityCol = config.intensity_col;

  // Point-level summary: group by time
  const pointGroups = groupBy(
    selectedPointDf.filter(r => r.time_min != null),
    r => r.time_min
  );

  const pointSummary = Object.entries(pointGroups)
    .map(([timeMin, rows]) => {
      const intensities = rows.map(r => r[intensityCol]).filter(v => v != null);
      const timeHr = rows[0]?.time_hr ?? Number(timeMin) / 60;
      const n = intensities.length;
      const mean = n > 0 ? intensities.reduce((a, b) => a + b, 0) / n : null;
      const std = n > 1
        ? Math.sqrt(intensities.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
        : null;

      return {
        time_min: Number(timeMin),
        time_hr: timeHr,
        n_selected_blobs: n,
        mean_mean_r: mean,
        std_mean_r: std,
        min_mean_r: n > 0 ? Math.min(...intensities) : null,
        max_mean_r: n > 0 ? Math.max(...intensities) : null,
      };
    })
    .sort((a, b) => a.time_hr - b.time_hr);

  // Interval-level summary: group by midpoint time
  const intervalGroups = groupBy(
    selectedIntervalDf.filter(r => r.time_mid_min != null),
    r => r.time_mid_min
  );

  const intervalSummary = Object.entries(intervalGroups)
    .map(([timeMidMin, rows]) => {
      const gradients = rows.map(r => r.dI_dt).filter(v => v != null);
      const timeMidHr = rows[0]?.time_mid_hr ?? Number(timeMidMin) / 60;
      const n = gradients.length;
      const mean = n > 0 ? gradients.reduce((a, b) => a + b, 0) / n : null;
      const std = n > 1
        ? Math.sqrt(gradients.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
        : null;

      return {
        time_mid_min: Number(timeMidMin),
        time_mid_hr: timeMidHr,
        n_intervals: n,
        mean_dI_dt: mean,
        std_dI_dt: std,
        min_dI_dt: n > 0 ? Math.min(...gradients) : null,
        max_dI_dt: n > 0 ? Math.max(...gradients) : null,
      };
    })
    .sort((a, b) => a.time_mid_hr - b.time_mid_hr);

  return { pointSummary, intervalSummary };
}

export function buildDirectionSummary(selectedIntervalDf, stableEps = 1e-6) {
  if (!selectedIntervalDf || selectedIntervalDf.length === 0) {
    return [];
  }

  const classify = (dIdt) => {
    if (dIdt == null) return 'undefined';
    if (dIdt > stableEps) return 'brightening';
    if (dIdt < -stableEps) return 'dimming';
    return 'stable';
  };

  const withClass = selectedIntervalDf.map(r => ({
    ...r,
    phase_class: classify(r.dI_dt),
  }));

  const grouped = groupBy(withClass, r => r.time_mid_min);

  return Object.entries(grouped)
    .map(([timeMidMin, rows]) => {
      const n = rows.length;
      const nBright = rows.filter(r => r.phase_class === 'brightening').length;
      const nDim = rows.filter(r => r.phase_class === 'dimming').length;
      const nStable = rows.filter(r => r.phase_class === 'stable').length;
      const nUndef = rows.filter(r => r.phase_class === 'undefined').length;

      return {
        time_mid_min: Number(timeMidMin),
        time_mid_hr: rows[0]?.time_mid_hr ?? Number(timeMidMin) / 60,
        n_intervals: n,
        n_brightening: nBright,
        n_dimming: nDim,
        n_stable: nStable,
        n_undefined: nUndef,
        fraction_brightening: n > 0 ? nBright / n : 0,
        fraction_dimming: n > 0 ? nDim / n : 0,
        fraction_stable: n > 0 ? nStable / n : 0,
      };
    })
    .sort((a, b) => a.time_mid_hr - b.time_mid_hr);
}

export function buildSelectionQC(rawDf, isoDf, trackedDf, selectedPointDf, selectedIntervalDf) {
  const totalRaw = rawDf.length;
  const totalIsolated = isoDf.filter(r => r.is_isolated).length;
  const totalTracks = new Set(trackedDf.filter(r => r.track_id != null).map(r => r.track_id)).size;
  const totalSelectedPoints = selectedPointDf.length;
  const totalSelectedTracks = new Set(selectedPointDf.map(r => r.track_id)).size;
  const totalSelectedIntervals = selectedIntervalDf.length;

  return [
    { step: 'raw_input', metric: 'total_rows', value: totalRaw },
    { step: 'isolation', metric: 'isolated_rows', value: totalIsolated },
    { step: 'tracking', metric: 'total_tracks', value: totalTracks },
    { step: 'selection', metric: 'selected_points', value: totalSelectedPoints },
    { step: 'selection', metric: 'selected_tracks', value: totalSelectedTracks },
    { step: 'kinetics', metric: 'selected_intervals', value: totalSelectedIntervals },
  ];
}
