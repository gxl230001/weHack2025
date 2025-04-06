// Import webgazer library
import webgazer from 'webgazer';

// Initialize webgazer instance
export const initializeWebGazer = async () => {
  try {
    // Make webgazer accessible globally
    if (typeof window !== 'undefined') {
      window.webgazer = webgazer;
      console.log("WebGazer loaded successfully");
    }
    
    return webgazer;
  } catch (error) {
    console.error("Failed to initialize WebGazer:", error);
    return null;
  }
};

// Export webgazer instance
export default webgazer;