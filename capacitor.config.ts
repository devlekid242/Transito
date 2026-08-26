import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.alwaysdata.transito', // Remplace par ton ID de package
  appName: 'Transito',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK'
    }
  },


};

export default config;
