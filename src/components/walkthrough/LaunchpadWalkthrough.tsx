import React from "react";
import { WalkthroughTooltip } from "./WalkthroughTooltip";
import { useLaunchpadWalkthrough, useModalWalkthrough } from "@/hooks/useLaunchpadWalkthrough";

interface LaunchpadWalkthroughProps {
  walkthrough: ReturnType<typeof useLaunchpadWalkthrough>;
}

export function LaunchpadWalkthrough({ walkthrough }: LaunchpadWalkthroughProps) {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipWalkthrough,
  } = walkthrough;

  if (!isActive || !currentStep) return null;

  return (
    <WalkthroughTooltip
      step={currentStep}
      currentIndex={currentStepIndex}
      totalSteps={totalSteps}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipWalkthrough}
      isFirst={currentStepIndex === 0}
      isLast={currentStepIndex === totalSteps - 1}
    />
  );
}

interface ModalWalkthroughProps {
  walkthrough: ReturnType<typeof useModalWalkthrough>;
}

export function ModalWalkthrough({ walkthrough }: ModalWalkthroughProps) {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipWalkthrough,
  } = walkthrough;

  if (!isActive || !currentStep) return null;

  return (
    <WalkthroughTooltip
      step={currentStep}
      currentIndex={currentStepIndex}
      totalSteps={totalSteps}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipWalkthrough}
      isFirst={currentStepIndex === 0}
      isLast={currentStepIndex === totalSteps - 1}
    />
  );
}
