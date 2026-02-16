import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestionecole.app',
  appName: 'GereEcole',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Pour le développement Android Emulator : http://10.0.2.2:3000
    // Pour iOS Simulator ou appareil physique : Utiliser l'IP locale (ex: http://192.168.1.x:3000)
    // Pour la PROD : Remplacer par https://www.gerecole.com
    // url: 'http://10.0.2.2:3000',
    cleartext: true
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
