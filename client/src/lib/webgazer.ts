// Import webgazer library
import webgazer from 'webgazer';

// Initialize webgazer instance
export const initializeWebGazer = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  // If WebGazer is already loaded, skip
  if (window.webgazer) {
    return;
  }

  // Dynamically load the WebGazer script
  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector("script[src*='webgazer']");
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;
    script.onload = () => {
      console.log("WebGazer script loaded.");
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load WebGazer script.");
      reject(new Error("WebGazer failed to load"));
    };
    document.head.appendChild(script);
  });

  // Wait until WebGazer is available
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebGazer loading timeout"));
    }, 8000); // 8s max

    const check = () => {
      if (window.webgazer) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};


// Export webgazer instance
export default webgazer;