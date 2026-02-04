import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";
import { AlertTriangle } from "lucide-react";

export default function ProfileSuspended() {
    const { disconnect } = useWallet();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Account Suspended</CardTitle>
                    <CardDescription>
                        Your account has been temporarily suspended
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                            Your profile is currently suspended and you cannot access platform features.
                        </p>
                        <p>
                            This may be due to a violation of our terms of service or community guidelines.
                        </p>
                    </div>

                    <div className="pt-4 space-y-2">
                        <p className="text-sm font-medium">Need help?</p>
                        <p className="text-sm text-muted-foreground">
                            Contact support at{" "}
                            <a
                                href="mailto:support@thelilypad.io"
                                className="text-primary hover:underline"
                            >
                                support@thelilypad.io
                            </a>
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={disconnect}
                    >
                        Disconnect Wallet
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
