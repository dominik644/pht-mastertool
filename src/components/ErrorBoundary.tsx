import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Called before clearing error state (e.g. reset provider state). */
  onReset?: () => void;
  resetLabel?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      const resetLabel = this.props.resetLabel ?? 'Erneut versuchen';
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-lg font-semibold text-white">App-Fehler</h1>
            <p className="text-sm text-slate-400">
              Die Anwendung konnte nicht geladen werden. Bitte erneut versuchen oder Seite neu laden.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-pht-600 text-white text-sm font-medium min-h-[44px]"
              >
                {resetLabel}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl border border-dark-500 text-slate-300 text-sm font-medium min-h-[44px] hover:bg-dark-700"
              >
                Neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
