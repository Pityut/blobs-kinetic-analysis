"use client";
import React, { useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
  AreaChart, Area, Legend,
  ReferenceLine,
} from 'recharts';
import { Download } from 'lucide-react';
import { useResults } from '@/hooks/useResults';
import { exportChart } from '@/utils/exportChart';
import Table from '@/components/Table';

const TRACK_COLUMNS = [
  { key: 'File', label: 'File', title: row => row.File, style: () => ({ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) },
  { key: 'track_id', label: 'Track ID' },
  { key: 'track_length_points', label: 'Length' },
  { key: 'start_mean_r', label: 'Start mean_r', render: row => row.start_mean_r?.toFixed(4) ?? 'N/A' },
  { key: 'end_mean_r', label: 'End mean_r', render: row => row.end_mean_r?.toFixed(4) ?? 'N/A' },
  { key: 'mean_dI_dt', label: 'Mean dI/dt', render: row => row.mean_dI_dt?.toFixed(4) ?? 'N/A' },
  { key: 'n_brightening_intervals', label: 'Bright' },
  { key: 'n_dimming_intervals', label: 'Dim' },
  { key: 'n_stable_intervals', label: 'Stable' },
];

const QC_COLUMNS = [
  { key: 'step', label: 'Step' },
  { key: 'metric', label: 'Metric' },
  { key: 'value', label: 'Value' },
];

export default function Dashboard({ results }) {
  const {
    totalTracks, totalBrightening, totalDimming, totalStable,
    trackChartData, trackTableData,
    aggregatedPointSummary, aggregatedIntervalSummary,
    aggregatedDirectionSummary, aggregatedQC,
    individualIntensityData, individualGradientData,
  } = useResults(results);

  const fourPanelRef = useRef(null);
  const directionRef = useRef(null);
  const barRef = useRef(null);

  const handleExport = useCallback((ref, filename) => {
    if (ref.current) exportChart(ref.current, filename);
  }, []);

  if (!results || results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
        No results to display. Run analysis first.
      </div>
    );
  }

  // Prepare individual intensity data per track for line chart
  const intensityByTrack = {};
  individualIntensityData.forEach(pt => {
    const key = `${pt.file}-T${pt.track_id}`;
    if (!intensityByTrack[key]) intensityByTrack[key] = [];
    intensityByTrack[key].push({ time_hr: pt.time_hr, mean_r: pt.mean_r, condition: pt.condition });
  });

  // Prepare individual gradient data per track
  const gradientByTrack = {};
  individualGradientData.forEach(iv => {
    const key = `${iv.file}-T${iv.track_id}`;
    if (!gradientByTrack[key]) gradientByTrack[key] = [];
    gradientByTrack[key].push({ time_mid_hr: iv.time_mid_hr, dI_dt: iv.dI_dt, condition: iv.condition });
  });

  // Prepare stacked direction data for area chart
  const directionChartData = aggregatedDirectionSummary.map(d => ({
    time_hr: d.time_mid_hr,
    brightening: d.fraction_brightening,
    dimming: d.fraction_dimming,
    stable: d.fraction_stable,
  }));

  return (
    <div>
      {/* QC Stats */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-title">Total Continuous Tracks</div>
          <div className="stat-value">{totalTracks}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Brightening Intervals</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{totalBrightening}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Dimming Intervals</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{totalDimming}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Stable Intervals</div>
          <div className="stat-value">{totalStable}</div>
        </div>
      </div>

      {/* 4-Panel Summary (matching notebook) */}
      <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
        <div className="chart-header">
          <h3 className="chart-title">Blob Kinetics Summary (4-Panel)</h3>
          <button className="btn-export" onClick={() => handleExport(fourPanelRef, '4panel_summary.png')}>
            <Download size={14} /> PNG
          </button>
        </div>
        <div ref={fourPanelRef}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* A: Individual mean_r */}
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>A. Individual mean_r over time</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                <XAxis dataKey="time_hr" type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Time (hr)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'mean_r', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                {Object.entries(intensityByTrack).slice(0, 30).map(([key, data]) => (
                  <Line key={key} data={data} dataKey="mean_r" dot={false} strokeWidth={1} opacity={0.5}
                    stroke={data[0]?.condition === 'WT' ? 'var(--accent-blue)' : 'var(--accent-red)'} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* B: Field mean mean_r ± SD */}
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>B. Field mean mean_r ± SD</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={aggregatedPointSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                <XAxis dataKey="time_hr" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="mean_mean_r" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }}
                  activeDot={{ r: 5 }} />
                {aggregatedPointSummary.length > 0 && aggregatedPointSummary.some(p => p.fields?.length > 1) && (
                  <Line type="monotone" dataKey="mean_mean_r" stroke="none"
                    dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* C: Individual dI/dt */}
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>C. Individual dI/dt over time</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                <XAxis dataKey="time_mid_hr" type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                {Object.entries(gradientByTrack).slice(0, 30).map(([key, data]) => (
                  <Line key={key} data={data} dataKey="dI_dt" dot={{ r: 2 }} strokeWidth={1} opacity={0.5}
                    stroke={data[0]?.condition === 'WT' ? 'var(--accent-blue)' : 'var(--accent-red)'} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* D: Field mean dI/dt ± SD */}
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>D. Field mean dI/dt ± SD</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={aggregatedIntervalSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                <XAxis dataKey="time_mid_hr" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="mean_dI_dt" stroke="var(--accent-green)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '12px', height: '3px', background: 'var(--accent-blue)', display: 'inline-block' }} /> WT
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '12px', height: '3px', background: 'var(--accent-red)', display: 'inline-block' }} /> KO
          </span>
        </div>
        </div>
      </div>

      {/* Direction Summary: Stacked Area */}
      {directionChartData.length > 0 && (
        <div className="glass-panel chart-container" ref={directionRef}>
          <div className="chart-header">
            <h3 className="chart-title">Direction Summary (Fraction per Timepoint)</h3>
            <button className="btn-export" onClick={() => handleExport(directionRef, 'direction_summary.png')}>
              <Download size={14} /> PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={directionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
              <XAxis dataKey="time_hr" tick={{ fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fill: 'var(--text-secondary)' }} domain={[0, 1]} />
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
              <Legend />
              <Area type="stepAfter" dataKey="brightening" stackId="1" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.6} />
              <Area type="stepAfter" dataKey="stable" stackId="1" stroke="var(--text-secondary)" fill="var(--text-secondary)" fillOpacity={0.3} />
              <Area type="stepAfter" dataKey="dimming" stackId="1" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mean dI/dt Bar Chart per Track */}
      <div className="glass-panel chart-container" ref={barRef}>
        <div className="chart-header">
          <h3 className="chart-title">Mean dI/dt per Track ({trackChartData.length} tracks)</h3>
          <button className="btn-export" onClick={() => handleExport(barRef, 'mean_dIdt_per_track.png')}>
            <Download size={14} /> PNG
          </button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trackChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
            <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="3 3" />
            <Bar dataKey="dI_dt" radius={[4, 4, 0, 0]}>
              {trackChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.dI_dt > 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* QC Attrition Table */}
      {aggregatedQC.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
          <h3 className="chart-title">Selection QC (Pipeline Attrition)</h3>
          <Table columns={QC_COLUMNS} data={aggregatedQC} />
        </div>
      )}

      {/* Track-Level Detail Table */}
      <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
        <h3 className="chart-title">Track-Level Summary ({trackTableData.length} tracks)</h3>
        <Table columns={TRACK_COLUMNS} data={trackTableData} />
      </div>
    </div>
  );
}
