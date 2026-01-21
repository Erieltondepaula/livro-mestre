import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.planoleitura',
  appName: 'Plano de Leitura',
  webDir: 'dist',
  server: {
    url: 'https://083acb00-7fa0-4d40-932e-1e8abb44986c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
