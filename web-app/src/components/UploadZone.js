"use client";
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Trash2 } from 'lucide-react';
import Table from '@/components/Table';

const FILE_COLUMNS = [
  {
    key: 'name',
    label: 'File Name',
    render: row => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileSpreadsheet size={16} /> {row.name}
      </div>
    ),
  },
  {
    key: 'condition',
    label: 'Condition',
    render: (row, _col, { updateMetadata }) => (
      <input
        type="text"
        value={row.condition}
        onChange={(e) => updateMetadata(row.id, 'condition', e.target.value)}
        style={{ padding: '4px 8px', width: '100px' }}
      />
    ),
  },
  {
    key: 'replicate',
    label: 'Replicate',
    render: (row, _col, { updateMetadata }) => (
      <input
        type="text"
        value={row.replicate}
        onChange={(e) => updateMetadata(row.id, 'replicate', e.target.value)}
        style={{ padding: '4px 8px', width: '100px' }}
      />
    ),
  },
  { key: 'rows', label: 'Rows', render: row => row.data.length },
  {
    key: 'action',
    label: 'Action',
    render: (row, _col, { removeFile }) => (
      <button
        className="btn"
        style={{ background: 'transparent', color: 'var(--accent-red)', padding: '4px' }}
        onClick={() => removeFile(row.id)}
      >
        <Trash2 size={16} />
      </button>
    ),
  },
];

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

export default function UploadZone({ files, setFiles }) {
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

      setFiles(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: file.name,
          data: json,
          condition,
          replicate,
        },
      ]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateMetadata = (id, field, value) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Enhance columns with callbacks for the shared Table
  const columnsWithContext = FILE_COLUMNS.map(col => ({
    ...col,
    render: col.render
      ? (row) => col.render(row, col, { removeFile, updateMetadata })
      : undefined,
  }));

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ marginBottom: '16px' }}>Upload Raw Data (.xlsx)</h2>

      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={48} color="var(--accent-blue)" />
        <p>Drag & Drop your Excel files here, or click to select</p>
        <input
          type="file"
          multiple
          accept=".xlsx"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
      </div>

      {files.length > 0 && <Table columns={columnsWithContext} data={files} />}
    </div>
  );
}
