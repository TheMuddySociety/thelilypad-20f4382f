import React from "react";
import {
    Twitter, MessageCircle, Globe, Send, FlaskConical, Globe as GlobeIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collection } from "./types";

interface CollectionAboutCardProps {
    collection: Collection;
    isCollectionTestnet: boolean;
    collectionNetwork: string;
}

export const CollectionAboutCard: React.FC<CollectionAboutCardProps> = ({
    collection,
    isCollectionTestnet,
    collectionNetwork,
}) => {
    return (
        <Card className="glass-card shadow-lg border-border/50">
            <CardHeader>
                <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                    {collection.description || "No description provided."}
                </p>

                {/* Social Links */}
                {(collection.social_twitter || collection.social_discord || collection.social_website || collection.social_telegram) && (
                    <>
                        <Separator className="my-6 opacity-50" />
                        <div className="flex flex-wrap gap-3">
                            {collection.social_twitter && (
                                <a
                                    href={collection.social_twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-sm transition-colors"
                                >
                                    <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                                    Twitter
                                </a>
                            )}
                            {collection.social_discord && (
                                <a
                                    href={collection.social_discord}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-sm transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4 text-[#5865F2]" />
                                    Discord
                                </a>
                            )}
                            {collection.social_website && (
                                <a
                                    href={collection.social_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-sm transition-colors"
                                >
                                    <Globe className="w-4 h-4 text-emerald-500" />
                                    Website
                                </a>
                            )}
                            {collection.social_telegram && (
                                <a
                                    href={collection.social_telegram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-sm transition-colors"
                                >
                                    <Send className="w-4 h-4 text-[#0088cc]" />
                                    Telegram
                                </a>
                            )}
                        </div>
                    </>
                )}

                <Separator className="my-6 opacity-50" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                    <div>
                        <span className="text-muted-foreground block mb-1">Creator</span>
                        <p className="font-medium truncate text-primary">
                            {collection.creator_id ? `${collection.creator_id.slice(0, 8)}...` : "Anonymous"}
                        </p>
                    </div>
                    <div>
                        <span className="text-muted-foreground block mb-1">Total Supply</span>
                        <p className="font-medium">{collection.total_supply?.toLocaleString() || "0"}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground block mb-1">Royalty</span>
                        <p className="font-medium text-primary">{(collection as any).royalty_percent || 0}%</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground block mb-1">Network</span>
                        <p className="font-medium flex items-center gap-1.5">
                            {isCollectionTestnet ? (
                                <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                                <GlobeIcon className="w-3.5 h-3.5 text-primary" />
                            )}
                            {collectionNetwork}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
