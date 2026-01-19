/**
 * Error Tracking and Logging Utility for Streaming
 * Captures errors with context and logs to database
 */

import { supabase } from '@/integrations/supabase/client';

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
 * Capture and log error to database
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

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Build context
        const fullContext: ErrorContext = {
            ...context,
            userId: context?.userId || user?.id,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
        };

        // Log to database via audit log
        await supabase.rpc('log_stream_audit', {
            p_stream_id: context?.streamId || null,
            p_user_id: fullContext.userId || null,
            p_action: 'error_occurred',
            p_event_type: 'system',
            p_severity: finalSeverity,
            p_details: {
                message: errorObj.message,
                category,
                stack: errorObj.stack,
            },
            p_metadata: fullContext,
        });

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('[Stream Error]', {
                message: errorObj.message,
                category,
                severity: finalSeverity,
                context: fullContext,
                stack: errorObj.stack,
            });
        }
    } catch (loggingError) {
        // Fallback to console if database logging fails
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
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.rpc('log_stream_audit', {
            p_stream_id: streamId || null,
            p_user_id: user?.id || null,
            p_action: action,
            p_event_type: 'user_action',
            p_severity: 'info',
            p_details: details || {},
            p_metadata: {
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
            },
        });

        if (import.meta.env.DEV) {
            console.log('[Stream Event]', action, details);
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
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.rpc('log_stream_audit', {
            p_stream_id: null,
            p_user_id: user?.id || null,
            p_action: action,
            p_event_type: 'security',
            p_severity: severity,
            p_details: details,
            p_metadata: {
                timestamp: new Date().toISOString(),
                ip_address: null, // Would need backend to capture
                user_agent: navigator.userAgent,
            },
        });

        if (import.meta.env.DEV) {
            console.warn('[Security Event]', action, severity, details);
        }
    } catch (error) {
        console.error('[Security Logging Failed]', error);
    }
}

/**
 * Get error statistics for admin dashboard
 */
export async function getErrorStatistics(timeRange: 'hour' | 'day' | 'week' = 'day') {
    const intervals: Record<typeof timeRange, string> = {
        hour: '1 hour',
        day: '24 hours',
        week: '7 days',
    };

    try {
        const { data, error } = await supabase
            .from('stream_audit_logs')
            .select('action, severity, created_at')
            .gte('created_at', `now() - interval '${intervals[timeRange]}'`)
            .eq('event_type', 'system');

        if (error) throw error;

        // Group by severity
        const stats = {
            critical: data?.filter(log => log.severity === 'critical').length || 0,
            error: data?.filter(log => log.severity === 'error').length || 0,
            warning: data?.filter(log => log.severity === 'warning').length || 0,
            info: data?.filter(log => log.severity === 'info').length || 0,
            total: data?.length || 0,
        };

        return stats;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return null;
    }
}
