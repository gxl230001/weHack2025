import { useEffect } from "react";

const GazeTracker = () => {
  useEffect(() => {
    const loadWebGazer = async () => {
      if (!window.webgazer) return;


      window.webgazer.setRegression("ridge")
        .setGazeListener((data, elapsedTime) => {
          if (data) {
            console.log("X:", data.x, "Y:", data.y);
          }
        })
        .begin();
    };


    // Wait for webgazer to be available
    const interval = setInterval(() => {
      if (window.webgazer) {
        clearInterval(interval);
        loadWebGazer();
      }
    }, 100);


    return () => {
      if (window.webgazer) {
        window.webgazer.end();
      }
    };
  }, []);


  return null;
};


export default GazeTracker;
