import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const handleAuthError = (event: ErrorEvent | PromiseRejectionEvent) => {
    const reasonValue = 'reason' in event ? event.reason : event.error;
    const message = reasonValue?.message || String(reasonValue || '');
    if (
      message.includes('auth/popup-closed-by-user') || 
      message.includes('popup-closed-by-user') || 
      message.includes('cancelled-by-user') ||
      message.includes('popup_closed_by_user')
    ) {
      console.warn('Gracefully suppressed auth popup close error:', message);
      event.preventDefault();
      event.stopPropagation();
    }
  };
  window.addEventListener('unhandledrejection', handleAuthError, true);
  window.addEventListener('error', handleAuthError, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
