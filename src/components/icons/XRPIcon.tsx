/**
 * XRPIcon — Official XRP Ledger Symbol (curly brackets + X)
 *
 * Uses `currentColor` so it inherits the surrounding text color automatically.
 * On dark backgrounds the icon will appear white; on light backgrounds, black.
 * Pass className to override size and color as needed.
 *
 * Sizes:
 *   Default: w-4 h-4  (matches lucide icons)
 *   Use className="w-5 h-5" / "w-6 h-6" / etc. to resize.
 *
 * Usage:
 *   <XRPIcon />
 *   <XRPIcon className="w-5 h-5 text-blue-400" />
 */
import React from "react";
import { cn } from "@/lib/utils";

interface XRPIconProps {
  className?: string;
  /** Override fill explicitly. Falls back to currentColor. */
  color?: string;
}

export const XRPIcon: React.FC<XRPIconProps> = ({ className, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 300 300"
    className={cn("w-4 h-4 shrink-0", className)}
    fill={color ?? "currentColor"}
    aria-label="XRP Ledger"
    role="img"
  >
    {/* Left curly bracket */}
    <path d="M85.5 19c-28.3 0-42.5 9.8-42.5 31.7v52.4c0 16.2-8.5 24.3-25.4 24.3H9v5.3h8.6c16.9 0 25.4 8.1 25.4 24.3v52.4C43 231.2 57.2 241 85.5 241v-5.3c-24.5 0-36.7-8.2-36.7-27v-52.4c0-17.8-8.2-28-24.6-30.6 16.4-2.6 24.6-12.8 24.6-30.6V42.7c0-18.8 12.2-27 36.7-27V19z" />
    {/* Right curly bracket */}
    <path d="M214.5 19v5.3c24.5 0 36.7 8.2 36.7 27v52.4c0 17.8 8.2 28 24.6 30.6-16.4 2.6-24.6 12.8-24.6 30.6v52.4c0 18.8-12.2 27-36.7 27v5.3c28.3 0 42.5-9.8 42.5-31.7v-52.4c0-16.2 8.5-24.3 25.4-24.3H291v-5.3h-8.6c-16.9 0-25.4-8.1-25.4-24.3V50.7C257 28.8 242.8 19 214.5 19z" />
    {/* X mark — top half */}
    <path d="M103.2 88L136 121.4 168.8 88H186L145.2 129l40.2 40.2H168L136 135.8l-32 33.4h-17.4L127 129 86.8 88H103.2z" />
    {/* X mark — bottom half */}
    <path d="M103.2 212L136 178.6 168.8 212H186L145.2 171 185.4 130.8H168L136 164.2l-32-33.4h-17.4L127 171 86.8 212H103.2z" />
  </svg>
);

export default XRPIcon;
