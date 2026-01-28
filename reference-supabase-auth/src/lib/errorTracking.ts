/**
 * Error Tracking and Logging Utility for Streaming
 * Captures errors with context and logs them
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory =
    | 'permission'
    | 'network'
    | 'media_device'
    | 'webrtc'
    | 'validation'
    | 'rate_limit'
    | 'unknown';

export interface ErrorContext {
    streamId?: string;
    userId?: string;
    action?: string;
    component?: string;
    userAgent?: string;
    url?: string;
    [key: string]: unknown;
}

export interface StreamError {
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    context?: ErrorContext;
    stack?: string;
    timestamp: Date;
}

/**
 * Categorizes error based on message and type
 */
function categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('permission') || message.includes('not allowed')) {
        return 'permission';
    }

    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
        return 'network';
    }

    if (message.includes('camera') || message.includes('microphone') || message.includes('media')) {
        return 'media_device';
    }

    if (message.includes('webrtc') || message.includes('peer') || message.includes('room')) {
        return 'webrtc';
    }

    if (message.includes('validation') || message.includes('invalid')) {
        return 'validation';
    }

    if (message.includes('rate limit') || message.includes('too many')) {
        return 'rate_limit';
    }

    return 'unknown';
}

/**
 * Determines severity based on error type
 */
function determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that prevent streaming entirely
    if (category === 'permission' || category === 'rate_limit') {
        return 'critical';
    }

    // Errors that might be recoverable
    if (category === 'network' || category === 'webrtc') {
        return 'error';
    }

    // Warnings for validation issues
    if (category === 'validation') {
        return 'warning';
    }

    return 'error';
}

/**
 * Capture and log error
 */
export async function captureStreamError(
    error: Error | string,
    context?: ErrorContext,
    severity?: ErrorSeverity
): Promise<void> {
    try {
        const errorObj = typeof error === 'string' ? new Error(error) : error;
        const category = categorizeError(errorObj);
        const finalSeverity = severity || determineSeverity(errorObj, category);

        // Build context
        const fullContext: ErrorContext = {
            ...context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
        };

        // Log to console
        if (process.env.NODE_ENV === 'development') {
            console.error('[Stream Error]', {
                message: errorObj.message,
                category,
                severity: finalSeverity,
                context: fullContext,
                stack: errorObj.stack,
            });
        } else {
            // In production, log minimal info
            console.error(`[Stream Error] ${category}: ${errorObj.message}`);
        }
    } catch (loggingError) {
        console.error('[Error Tracking Failed]', loggingError);
        console.error('[Original Error]', error);
    }
}

/**
 * Capture successful stream events
 */
export async function captureStreamEvent(
    action: string,
    streamId?: string,
    details?: Record<string, unknown>
): Promise<void> {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('[Stream Event]', action, { streamId, ...details });
        }
    } catch (error) {
        console.error('[Event Tracking Failed]', error);
    }
}

/**
 * Error boundary helper for React components
 */
export function createErrorHandler(componentName: string) {
    return (error: Error, errorInfo: { componentStack: string }) => {
        captureStreamError(error, {
            component: componentName,
            componentStack: errorInfo.componentStack,
        });
    };
}

/**
 * Wrapper for async functions to catch and log errors
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext
): T {
    return (async (...args: unknown[]) => {
        try {
            return await fn(...args);
        } catch (error) {
            await captureStreamError(error as Error, context);
            throw error;
        }
    }) as T;
}

/**
 * Log security events
 */
export async function logSecurityEvent(
    action: string,
    severity: ErrorSeverity,
    details: Record<string, unknown>
): Promise<void> {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Security Event]', action, severity, details);
        } else {
            console.warn(`[Security] ${action} (${severity})`);
        }
    } catch (error) {
        console.error('[Security Logging Failed]', error);
    }
}

/**
 * Get error statistics (returns mock data since audit logs table doesn't exist)
 */
export async function getErrorStatistics(_timeRange: 'hour' | 'day' | 'week' = 'day') {
    // Return empty stats since audit logs table is not implemented
    return {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
        total: 0,
    };
}
