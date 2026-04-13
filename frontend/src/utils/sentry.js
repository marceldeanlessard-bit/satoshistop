import * as Sentry from '@sentry/react';

let isInitialized = false;

export const initSentry = () => {
  if (isInitialized || !import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: [
          'localhost',
          /^\//,
          import.meta.env.VITE_API_URL || 'http://localhost:3000',
        ],
      }),
      new Sentry.Replay({
        slimRouting: true,
      }),
    ],
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
    replaysSessionSampleRate: import.meta.env.DEV ? 0.1 : 0.025,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    release: `satoshi-stop@${import.meta.env.PKG_VERSION || 'dev'}`,
  });

  isInitialized = true;
};

export const captureException = (error, context) => {
  if (window.Sentry) {
    window.Sentry.captureException(error, context);
  }
};

export const addBreadcrumb = (message, data) => {
  if (window.Sentry) {
    window.Sentry.addBreadcrumb({
      message,
      data,
      level: 'info',
    });
  }
};

// Export for global access
window.Sentry = Sentry;

