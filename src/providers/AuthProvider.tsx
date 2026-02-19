import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { authReducer } from "@/auth/authMachine";
import { AuthState } from "@/auth/authTypes";

interface AuthContextType {
    state: AuthState;
    walletAddress: string | null;
    profile: UserProfile | null;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wallet = useWallet();
    const profileState = useUserProfile();
    const adminState = useIsAdmin();

    // Initialize state machine
    const [state, dispatch] = useReducer(authReducer, "DISCONNECTED" as AuthState);

    // Drive machine from wallet signals
    useEffect(() => {
        if (wallet.isConnecting) {
            dispatch({ type: "CONNECT_WALLET" });
            return;
        }

        if (!wallet.isConnected) {
            dispatch({ type: "DISCONNECT" });
            return;
        }

        if (wallet.isConnected && wallet.address) {
            dispatch({ type: "WALLET_CONNECTED" });
        }
    }, [wallet.isConnecting, wallet.isConnected, wallet.address]);

    // Drive machine from profile signals
    useEffect(() => {
        if (!wallet.isConnected || !wallet.address) return;

        // Signal that profile loading has started
        if (state === "WALLET_CONNECTED") {
            dispatch({ type: "PROFILE_LOADING" });
            return;
        }

        // Wait for profile to finish loading
        if (profileState.loading) return;

        // Profile resolution - also handles NEEDS_PROFILE → AUTHENTICATED when profile is created
        if (profileState.profile && profileState.profile.profile_setup_completed) {
            dispatch({ type: "PROFILE_FOUND" });
        } else if (state === "LOADING_PROFILE") {
            // Only dispatch PROFILE_MISSING when first loading, not on every render
            dispatch({ type: "PROFILE_MISSING" });
        }
    }, [wallet.isConnected, wallet.address, state, profileState.loading, profileState.profile?.profile_setup_completed]);

    return (
        <AuthContext.Provider
            value={{
                state,
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
