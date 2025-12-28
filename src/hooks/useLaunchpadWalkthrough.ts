import { useState, useEffect, useCallback } from "react";

export interface WalkthroughStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  spotlightPadding?: number;
}

const STORAGE_KEY = "launchpad-walkthrough-completed";
const MODAL_STORAGE_KEY = "launchpad-modal-walkthrough-completed";

export const launchpadSteps: WalkthroughStep[] = [
  {
    id: "welcome",
    target: "[data-walkthrough='header']",
    title: "Welcome to Lily Launchpad! 🚀",
    description: "This is where you'll create and manage your NFT collections. Let's walk through how everything works.",
    placement: "bottom",
  },
  {
    id: "stats",
    target: "[data-walkthrough='stats']",
    title: "Launchpad Statistics",
    description: "View platform-wide stats including total collections, live mints, NFTs created, and trading volume.",
    placement: "bottom",
  },
  {
    id: "filter",
    target: "[data-walkthrough='filter']",
    title: "Filter Collections",
    description: "Use this dropdown to filter collections by status: All, Live, Upcoming, Ended, or view your saved Drafts.",
    placement: "bottom",
  },
  {
    id: "create-button",
    target: "[data-walkthrough='create-button']",
    title: "Create Your Collection",
    description: "Click here to start creating your NFT collection. You'll be guided through setting up details, artwork, mint phases, and more!",
    placement: "left",
  },
];

export const modalSteps: WalkthroughStep[] = [
  {
    id: "modal-steps",
    target: "[data-walkthrough='modal-steps']",
    title: "Creation Steps",
    description: "Follow these 5 steps to create your collection: Details → Art Generation → Mint Phases → Allowlist → Review",
    placement: "bottom",
  },
  {
    id: "collection-details",
    target: "[data-walkthrough='collection-details']",
    title: "Collection Details",
    description: "Enter your collection name, symbol (like a ticker), description, and total supply. Upload a cover image and banner too!",
    placement: "right",
  },
  {
    id: "collection-type",
    target: "[data-walkthrough='collection-type']",
    title: "Choose Collection Type",
    description: "Select from Generative (layered art), 1-of-1 (unique pieces), or Editions (same artwork, multiple copies).",
    placement: "top",
  },
  {
    id: "save-draft",
    target: "[data-walkthrough='save-draft']",
    title: "Save Your Progress",
    description: "Your work is auto-saved, but you can also manually save at any time. Drafts are stored for 24 hours.",
    placement: "bottom",
  },
  {
    id: "navigation",
    target: "[data-walkthrough='navigation']",
    title: "Navigate Steps",
    description: "Use these buttons to move between steps. You can go back and forth to make changes before deploying.",
    placement: "top",
  },
];

export function useLaunchpadWalkthrough() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    setHasSeenWalkthrough(completed === "true");
    
    // Auto-start for first-time visitors
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startWalkthrough = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < launchpadSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipWalkthrough = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
    setHasSeenWalkthrough(true);
  }, []);

  const completeWalkthrough = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
    setHasSeenWalkthrough(true);
  }, []);

  const resetWalkthrough = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSeenWalkthrough(false);
    setCurrentStepIndex(0);
  }, []);

  const currentStep = launchpadSteps[currentStepIndex] || null;

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: launchpadSteps.length,
    hasSeenWalkthrough,
    startWalkthrough,
    nextStep,
    prevStep,
    skipWalkthrough,
    completeWalkthrough,
    resetWalkthrough,
  };
}

export function useModalWalkthrough() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(MODAL_STORAGE_KEY);
    setHasSeenWalkthrough(completed === "true");
  }, []);

  const startWalkthrough = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const autoStartIfNeeded = useCallback(() => {
    const completed = localStorage.getItem(MODAL_STORAGE_KEY);
    if (!completed) {
      setTimeout(() => {
        setIsActive(true);
      }, 300);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < modalSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipWalkthrough = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(MODAL_STORAGE_KEY, "true");
    setHasSeenWalkthrough(true);
  }, []);

  const completeWalkthrough = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(MODAL_STORAGE_KEY, "true");
    setHasSeenWalkthrough(true);
  }, []);

  const resetWalkthrough = useCallback(() => {
    localStorage.removeItem(MODAL_STORAGE_KEY);
    setHasSeenWalkthrough(false);
    setCurrentStepIndex(0);
  }, []);

  const currentStep = modalSteps[currentStepIndex] || null;

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: modalSteps.length,
    hasSeenWalkthrough,
    startWalkthrough,
    autoStartIfNeeded,
    nextStep,
    prevStep,
    skipWalkthrough,
    completeWalkthrough,
    resetWalkthrough,
  };
}
