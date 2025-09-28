import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.translator.app',
  appName: 'Translator App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
