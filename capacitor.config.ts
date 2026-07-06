// Capacitor config — native iOS/Android wrapper (Milestone 5).
// To build the native apps:
//   npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
//   npm run build && npx cap add ios && npx cap add android && npx cap sync
// Then open Xcode / Android Studio to run on device or publish.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lhdm.responde',
  appName: 'Responde',
  webDir: 'dist',
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false }
};

export default config;
