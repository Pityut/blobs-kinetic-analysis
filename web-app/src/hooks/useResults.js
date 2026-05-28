import { useMemo } from 'react';

export function useResults(results) {
  return useMemo(() => {
    if (!results || results.length === 0) {
      return {
        totalTracks: 0,
        totalBrightening: 0,
        totalDimming: 0,
        totalStable: 0,
        trackChartData: [],
        trackTableData: [],
        individualIntensityData: [],
        individualGradientData: [],
        aggregatedPointSummary: [],
        aggregatedIntervalSummary: [],
        aggregatedDirectionSummary: [],
        aggregatedQC: [],
      };
    }

    let totalTracks = 0;
    let totalBrightening = 0;
    let totalDimming = 0;
    let totalStable = 0;

    const trackChartData = [];
    const trackTableData = [];
    const individualIntensityData = [];
    const individualGradientData = [];

    results.forEach(res => {
      totalTracks += res.trackSummary.length;

      res.trackSummary.forEach(track => {
        totalBrightening += track.n_brightening_intervals;
        totalDimming += track.n_dimming_intervals;
        totalStable += track.n_stable_intervals;

        trackChartData.push({
          name: `${res.name.replace('.xlsx', '')}-T${track.track_id}`,
          dI_dt: track.mean_dI_dt,
          condition: res.condition,
        });

        trackTableData.push({
          File: res.name,
          Condition: res.condition,
          Replicate: res.replicate,
          ...track,
        });
      });

      // Individual intensity trajectories (point-level)
      if (res.selectedPointDf) {
        res.selectedPointDf.forEach(pt => {
          individualIntensityData.push({
            ...pt,
            file: res.name,
            condition: res.condition,
          });
        });
      }

      // Individual gradients (interval-level)
      if (res.selectedIntervalDf) {
        res.selectedIntervalDf.forEach(iv => {
          individualGradientData.push({
            ...iv,
            file: res.name,
            condition: res.condition,
          });
        });
      }
    });

    // Aggregate point summary across files
    const aggregatedPointSummary = aggregatePointSummary(results);
    const aggregatedIntervalSummary = aggregateIntervalSummary(results);
    const aggregatedDirectionSummary = aggregateDirectionSummary(results);
    const aggregatedQC = aggregateQC(results);

    return {
      totalTracks,
      totalBrightening,
      totalDimming,
      totalStable,
      trackChartData,
      trackTableData,
      individualIntensityData,
      individualGradientData,
      aggregatedPointSummary,
      aggregatedIntervalSummary,
      aggregatedDirectionSummary,
      aggregatedQC,
    };
  }, [results]);
}

function aggregatePointSummary(results) {
  const allPoints = [];
  results.forEach(res => {
    if (res.pointSummary) {
      res.pointSummary.forEach(p => allPoints.push({ ...p, file: res.name, condition: res.condition }));
    }
  });

  // Group by time_hr
  const byTime = {};
  allPoints.forEach(p => {
    const key = p.time_hr;
    if (!byTime[key]) byTime[key] = [];
    byTime[key].push(p);
  });

  return Object.entries(byTime)
    .map(([timeHr, points]) => {
      const means = points.map(p => p.mean_mean_r).filter(v => v != null);
      const ns = points.map(p => p.n_selected_blobs);
      const totalN = ns.reduce((a, b) => a + b, 0);
      const grandMean = means.length > 0 ? means.reduce((a, b) => a + b, 0) / means.length : null;

      return {
        time_hr: Number(timeHr),
        time_min: points[0]?.time_min,
        n_selected_blobs: totalN,
        mean_mean_r: grandMean,
        n_fields: points.length,
        fields: points,
      };
    })
    .sort((a, b) => a.time_hr - b.time_hr);
}

function aggregateIntervalSummary(results) {
  const allIntervals = [];
  results.forEach(res => {
    if (res.intervalSummary) {
      res.intervalSummary.forEach(iv => allIntervals.push({ ...iv, file: res.name, condition: res.condition }));
    }
  });

  const byTime = {};
  allIntervals.forEach(iv => {
    const key = iv.time_mid_hr;
    if (!byTime[key]) byTime[key] = [];
    byTime[key].push(iv);
  });

  return Object.entries(byTime)
    .map(([timeMidHr, intervals]) => {
      const means = intervals.map(iv => iv.mean_dI_dt).filter(v => v != null);
      const ns = intervals.map(iv => iv.n_intervals);
      const totalN = ns.reduce((a, b) => a + b, 0);
      const grandMean = means.length > 0 ? means.reduce((a, b) => a + b, 0) / means.length : null;

      return {
        time_mid_hr: Number(timeMidHr),
        time_mid_min: intervals[0]?.time_mid_min,
        n_intervals: totalN,
        mean_dI_dt: grandMean,
        n_fields: intervals.length,
        fields: intervals,
      };
    })
    .sort((a, b) => a.time_mid_hr - b.time_mid_hr);
}

function aggregateDirectionSummary(results) {
  const all = [];
  results.forEach(res => {
    if (res.directionSummary) {
      res.directionSummary.forEach(d => all.push(d));
    }
  });

  const byTime = {};
  all.forEach(d => {
    const key = d.time_mid_hr;
    if (!byTime[key]) byTime[key] = [];
    byTime[key].push(d);
  });

  return Object.entries(byTime)
    .map(([timeMidHr, rows]) => {
      const totalN = rows.reduce((s, r) => s + r.n_intervals, 0);
      const totalBright = rows.reduce((s, r) => s + r.n_brightening, 0);
      const totalDim = rows.reduce((s, r) => s + r.n_dimming, 0);
      const totalStable = rows.reduce((s, r) => s + r.n_stable, 0);

      return {
        time_mid_hr: Number(timeMidHr),
        time_mid_min: rows[0]?.time_mid_min,
        n_intervals: totalN,
        fraction_brightening: totalN > 0 ? totalBright / totalN : 0,
        fraction_dimming: totalN > 0 ? totalDim / totalN : 0,
        fraction_stable: totalN > 0 ? totalStable / totalN : 0,
      };
    })
    .sort((a, b) => a.time_mid_hr - b.time_mid_hr);
}

function aggregateQC(results) {
  if (results.length === 0) return [];

  // Sum QC values across all files
  const merged = {};
  results.forEach(res => {
    if (!res.selectionQC) return;
    res.selectionQC.forEach(row => {
      const key = `${row.step}_${row.metric}`;
      if (!merged[key]) {
        merged[key] = { step: row.step, metric: row.metric, value: 0 };
      }
      merged[key].value += row.value;
    });
  });

  return Object.values(merged);
}
