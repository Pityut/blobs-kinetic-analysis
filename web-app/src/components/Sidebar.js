"use client";
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Trash2 } from 'lucide-react';

const FIELDS = [
  { name: 'min_nn_distance', label: 'Min NN Distance', min: 0, max: 50, step: 0.5 },
  { name: 'max_link_distance', label: 'Max Link Distance', min: 0, max: 50, step: 0.5 },
  { name: 'frame_interval_min', label: 'Frame Interval (min)', min: 1, max: 120, step: 1 },
  { name: 'min_consecutive_frames', label: 'Min Consecutive Frames', min: 1, max: 20, step: 1 },
  { name: 'stable_eps', label: 'Stable Threshold (dI/dt)', min: 0, max: 1, step: 0.01 },
];

function ConfigField({ name, label, min, max, step, value, onChange }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const num = Number(draft);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        />
      </div>
    </div>
  );
}

function parseConditionAndReplicate(filename) {
  let condition = "Unknown";
  let replicate = "Unknown";
  const lower = filename.toLowerCase();
  if (lower.includes('wt')) condition = "WT";
  else if (lower.includes('ko')) condition = "KO";
  const repMatch = lower.match(/replicate\s*(\d+)/);
  if (repMatch) replicate = `Replicate ${repMatch[1]}`;
  return { condition, replicate };
}

export default function Sidebar({ config, setConfig, files, setFiles, onRun, processing }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (newFiles) => {
    for (const file of newFiles) {
      if (!file.name.endsWith('.xlsx')) continue;
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      const { condition, replicate } = parseConditionAndReplicate(file.name);
      setFiles(prev => [...prev, { id: crypto.randomUUID(), name: file.name, data: json, condition, replicate }]);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateMetadata = (id, field, value) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (name, value) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sidebar">
      <h2>Upload Data</h2>

      <div
        className={`sidebar-upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={24} />
        <span>Drop .xlsx or click</span>
        <input type="file" multiple accept=".xlsx" ref={fileInputRef} style={{ display: 'none' }} onChange={e => handleFiles(Array.from(e.target.files))} />
      </div>

      {files.length > 0 && (
        <div className="sidebar-file-list">
          {files.map(f => (
            <div key={f.id} className="sidebar-file-card">
              <div className="sidebar-file-row">
                <FileSpreadsheet size={14} />
                <span className="sidebar-file-name">{f.name}</span>
                <button className="btn" style={{ background: 'transparent', color: 'var(--accent-red)', padding: '2px', marginLeft: 'auto' }} onClick={() => removeFile(f.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="sidebar-meta-row">
                <select
                  value={f.condition}
                  onChange={e => updateMetadata(f.id, 'condition', e.target.value)}
                  className="sidebar-meta-input"
                >
                  <option value="WT">WT</option>
                  <option value="KO">KO</option>
                </select>
                <div className="sidebar-replicate">
                  <span>Replicate</span>
                  <input
                    type="number"
                    min={1}
                    value={f.replicate.replace('Replicate ', '')}
                    onChange={e => updateMetadata(f.id, 'replicate', `Replicate ${e.target.value}`)}
                    className="sidebar-meta-input sidebar-no-spin"
                    style={{ width: '48px' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-divider" />

      <h2>Configuration</h2>
      {FIELDS.map(({ name, label, min, max, step }) => (
        <ConfigField
          key={name}
          name={name}
          label={label}
          min={min}
          max={max}
          step={step}
          value={config[name]}
          onChange={v => handleChange(name, v)}
        />
      ))}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={onRun} disabled={processing || files.length === 0}>
        {processing ? 'Processing...' : 'Run Analysis'}
      </button>
    </div>
  );
}
