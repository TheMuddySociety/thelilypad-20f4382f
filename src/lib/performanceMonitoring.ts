/**
 * Performance Monitoring for Streaming
 * Tracks metrics like latency, bitrate, connection quality
 */

import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetrics {
    // Timing metrics
    streamStartTime: number;
    streamEndTime?: number;
    totalDuration?: number;

    // Connection metrics
    connectionEstablishTime?: number;
    reconnectionCount: number;

    // Media metrics
    averageBitrate?: number;
    averageFrameRate?: number;
    droppedFrames?: number;

    // Network metrics
    averageLatency?: number;
    packetLoss?: number;

    // Quality metrics
    qualitySwitches: number;
    bufferingEvents: number;
    totalBufferingTime: number;
}

export interface StreamPerformanceTracker {
    metrics: PerformanceMetrics;
    startTracking: () => void;
    stopTracking: () => void;
    recordEvent: (event: string, data?: Record<string, unknown>) => void;
    getMetrics: () => PerformanceMetrics;
}

/**
 * Creates a performance tracker for a stream
 */
export function createStreamPerformanceTracker(streamId: string): StreamPerformanceTracker {
    const metrics: PerformanceMetrics = {
        streamStartTime: Date.now(),
        reconnectionCount: 0,
        qualitySwitches: 0,
        bufferingEvents: 0,
        totalBufferingTime: 0,
    };

    let trackingInterval: NodeJS.Timeout | null = null;
    let bufferingStartTime: number | null = null;

    const startTracking = () => {
        // Record every 30 seconds
        trackingInterval = setInterval(async () => {
            await recordMetricsSnapshot();
        }, 30000);

        recordEvent('stream_start', {
            streamId,
            timestamp: Date.now(),
        });
    };

    const stopTracking = () => {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }

        metrics.streamEndTime = Date.now();
        metrics.totalDuration = metrics.streamEndTime - metrics.streamStartTime;

        recordEvent('stream_end', {
            streamId,
            duration: metrics.totalDuration,
            timestamp: Date.now(),
        });

        // Final snapshot
        recordMetricsSnapshot();
    };

    const recordEvent = (event: string, data?: Record<string, unknown>) => {
        // Log performance events
        if (import.meta.env.DEV) {
            console.log(`[Performance: ${event}]`, data);
        }

        // Track specific events
        switch (event) {
            case 'buffering_start':
                bufferingStartTime = Date.now();
                metrics.bufferingEvents++;
                break;

            case 'buffering_end':
                if (bufferingStartTime) {
                    const bufferingDuration = Date.now() - bufferingStartTime;
                    metrics.totalBufferingTime += bufferingDuration;
                    bufferingStartTime = null;
                }
                break;

            case 'quality_switch':
                metrics.qualitySwitches++;
                break;

            case 'reconnection':
                metrics.reconnectionCount++;
                break;

            case 'connection_established':
                if (data?.time) {
                    metrics.connectionEstablishTime = data.time as number;
                }
                break;
        }
    };

    const recordMetricsSnapshot = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Log to audit with performance metrics
            await supabase.rpc('log_stream_audit', {
                p_stream_id: streamId,
                p_user_id: user?.id || null,
                p_action: 'performance_snapshot',
                p_event_type: 'system',
                p_severity: 'info',
                p_details: metrics,
                p_metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('[Performance Tracking Failed]', error);
        }
    };

    const getMetrics = () => ({ ...metrics });

    return {
        metrics,
        startTracking,
        stopTracking,
        recordEvent,
        getMetrics,
    };
}

/**
 * Monitor WebRTC connection quality
 */
export async function monitorWebRTCQuality(
    peerConnection: RTCPeerConnection,
    streamId: string
): Promise<void> {
    try {
        const stats = await peerConnection.getStats();

        let totalBytesReceived = 0;
        let totalBytesSent = 0;
        let packetsLost = 0;
        let totalPackets = 0;
        let jitter = 0;
        let roundTripTime = 0;

        stats.forEach((report) => {
            if (report.type === 'inbound-rtp') {
                totalBytesReceived += report.bytesReceived || 0;
                packetsLost += report.packetsLost || 0;
                totalPackets += report.packetsReceived || 0;
                jitter += report.jitter || 0;
            }

            if (report.type === 'outbound-rtp') {
                totalBytesSent += report.bytesSent || 0;
            }

            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                roundTripTime = report.currentRoundTripTime || 0;
            }
        });

        const packetLossRate = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        // Log quality metrics
        await supabase.rpc('log_stream_audit', {
            p_stream_id: streamId,
            p_user_id: null,
            p_action: 'quality_metrics',
            p_event_type: 'system',
            p_severity: 'info',
            p_details: {
                bytes_received: totalBytesReceived,
                bytes_sent: totalBytesSent,
                packet_loss_rate: packetLossRate,
                jitter,
                round_trip_time: roundTripTime,
            },
            p_metadata: {
                timestamp: new Date().toISOString(),
            },
        });

        // Alert if quality is poor
        if (packetLossRate > 5 || roundTripTime > 300) {
            console.warn('[Poor Connection Quality]', {
                packetLoss: packetLossRate.toFixed(2) + '%',
                rtt: roundTripTime + 'ms',
            });
        }
    } catch (error) {
        console.error('[WebRTC Quality Monitoring Failed]', error);
    }
}

/**
 * Track media device performance
 */
export function trackMediaDeviceMetrics(stream: MediaStream, streamId: string): () => void {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    const checkInterval = setInterval(() => {
        if (videoTrack) {
            const settings = videoTrack.getSettings();

            if (import.meta.env.DEV) {
                console.log('[Media Metrics]', {
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    facingMode: settings.facingMode,
                });
            }
        }

        if (audioTrack) {
            const settings = audioTrack.getSettings();

            if (import.meta.env.DEV) {
                console.log('[Audio Metrics]', {
                    sampleRate: settings.sampleRate,
                    echoCancellation: settings.echoCancellation,
                    noiseSuppression: settings.noiseSuppression,
                });
            }
        }
    }, 30000); // Every 30 seconds

    // Return cleanup function
    return () => {
        clearInterval(checkInterval);
    };
}

/**
 * Measure stream latency
 */
export async function measureStreamLatency(streamId: string): Promise<number | null> {
    try {
        const startTime = Date.now();

        // Ping the stream presence channel
        const channel = supabase.channel(`stream:${streamId}`);
        await channel.subscribe();

        const latency = Date.now() - startTime;

        await channel.unsubscribe();

        return latency;
    } catch (error) {
        console.error('[Latency Measurement Failed]', error);
        return null;
    }
}

/**
 * Get performance statistics
 */
export async function getPerformanceStats(streamId: string) {
    try {
        const { data, error } = await supabase
            .from('stream_audit_logs')
            .select('details, created_at')
            .eq('stream_id', streamId)
            .eq('action', 'performance_snapshot')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching performance stats:', error);
        return null;
    }
}
