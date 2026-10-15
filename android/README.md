# Purakam Android Expo App

This folder contains the Expo-managed Android app for the Purakam project.

## Setup

1. Install dependencies:
   ```bash
   cd android
   npm install
   ```

2. Start Expo:
   ```bash
   npm start
   ```

3. Open on Android:
   - Scan the QR code in the Expo Metro terminal using Expo Go
   - or run `npm run android`

## Notes

- This is an Expo-managed app using SDK 54.
- Native Gradle setup is not required for Expo Go development.
- Use `EXPO_PUBLIC_API_URL` in a `.env` file to point to your backend.
