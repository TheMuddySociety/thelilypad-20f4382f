import React, { createContext, useContext, useMemo } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export type AuthStatus =
    | "disconnected"
    | "wallet-connecting"
    | "wallet-connected"
    | "profile-loading"
    | "authenticated"
    | "needs-profile";

interface AuthContextType {
    status: AuthStatus;
    walletAddress: string | null;
    profile: any | null;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wallet = useWallet();
    const profileState = useUserProfile();
    const adminState = useIsAdmin();

    const status: AuthStatus = useMemo(() => {
        if (wallet.isConnecting) return "wallet-connecting";
        if (!wallet.isConnected) return "disconnected";
        if (!wallet.address) return "wallet-connecting";
        if (profileState.loading) return "profile-loading";
        if (!profileState.profile) return "needs-profile";
        if (!profileState.profile.profile_setup_completed) return "needs-profile";
        return "authenticated";
    }, [
        wallet.isConnecting,
        wallet.isConnected,
        wallet.address,
        profileState.loading,
        profileState.profile
    ]);

    return (
        <AuthContext.Provider
            value={{
                status,
                walletAddress: wallet.address,
                profile: profileState.profile,
                isAdmin: adminState.isAdmin
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
