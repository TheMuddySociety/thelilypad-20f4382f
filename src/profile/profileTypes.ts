// src/profile/profileTypes.ts

/**
 * Profile lifecycle states
 * Enforces progression: CREATED → ROLE_SELECTED → CONFIGURING → ACTIVE
 */
export type ProfileStatus =
    | "CREATED"        // Profile row exists, awaiting role selection
    | "ROLE_SELECTED"  // Role chosen, configuration pending
    | "CONFIGURING"    // Filling role-specific data
    | "ACTIVE"         // Fully configured and usable
    | "SUSPENDED";     // Admin-only state

/**
 * Supported user roles
 */
export type UserRole =
    | "collector"
    | "creator"
    | "streamer";

/**
 * Profile lifecycle events
 */
export type ProfileEvent =
    | { type: "SELECT_ROLE"; role: UserRole }
    | { type: "START_CONFIGURATION" }
    | { type: "COMPLETE_CONFIGURATION" }
    | { type: "SUSPEND" }
    | { type: "REACTIVATE" };

/**
 * Role-specific metadata schemas
 */
export interface CollectorMetadata {
    displayName?: string;
    bio?: string;
    favoriteCategories?: string[];
}

export interface CreatorMetadata {
    displayName: string;
    bio: string;
    social_twitter?: string;
    social_discord?: string;
    social_instagram?: string;
    portfolio_url?: string;
}

export interface StreamerMetadata {
    displayName: string;
    bio: string;
    social_twitter?: string;
    social_youtube?: string;
    social_twitch?: string;
    schedule?: Record<string, any>;
    categories?: string[];
}

export type ProfileMetadata = CollectorMetadata | CreatorMetadata | StreamerMetadata;
