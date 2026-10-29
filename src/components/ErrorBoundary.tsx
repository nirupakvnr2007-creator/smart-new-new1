import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Smart Inventory Assistant] Uncaught UI exception:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4 font-sans text-[#0b1c30]">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>

            <div className="space-y-1">
              <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
                Smart Inventory Assistant
              </h2>
              <p className="text-[13px] text-[#565e74]">
                The application encountered an unexpected display issue. Your stored data and inventory records are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#eff4ff] border border-[#dae2fd] rounded-lg text-left text-[11px] font-mono text-[#0037b0] break-all max-h-32 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-lg text-[13px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-[#eff4ff] hover:bg-[#dae2fd] text-[#565e74] hover:text-[#0b1c30] rounded-lg text-[13px] font-bold transition-all cursor-pointer border border-[#c3cadb]"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
