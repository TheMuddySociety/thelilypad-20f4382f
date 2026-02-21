import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/** Serializable subset of wizard state that can be saved to localStorage */
export interface DraftCollectionData {
    name: string;
    symbol: string;
    description: string;
    royaltyPercent: number;
    targetSupply: number;
    mode: 'basic' | 'advanced';
    currentStep: number;
    treasuryWallet: string;
    phases: any[];
    /** ISO timestamp of last save */
    savedAt: string;
}

const DRAFT_PREFIX = 'lilypad_draft_';

function getDraftKey(chain: string, type: string): string {
    return `${DRAFT_PREFIX}${chain}_${type}`;
}

/**
 * Hook for auto-saving and restoring draft collection wizard state.
 * Persists text/config state to localStorage keyed by chain + type.
 * File-based state (images, layers) cannot be persisted.
 */
export function useDraftCollection(chain: string, type: string) {
    const draftKey = getDraftKey(chain, type);
    const [hasDraft, setHasDraft] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check if a draft exists on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(draftKey);
            setHasDraft(!!stored);
        } catch {
            setHasDraft(false);
        }
    }, [draftKey]);

    /** Load a saved draft (returns null if none exists) */
    const loadDraft = useCallback((): DraftCollectionData | null => {
        try {
            const stored = localStorage.getItem(draftKey);
            if (!stored) return null;
            const data = JSON.parse(stored) as DraftCollectionData;
            return data;
        } catch {
            return null;
        }
    }, [draftKey]);

    /** Save the current wizard state (debounced internally) */
    const saveDraft = useCallback(
        (data: Omit<DraftCollectionData, 'savedAt'>) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                try {
                    const payload: DraftCollectionData = {
                        ...data,
                        savedAt: new Date().toISOString(),
                    };
                    localStorage.setItem(draftKey, JSON.stringify(payload));
                    setHasDraft(true);
                } catch (err) {
                    console.warn('[draft] Failed to save:', err);
                }
            }, 800); // 800ms debounce
        },
        [draftKey],
    );

    /** Clear the draft (e.g. after successful deploy) */
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(draftKey);
            setHasDraft(false);
        } catch {
            // ignore
        }
    }, [draftKey]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { hasDraft, loadDraft, saveDraft, clearDraft };
}
