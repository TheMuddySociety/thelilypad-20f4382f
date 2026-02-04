// src/profile/profileMachine.ts
import { ProfileStatus, ProfileEvent } from "./profileTypes";

/**
 * Pure state machine reducer for profile lifecycle
 * Enforces valid transitions only
 * No React, no side effects - fully testable
 */
export function profileReducer(
    state: ProfileStatus,
    event: ProfileEvent
): ProfileStatus {
    switch (state) {
        case "CREATED":
            if (event.type === "SELECT_ROLE") return "ROLE_SELECTED";
            return state;

        case "ROLE_SELECTED":
            if (event.type === "START_CONFIGURATION") return "CONFIGURING";
            return state;

        case "CONFIGURING":
            if (event.type === "COMPLETE_CONFIGURATION") return "ACTIVE";
            if (event.type === "SUSPEND") return "SUSPENDED";
            return state;

        case "ACTIVE":
            if (event.type === "SUSPEND") return "SUSPENDED";
            // Allow reconfiguration from ACTIVE
            if (event.type === "START_CONFIGURATION") return "CONFIGURING";
            return state;

        case "SUSPENDED":
            if (event.type === "REACTIVATE") return "ACTIVE";
            return state;

        default:
            return state;
    }
}

/**
 * Validates if a profile is fully usable
 */
export function isProfileActive(status: ProfileStatus): boolean {
    return status === "ACTIVE";
}

/**
 * Check if profile needs additional configuration
 */
export function needsConfiguration(status: ProfileStatus): boolean {
    return status === "CREATED" || status === "ROLE_SELECTED" || status === "CONFIGURING";
}
