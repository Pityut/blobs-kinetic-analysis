"use client";
import React from 'react';

export default function Sidebar({ config, setConfig, onRun, processing }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  return (
    <div className="sidebar">
      <h2>Configuration</h2>
      <div className="form-group">
        <label>Min NN Distance</label>
        <input type="number" name="min_nn_distance" value={config.min_nn_distance} onChange={handleChange} step="0.1" />
      </div>
      <div className="form-group">
        <label>Max Link Distance</label>
        <input type="number" name="max_link_distance" value={config.max_link_distance} onChange={handleChange} step="0.1" />
      </div>
      <div className="form-group">
        <label>Frame Interval (min)</label>
        <input type="number" name="frame_interval_min" value={config.frame_interval_min} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Min Consecutive Frames</label>
        <input type="number" name="min_consecutive_frames" value={config.min_consecutive_frames} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Stable Threshold (dI/dt)</label>
        <input type="number" name="stable_eps" value={config.stable_eps} onChange={handleChange} step="0.01" />
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={onRun} disabled={processing}>
        {processing ? 'Processing...' : 'Run Analysis'}
      </button>
    </div>
  );
}
