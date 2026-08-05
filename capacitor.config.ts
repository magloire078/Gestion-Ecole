import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestionecole.app',
  appName: 'GereEcole',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // L'application embarque ses fichiers (`webDir: 'out'`, produit par `npm run build:mobile`)
    // et démarre donc sans réseau. Ne définissez `url` que pour du développement en direct
    // contre un serveur local — sinon l'app charge tout depuis le réseau et perd le hors-ligne.
    // Android Emulator : http://10.0.2.2:3000 · iOS/appareil : http://192.168.1.x:3000
    // url: 'http://10.0.2.2:3000',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#00E5FF",
      splashFullScreen: true,
      splashImmersive: true,
    }
  }
};

export default config;
