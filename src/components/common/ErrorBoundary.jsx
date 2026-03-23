import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary — catches render/lifecycle errors in any child component tree.
 * Prevents a single page crash from blanking the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 *
 *   Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <SomePage />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in all environments; swap for an error-reporting
    // service (Sentry, Datadog, etc.) when you're ready.
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow callers to supply their own fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              This section ran into an unexpected error. You can try reloading
              it, or head back to the home page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="error-boundary-detail">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="error-boundary-actions">
              <button className="error-boundary-btn primary" onClick={this.handleRetry}>
                Try again
              </button>
              <a className="error-boundary-btn secondary" href="/">
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
