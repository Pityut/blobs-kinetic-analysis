"use client";
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{ padding: '32px', margin: '24px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
