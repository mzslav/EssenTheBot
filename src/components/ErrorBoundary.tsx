import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">{i18n.t('error_boundary.title')}</h2>
            <p className="text-sm text-white/50">
              {this.state.error?.message || i18n.t('error_boundary.unknown')}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            >
              {i18n.t('error_boundary.retry')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
