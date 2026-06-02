// Forge Fit — Error Handling & Response Formatting Utilities
import { NextResponse } from 'next/server';
import { z } from 'zod';

/** Zod validation error response. */
export function validationError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}

/** Authentication error response (401). */
export function authError(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Not found error response (404). */
export function notFoundError(message = 'Resource not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Conflict / duplicate error response (409). */
export function conflictError(message = 'Resource already exists') {
  return NextResponse.json({ error: message }, { status: 409 });
}

/** Internal server error response (500). */
export function serverError(error: unknown, context = '') {
  console.error(`Server error${context ? ` [${context}]` : ''}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Handle common error types from route handler catch blocks. */
export function handleRouteError(error: unknown, context = '') {
  if (error && typeof error === 'object' && 'status' in error && (error as any).status === 401) {
    return authError((error as any).error);
  }
  if (error instanceof z.ZodError) {
    return validationError(error);
  }
  return serverError(error, context);
}
