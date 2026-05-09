import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weetzee.app',
  appName: 'Weetzee',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      launchFadeOutDuration: 0,
      backgroundColor: '#000000',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
  android: {
    backgroundColor: '#000000',
  },
  ios: {
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
  },
};

export default config;
