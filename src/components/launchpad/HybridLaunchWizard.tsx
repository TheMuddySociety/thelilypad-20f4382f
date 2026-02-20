import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Upload, Sparkles, Wand2, Coins, Repeat,
    ArrowLeft, ArrowRight, Check, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Layer } from "./LayerManager";
import { type TraitRule } from "./TraitRulesManager";

// Step components
import { HybridTraitUpload } from "./HybridTraitUpload";
import { HybridRarityConfig } from "./HybridRarityConfig";
import { HybridGenerateCollection } from "./HybridGenerateCollection";
import { HybridTokenSetup } from "./HybridTokenSetup";
import { HybridEscrowForm } from "./HybridEscrowForm";
import { HybridLaunchSummary } from "./HybridLaunchSummary";

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
    { id: 0, title: "Traits", icon: Upload, description: "Upload Layers" },
    { id: 1, title: "Rarity", icon: Sparkles, description: "Set Weights" },
    { id: 2, title: "Generate", icon: Wand2, description: "Preview & Export" },
    { id: 3, title: "Token", icon: Coins, description: "Create or Link" },
    { id: 4, title: "Launch", icon: Repeat, description: "Init Escrow" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface HybridLaunchWizardProps {
    onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════

export function HybridLaunchWizard({ onClose }: HybridLaunchWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

    // ── Shared wizard state ──────────────────────────────────────────────────
    const [layers, setLayers] = useState<Layer[]>([]);
    const [rules] = useState<TraitRule[]>([]);
    const [totalSupply, setTotalSupply] = useState("1000");
    const [collectionName, setCollectionName] = useState("");
    const [collectionDescription, setCollectionDescription] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState(6);

    // Post-launch
    const [launched, setLaunched] = useState(false);
    const [escrowSignature, setEscrowSignature] = useState("");

    // ── Navigation ───────────────────────────────────────────────────────────

    const canGoNext = useCallback((): boolean => {
        switch (currentStep) {
            case 0: // Traits: at least 1 layer with 1 trait
                return layers.length > 0 && layers.some((l) => l.traits.length > 0);
            case 1: // Rarity: supply must be set
                return Number(totalSupply) > 0;
            case 2: // Generate: collection name required
                return collectionName.trim().length > 0;
            case 3: // Token: must have address
                return tokenAddress.trim().length >= 32;
            case 4: // Launch: always allowed (escrow form handles validation)
                return true;
            default:
                return false;
        }
    }, [currentStep, layers, totalSupply, collectionName, tokenAddress]);

    const goNext = () => {
        if (currentStep < STEPS.length - 1) {
            setDirection(1);
            setCurrentStep((s) => s + 1);
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((s) => s - 1);
        }
    };

    const goToStep = (step: number) => {
        if (step < currentStep) {
            setDirection(-1);
            setCurrentStep(step);
        }
    };

    // ── Animation variants ───────────────────────────────────────────────────

    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 60 : -60,
            opacity: 0,
        }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({
            x: dir > 0 ? -60 : 60,
            opacity: 0,
        }),
    };

    // ── Post-launch view ─────────────────────────────────────────────────────

    if (launched) {
        return (
            <HybridLaunchSummary
                collectionName={collectionName}
                tokenAddress={tokenAddress}
                escrowSignature={escrowSignature}
                totalSupply={totalSupply}
                onClose={onClose}
            />
        );
    }

    // ── Wizard UI ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">MPL-404 Hybrid Launch</h2>
                        <p className="text-xs text-muted-foreground">
                            Create a generative collection + token swap pool
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* ── Step indicator ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
                {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    const isClickable = index < currentStep;

                    return (
                        <React.Fragment key={step.id}>
                            {index > 0 && (
                                <div className={cn(
                                    "flex-1 h-0.5 transition-colors duration-300",
                                    isComplete ? "bg-primary" : "bg-muted"
                                )} />
                            )}
                            <button
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 shrink-0",
                                    isActive && "bg-primary/10 border border-primary/40",
                                    isComplete && "bg-primary/5 cursor-pointer hover:bg-primary/10",
                                    !isActive && !isComplete && "opacity-40 cursor-default",
                                    isClickable && "cursor-pointer"
                                )}
                                onClick={() => isClickable && goToStep(index)}
                                disabled={!isClickable && !isActive}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                                    isActive && "bg-primary text-primary-foreground",
                                    isComplete && "bg-primary/20 text-primary",
                                    !isActive && !isComplete && "bg-muted text-muted-foreground"
                                )}>
                                    {isComplete ? <Check className="w-3 h-3" /> : index + 1}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className={cn(
                                        "text-xs font-medium leading-tight",
                                        isActive && "text-primary",
                                        !isActive && "text-muted-foreground"
                                    )}>
                                        {step.title}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground leading-tight">
                                        {step.description}
                                    </p>
                                </div>
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            <Separator className="bg-border/40" />

            {/* ── Step content ───────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                    {currentStep === 0 && (
                        <HybridTraitUpload
                            layers={layers}
                            onLayersChange={setLayers}
                        />
                    )}

                    {currentStep === 1 && (
                        <HybridRarityConfig
                            layers={layers}
                            onLayersChange={setLayers}
                            totalSupply={totalSupply}
                            onTotalSupplyChange={setTotalSupply}
                        />
                    )}

                    {currentStep === 2 && (
                        <HybridGenerateCollection
                            layers={layers}
                            rules={rules}
                            totalSupply={totalSupply}
                            collectionName={collectionName}
                            onCollectionNameChange={setCollectionName}
                            collectionDescription={collectionDescription}
                            onCollectionDescriptionChange={setCollectionDescription}
                        />
                    )}

                    {currentStep === 3 && (
                        <HybridTokenSetup
                            tokenAddress={tokenAddress}
                            tokenDecimals={tokenDecimals}
                            onTokenAddressChange={setTokenAddress}
                            onTokenDecimalsChange={setTokenDecimals}
                            onTokenReady={(addr, dec) => {
                                setTokenAddress(addr);
                                setTokenDecimals(dec);
                            }}
                        />
                    )}

                    {currentStep === 4 && (
                        <HybridEscrowForm
                            onClose={() => {
                                // Mark as launched when escrow succeeds (the form handles tx)
                                setLaunched(true);
                            }}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ── Navigation buttons ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="ghost"
                    onClick={currentStep === 0 ? onClose : goBack}
                    className="gap-1.5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {currentStep === 0 ? "Cancel" : "Back"}
                </Button>

                {currentStep < STEPS.length - 1 && (
                    <Button
                        onClick={goNext}
                        disabled={!canGoNext()}
                        className="gap-1.5"
                    >
                        Next
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
