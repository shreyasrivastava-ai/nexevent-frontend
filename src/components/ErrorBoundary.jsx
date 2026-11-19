// Frontend: src/components/ErrorBoundary.jsx
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Safely parse the error so it doesn't crash the console logger
    let parsedError = error;
    if (error?.message && Array.isArray(error.message)) {
      parsedError = { ...error, message: error.message.map(m => m.msg || JSON.stringify(m)).join(', ') };
    }
    console.error('[ErrorBoundary]', parsedError, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    // Safely extract the message for potential future display
    let displayMessage = "The page hit an unexpected error. Reloading usually fixes it.";
    const err = this.state.error;
    
    if (err) {
      if (typeof err === 'string') {
        displayMessage = err;
      } else if (err.message) {
        if (typeof err.message === 'string') {
          displayMessage = err.message;
        } else if (Array.isArray(err.message)) {
          displayMessage = err.message.map(m => m.msg || JSON.stringify(m)).join(', ');
        } else {
          displayMessage = JSON.stringify(err.message);
        }
      } else if (Array.isArray(err)) {
        displayMessage = err.map(m => m.msg || JSON.stringify(m)).join(', ');
      }
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {displayMessage}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077b3]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload page
        </button>
      </div>
    );
  }
}