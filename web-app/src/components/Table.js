"use client";
import React from 'react';

export default function Table({ columns, data }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td
                  key={col.key}
                  style={col.style ? col.style(row) : undefined}
                  title={col.title ? col.title(row) : undefined}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
