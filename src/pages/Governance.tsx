import React from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Governance() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight">Governance</h1>
            <p className="text-muted-foreground">
              Participate in shaping the future of The Lily Pad.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Solana Governance integration is currently under development.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We are transitioning our governance system to SPL Governance. Stay tuned for updates!
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
