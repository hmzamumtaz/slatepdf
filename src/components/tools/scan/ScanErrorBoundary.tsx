'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface State {
  failed: boolean;
}

/**
 * If anything in the scanner throws while rendering, show a way back instead
 * of a blank screen. Scanned pages are saved on the device as they're made,
 * so reloading brings them back.
 */
export default class ScanErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Scan PDF crashed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="max-w-md mx-auto my-16 px-6 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
        <p className="text-lg font-semibold text-foreground">Something went wrong in the scanner</p>
        <p className="text-sm text-muted-foreground mt-2">Your scanned pages are saved on this device. Reload to pick up where you left off.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Reload scanner
        </button>
      </div>
    );
  }
}
