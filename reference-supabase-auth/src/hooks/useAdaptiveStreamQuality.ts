import { useState, useEffect, useCallback, useRef } from 'react';
import { StreamQuality } from './useWebRTCStream';
import { toast } from 'sonner';

interface ConnectionStats {
    effectiveType: string | null;
    downlink: number | null;
    rtt: number | null;
    packetLoss: number;
}

interface AdaptiveQualityOptions {
    enabled: boolean;
    currentQuality: StreamQuality;
    onQualityChange: (quality: StreamQuality) => void;
}

const QUALITY_ORDER: StreamQuality[] = ['480p', '720p', '1080p'];
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const DOWNGRADE_THRESHOLD_RTT = 300; // ms - high latency triggers downgrade
const DOWNGRADE_THRESHOLD_PACKET_LOSS = 5; // 5% packet loss triggers downgrade
const UPGRADE_THRESHOLD_RTT = 100; // ms - low latency allows upgrade
const UPGRADE_THRESHOLD_DOWNLINK = 10; // Mbps - good bandwidth allows upgrade
const STABLE_PERIOD_FOR_UPGRADE = 30000; // 30 seconds of stability before upgrading

export const useAdaptiveStreamQuality = (options: AdaptiveQualityOptions) => {
    const { enabled, currentQuality, onQualityChange } = options;

    const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
        effectiveType: null,
        downlink: null,
        rtt: null,
        packetLoss: 0,
    });
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [lastAdjustmentTime, setLastAdjustmentTime] = useState<number>(0);
    const [consecutiveGoodChecks, setConsecutiveGoodChecks] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Get current quality index
    const getCurrentQualityIndex = useCallback(() => {
        return QUALITY_ORDER.indexOf(currentQuality);
    }, [currentQuality]);

    // Check if we can downgrade
    const canDowngrade = useCallback(() => {
        return getCurrentQualityIndex() > 0;
    }, [getCurrentQualityIndex]);

    // Check if we can upgrade
    const canUpgrade = useCallback(() => {
        return getCurrentQualityIndex() < QUALITY_ORDER.length - 1;
    }, [getCurrentQualityIndex]);

    // Downgrade quality
    const downgradeQuality = useCallback(() => {
        const currentIndex = getCurrentQualityIndex();
        if (currentIndex > 0) {
            const newQuality = QUALITY_ORDER[currentIndex - 1];
            onQualityChange(newQuality);
            setLastAdjustmentTime(Date.now());
            setConsecutiveGoodChecks(0);
            toast('Quality adjusted', {
                description: `Reduced to ${newQuality} due to connection issues`,
            });
        }
    }, [getCurrentQualityIndex, onQualityChange]);

    // Upgrade quality
    const upgradeQuality = useCallback(() => {
        const currentIndex = getCurrentQualityIndex();
        if (currentIndex < QUALITY_ORDER.length - 1) {
            const newQuality = QUALITY_ORDER[currentIndex + 1];
            onQualityChange(newQuality);
            setLastAdjustmentTime(Date.now());
            setConsecutiveGoodChecks(0);
            toast('Quality improved', {
                description: `Upgraded to ${newQuality} - connection is stable`,
            });
        }
    }, [getCurrentQualityIndex, onQualityChange]);

    // Monitor connection using Network Information API
    const checkNetworkInfo = useCallback(() => {
        const connection = (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        if (connection) {
            return {
                effectiveType: connection.effectiveType || null,
                downlink: connection.downlink || null,
                rtt: connection.rtt || null,
            };
        }
        return { effectiveType: null, downlink: null, rtt: null };
    }, []);

    // Create a temporary RTCPeerConnection to get stats
    const createStatsConnection = useCallback(async () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Add a dummy data channel to trigger ICE
            pc.createDataChannel('stats');

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            peerConnectionRef.current = pc;
            return pc;
        } catch (error) {
            console.error('Failed to create stats connection:', error);
            return null;
        }
    }, []);

    // Get WebRTC stats for more accurate connection quality
    const getWebRTCStats = useCallback(async (): Promise<{ rtt: number | null; packetLoss: number }> => {
        if (!peerConnectionRef.current) {
            await createStatsConnection();
        }

        const pc = peerConnectionRef.current;
        if (!pc) return { rtt: null, packetLoss: 0 };

        try {
            const stats = await pc.getStats();
            let rtt: number | null = null;
            let packetsLost = 0;
            let packetsTotal = 0;

            stats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : null;
                }
                if (report.type === 'outbound-rtp') {
                    packetsLost += report.packetsLost || 0;
                    packetsTotal += report.packetsSent || 0;
                }
            });

            const packetLoss = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;
            return { rtt, packetLoss };
        } catch {
            return { rtt: null, packetLoss: 0 };
        }
    }, [createStatsConnection]);

    // Main monitoring function
    const checkConnectionQuality = useCallback(async () => {
        const networkInfo = checkNetworkInfo();
        const webrtcStats = await getWebRTCStats();

        const stats: ConnectionStats = {
            ...networkInfo,
            rtt: webrtcStats.rtt ?? networkInfo.rtt,
            packetLoss: webrtcStats.packetLoss,
        };

        setConnectionStats(stats);

        // Don't adjust too frequently (minimum 10 seconds between adjustments)
        const timeSinceLastAdjustment = Date.now() - lastAdjustmentTime;
        if (timeSinceLastAdjustment < 10000) return;

        // Check for poor connection - trigger downgrade
        const shouldDowngrade =
            (stats.rtt !== null && stats.rtt > DOWNGRADE_THRESHOLD_RTT) ||
            stats.packetLoss > DOWNGRADE_THRESHOLD_PACKET_LOSS ||
            stats.effectiveType === 'slow-2g' ||
            stats.effectiveType === '2g';

        if (shouldDowngrade && canDowngrade()) {
            downgradeQuality();
            return;
        }

        // Check for good connection - potentially upgrade
        const isGoodConnection =
            (stats.rtt === null || stats.rtt < UPGRADE_THRESHOLD_RTT) &&
            stats.packetLoss < 1 &&
            (stats.downlink === null || stats.downlink > UPGRADE_THRESHOLD_DOWNLINK) &&
            stats.effectiveType !== 'slow-2g' &&
            stats.effectiveType !== '2g' &&
            stats.effectiveType !== '3g';

        if (isGoodConnection) {
            setConsecutiveGoodChecks(prev => prev + 1);

            // Require stable good connection for upgrade
            const goodChecksDuration = consecutiveGoodChecks * CHECK_INTERVAL;
            if (goodChecksDuration >= STABLE_PERIOD_FOR_UPGRADE && canUpgrade()) {
                upgradeQuality();
            }
        } else {
            setConsecutiveGoodChecks(0);
        }
    }, [
        checkNetworkInfo,
        getWebRTCStats,
        lastAdjustmentTime,
        canDowngrade,
        canUpgrade,
        downgradeQuality,
        upgradeQuality,
        consecutiveGoodChecks
    ]);

    // Start/stop monitoring based on enabled state
    useEffect(() => {
        if (enabled) {
            setIsMonitoring(true);
            setLastAdjustmentTime(Date.now());

            // Initial check
            checkConnectionQuality();

            // Set up interval
            intervalRef.current = setInterval(checkConnectionQuality, CHECK_INTERVAL);

            // Listen for network changes
            const connection = (navigator as any).connection;
            if (connection) {
                connection.addEventListener('change', checkConnectionQuality);
            }

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (connection) {
                    connection.removeEventListener('change', checkConnectionQuality);
                }
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.close();
                    peerConnectionRef.current = null;
                }
                setIsMonitoring(false);
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            setIsMonitoring(false);
        }
    }, [enabled, checkConnectionQuality]);

    return {
        connectionStats,
        isMonitoring,
        consecutiveGoodChecks,
        checkConnectionQuality,
    };
};
