"use client";

import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PosErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("=== POS ERROR BOUNDARY CAUGHT ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-10">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <div className="text-center max-w-lg">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Error en Punto de Venta</h2>
            <p className="font-mono text-sm text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 text-left break-all">
              {this.state.error?.message || "Error desconocido"}
            </p>
            {this.state.error?.stack && (
              <pre className="mt-2 font-mono text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-left overflow-x-auto max-h-40">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="h-12 px-8 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
