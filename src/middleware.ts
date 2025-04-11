import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logInfo, logError } from './utils/logger';
import * as Sentry from '@sentry/nextjs';

export async function middleware(request: NextRequest) {
  const requestStart = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  try {
    // Log request
    logInfo('API Request', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    });

    // Wait for the response
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Calculate duration
    const duration = Date.now() - requestStart;

    // Log response
    logInfo('API Response', {
      requestId,
      status: response.status,
      duration,
    });

    // Add timing headers
    response.headers.set('Server-Timing', `total;dur=${duration}`);
    response.headers.set('x-request-id', requestId);

    return response;
  } catch (error) {
    const duration = Date.now() - requestStart;

    // Log error
    logError(error as Error, {
      requestId,
      duration,
      url: request.url,
    });

    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        requestId,
      },
    });

    // Return error response
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          'Server-Timing': `total;dur=${duration}`,
        },
      }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
}; 