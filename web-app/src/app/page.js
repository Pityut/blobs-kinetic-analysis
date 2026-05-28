"use client";
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import UploadZone from '@/components/UploadZone';
import Dashboard from '@/components/Dashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DEFAULT_CONFIG, runPipeline } from '@/utils/pipeline';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);

    // Yield to let React render the processing state before synchronous work
    setTimeout(() => {
      try {
        const out = [];
        for (const file of files) {
          const res = runPipeline(file.data, config);
          out.push({
            id: file.id,
            name: file.name,
            condition: file.condition,
            replicate: file.replicate,
            ...res,
          });
        }
        setResults(out);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Processing failed. Check console.');
      } finally {
        setProcessing(false);
      }
    }, 0);
  };

  const handleExport = () => {
    if (!results) return;

    const wb = XLSX.utils.book_new();

    results.forEach(res => {
      const baseName = res.name.replace('.xlsx', '').substring(0, 25);

      // Track summary sheet
      if (res.trackSummary.length > 0) {
        const ws = XLSX.utils.json_to_sheet(res.trackSummary);
        XLSX.utils.book_append_sheet(wb, ws, `${baseName}_tracks`);
      }

      // Point summary
      if (res.pointSummary && res.pointSummary.length > 0) {
        const ws = XLSX.utils.json_to_sheet(res.pointSummary);
        XLSX.utils.book_append_sheet(wb, ws, `${baseName}_pts`);
      }

      // Interval summary
      if (res.intervalSummary && res.intervalSummary.length > 0) {
        const ws = XLSX.utils.json_to_sheet(res.intervalSummary);
        XLSX.utils.book_append_sheet(wb, ws, `${baseName}_iv`);
      }

      // Direction summary
      if (res.directionSummary && res.directionSummary.length > 0) {
        const ws = XLSX.utils.json_to_sheet(res.directionSummary);
        XLSX.utils.book_append_sheet(wb, ws, `${baseName}_dir`);
      }
    });

    XLSX.writeFile(wb, "Blob_Kinetics_Results.xlsx");
  };

  return (
    <div className="layout-container">
      <Sidebar config={config} setConfig={setConfig} onRun={handleRun} processing={processing} />
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Blob Kinetics Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Upload your raw tracking data and configure parameters to compute dI/dt kinetics.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {results && (
              <button className="btn btn-success" onClick={handleExport}>
                <Download size={18} /> Export Excel
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        <UploadZone files={files} setFiles={setFiles} />

        {error && (
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', borderColor: 'var(--accent-red)' }}>
            <p style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}

        <ErrorBoundary>
          <Dashboard results={results} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
