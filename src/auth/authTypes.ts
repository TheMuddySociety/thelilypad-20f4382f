// src/auth/authTypes.ts
export type AuthState =
    | "DISCONNECTED"
    | "CONNECTING_WALLET"
    | "WALLET_CONNECTED"
    | "LOADING_PROFILE"
    | "NEEDS_PROFILE"
    | "AUTHENTICATED";

export type AuthEvent =
    | { type: "CONNECT_WALLET" }
    | { type: "WALLET_CONNECTED" }
    | { type: "PROFILE_LOADING" }
    | { type: "PROFILE_FOUND" }
    | { type: "PROFILE_MISSING" }
    | { type: "DISCONNECT" };
