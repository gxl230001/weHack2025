// Type declarations for external modules
declare module 'webgazer';

// Declare webgazer as a global variable
declare global {
  interface Window {
    webgazer: any;
  }
  
  const webgazer: any;
}