import React from "react";
import { Link } from "react-router-dom";
import {
    Rocket, Sparkles, Globe, FlaskConical, ExternalLink,
    Check, Copy, Pencil, Eye, EyeOff, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collection } from "./types";
import { ipfsToHttp } from "@/lib/ipfs";

interface CollectionHeroProps {
    collection: Collection;
    isCreator: boolean;
    isPreviewMode: boolean;
    setIsPreviewMode: (val: boolean) => void;
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    setIsDeployModalOpen: (val: boolean) => void;
    setIsAllowlistModalOpen: (val: boolean) => void;
    isCollectionTestnet: boolean;
    collectionNetwork: string;
    collectionExplorerUrl: string;
    handleCopyAddress: () => void;
    copied: boolean;
}

export const CollectionHero: React.FC<CollectionHeroProps> = ({
    collection,
    isCreator,
    isPreviewMode,
    setIsPreviewMode,
    setIsEditMode,
    setIsDeployModalOpen,
    setIsAllowlistModalOpen,
    isCollectionTestnet,
    collectionNetwork,
    collectionExplorerUrl,
    handleCopyAddress,
    copied,
}) => {
    return (
        <>
            {/* Banner */}
            <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
                {!(collection.banner_url || collection.image_url) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                )}
                {(collection.banner_url || collection.image_url) && (
                    <img
                        src={ipfsToHttp(collection.banner_url || collection.image_url || '/placeholder.svg')}
                        alt={collection.name}
                        className="w-full h-full object-cover opacity-40"
                        style={{ aspectRatio: '16/5' }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>

            <div className="-mt-20 relative z-10 pb-4">
                {/* Preview Mode Banner */}
                {isPreviewMode && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">Preview Mode - Viewing as a collector would see this page</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPreviewMode(false)}
                            className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                            <EyeOff className="w-4 h-4 mr-2" />
                            Exit Preview
                        </Button>
                    </div>
                )}

                {/* Breadcrumb Navigation */}
                <Breadcrumb className="mb-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="truncate max-w-[200px]">{collection.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Edit button row */}
                <div className="flex items-center justify-end mb-4">
                    {isCreator && !isPreviewMode && (
                        <div className="flex items-center gap-2">
                            {!collection.contract_address && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsPreviewMode(true)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditMode(true)}
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Edit Collection
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => setIsDeployModalOpen(true)}
                                    >
                                        <Rocket className="w-4 h-4 mr-2" />
                                        Deploy Contract
                                    </Button>
                                </>
                            )}
                            {collection.contract_address && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAllowlistModalOpen(true)}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Manage Allowlist
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Collection Branding */}
                <div className="flex items-start gap-6 mb-6">
                    <div className="w-32 h-32 rounded-xl bg-muted border-4 border-background shadow-lg overflow-hidden flex items-center justify-center">
                        {collection.image_url ? (
                            <img
                                src={ipfsToHttp(collection.image_url)}
                                alt={collection.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Rocket className="w-12 h-12 text-muted-foreground" />
                        )}
                    </div>
                    <div className="flex-1 pt-4">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
                            <Badge
                                variant="outline"
                                className={
                                    collection.status === "live" || collection.status === "active" || collection.status === "minted"
                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                        : collection.status === "upcoming"
                                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                            : "bg-muted text-muted-foreground border-border"
                                }
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {(collection.status || 'upcoming').charAt(0).toUpperCase() + (collection.status || 'upcoming').slice(1)}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={isCollectionTestnet
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-primary/10 text-primary border-primary/30"
                                }
                            >
                                {isCollectionTestnet ? (
                                    <FlaskConical className="w-3 h-3 mr-1" />
                                ) : (
                                    <Globe className="w-3 h-3 mr-1" />
                                )}
                                {collectionNetwork}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 font-medium">{collection.symbol}</p>
                        {collection.contract_address && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Contract:</span>
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                    {collection.contract_address.slice(0, 10)}...{collection.contract_address.slice(-8)}
                                </code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAddress}>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                                <a
                                    href={`${collectionExplorerUrl}/address/${collection.contract_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
