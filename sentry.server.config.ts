// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events if Sentry is not configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }

    // Filter out password fields and sensitive data
    if (event.request?.data) {
      const data = event.request.data as any;
      if (data.password) data.password = '[Filtered]';
      if (data.newPassword) data.newPassword = '[Filtered]';
      if (data.currentPassword) data.currentPassword = '[Filtered]';
      if (data.token) data.token = '[Filtered]';
      if (data.apiKey) data.apiKey = '[Filtered]';
    }

    // Filter out sensitive headers
    if (event.request?.headers) {
      const headers = event.request.headers as any;
      if (headers.authorization) headers.authorization = '[Filtered]';
      if (headers.cookie) headers.cookie = '[Filtered]';
    }

    return event;
  },
});
