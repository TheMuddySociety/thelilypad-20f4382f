# Capacitor Mobile Setup Guide

This guide will help you set up the mobile app using Capacitor and Phantom wallet SDK.

## Prerequisites

- Node.js 18+
- For iOS: macOS with Xcode installed
- For Android: Android Studio installed

## Quick Start

### 1. Clone and Install

```bash
# Clone from GitHub (after exporting from Lovable)
git clone <your-github-repo>
cd thelilypad
npm install
```

### 2. Add Mobile Platforms

```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### 3. Build and Sync

```bash
# Build the web app
npm run build

# Sync with native platforms
npx cap sync
```

### 4. Run on Device/Emulator

```bash
# Run on iOS
npx cap run ios

# Run on Android
npx cap run android
```

## Phantom Wallet Mobile Integration

For full Phantom wallet integration on mobile, you'll need to add the Phantom React Native SDK after converting to a React Native project, or use the deep linking approach:

### Deep Linking Approach (Recommended for Capacitor)

The current web wallet implementation works in Capacitor's WebView, but for native Phantom integration:

1. Install additional Capacitor plugins:
```bash
npm install @capacitor/app @capacitor/browser
```

2. Use Phantom's universal links to connect:
- iOS: `phantom://`
- Android: `https://phantom.app/ul/`

### React Native SDK Approach

If you want full native integration with Phantom's React Native SDK, consider migrating to React Native:

```bash
# These are for React Native projects, not Capacitor
npm install @phantom/react-native-sdk
npm install react-native-get-random-values
npx expo install expo-secure-store expo-web-browser expo-auth-session
```

## App Configuration

The app uses these identifiers:
- **App ID**: `app.lovable.4fd2ea79092f460bbf12127f87e184bc`
- **Phantom App ID**: `719e4a2a-a504-4d66-ad15-5566daecb361`

## Hot Reload Development

The `capacitor.config.json` is configured to use the Lovable sandbox URL for hot-reload development. For production builds, remove the `server.url` configuration.

## Troubleshooting

### iOS Build Issues
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Open in Xcode: `npx cap open ios`

### Android Build Issues
- Ensure Android SDK is properly configured
- Open in Android Studio: `npx cap open android`

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Phantom SDK Documentation](https://docs.phantom.app/)
- [Lovable Blog Post on Mobile Development](https://docs.lovable.dev/tips-tricks/mobile-apps)
