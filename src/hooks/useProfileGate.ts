// src/hooks/useProfileGate.ts
import { UserProfile } from "@/hooks/useUserProfile";
import { ProfileStatus } from "@/profile/profileTypes";

/**
 * Deterministic profile routing based on lifecycle state
 * Returns the route the user should be redirected to, or null if they're in the right place
 */
export function useProfileGate(profile: UserProfile | null): string | null {
    // No profile exists - need to create one
    if (!profile) {
        return "/profile-setup";
    }

    // Get status from profile (fallback to old system if status doesn't exist yet)
    const status: ProfileStatus = (profile as any).status ||
        (profile.profile_setup_completed ? "ACTIVE" : "CREATED");

    switch (status) {
        case "CREATED":
            // Need to select role
            return "/profile-setup";

        case "ROLE_SELECTED":
        case "CONFIGURING":
            // Need to complete configuration
            // Route to role-specific setup page
            const role = (profile as any).role ||
                (profile.is_creator ? "creator" : profile.is_streamer ? "streamer" : "collector");
            return `/profile/configure/${role}`;

        case "ACTIVE":
            // Profile is complete, no redirect needed
            return null;

        case "SUSPENDED":
            // Suspended accounts go to suspension notice page
            return "/profile/suspended";

        default:
            // Unknown state - force back to auth
            return "/auth";
    }
}

/**
 * Check if profile can perform an action based on status
 */
export function canPerformAction(
    profile: UserProfile | null,
    requiredStatus: ProfileStatus = "ACTIVE"
): boolean {
    if (!profile) return false;

    const status: ProfileStatus = (profile as any).status || "CREATED";

    // Only ACTIVE profiles can perform most actions
    if (requiredStatus === "ACTIVE") {
        return status === "ACTIVE";
    }

    return status === requiredStatus;
}
