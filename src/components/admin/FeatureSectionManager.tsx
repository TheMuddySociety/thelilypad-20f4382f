import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    Layers,
} from "lucide-react";

// NOTE: This component requires the landing_page_features table to be created first.
// For now, it displays a placeholder message.

export const FeatureSectionManager: React.FC = () => {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Landing Page Features
                </CardTitle>
                <CardDescription>
                    Manage the "Powerful Features" section on the homepage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Database Table Required</h3>
                    <p className="text-muted-foreground max-w-md">
                        The <code className="px-1 py-0.5 bg-muted rounded text-sm">landing_page_features</code> table 
                        needs to be created before this feature can be used. 
                        The homepage currently uses default hardcoded features.
                    </p>
                    <Badge variant="outline" className="mt-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
                        Coming Soon
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
};
