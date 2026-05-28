import { DEFAULT_CONFIG } from './config';
import { computeIsolationMetricsAllFrames, markIsolatedBlobs } from './isolation';
import { buildBlobTracks, selectContinuousTracks } from './tracking';
import { computeIndividualKinetics, buildTrackLevelSummary } from './kinetics';
import { buildTimepointSummary, buildDirectionSummary, buildSelectionQC } from './summaries';

export { DEFAULT_CONFIG } from './config';

export function runPipeline(rawDf, customConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  let df = computeIsolationMetricsAllFrames(rawDf, config);
  const isoDf = markIsolatedBlobs(df, config);

  const trackedDf = buildBlobTracks(isoDf, config);
  const { finalDf, selectedDf } = selectContinuousTracks(trackedDf, config);

  const { selectedPointDf, selectedIntervalDf } = computeIndividualKinetics(selectedDf, config);
  const trackSummary = buildTrackLevelSummary(selectedPointDf, selectedIntervalDf, config);
  const { pointSummary, intervalSummary } = buildTimepointSummary(selectedPointDf, selectedIntervalDf, config);
  const directionSummary = buildDirectionSummary(selectedIntervalDf, config.stable_eps);
  const selectionQC = buildSelectionQC(rawDf, isoDf, trackedDf, selectedPointDf, selectedIntervalDf);

  return {
    rawDf: finalDf,
    selectedPointDf,
    selectedIntervalDf,
    trackSummary,
    pointSummary,
    intervalSummary,
    directionSummary,
    selectionQC,
  };
}
