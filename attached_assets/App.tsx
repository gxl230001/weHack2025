import React, { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import Auth from "./pages/Auth";

// Main app component with routing
function App() {
  // Eye tracker state
  let lastX = useRef<number | null>(null);
  let lastY = useRef<number | null>(null);
  const [calibrated, setCalibrated] = useState(false);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const currentFocusRef = useRef<number | null>(null);
  const confirmDwellRef = useRef<number | null>(null);
  const confirmSideRef = useRef<string | null>(null);

  // UI configuration
  const gridItems = [
    "I'm hungry", "Need help", "Bathroom",
    "I'm in pain", "Yes", "No"
  ];
  const dotIds = Array.from({ length: 9 }, (_, i) => `Pt${i + 1}`);
  const requiredClicks = 5;
  const confirmDwellDuration = 4000;

  // Smoothing function for gaze points
  const smoothGaze = (x: number, y: number, alpha = 0.2) => {
    if (lastX.current === null || lastY.current === null) {
      lastX.current = x;
      lastY.current = y;
    } else {
      lastX.current = lastX.current * (1 - alpha) + x * alpha;
      lastY.current = lastY.current * (1 - alpha) + y * alpha;
    }
    return [lastX.current, lastY.current];
  };

  // Initialize webgazer and calibration dots
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const initialCounts: Record<string, number> = {};
    dotIds.forEach(id => initialCounts[id] = 0);
    setClickCounts(initialCounts);

    try {
      // Check if webgazer is available
      if (window.webgazer) {
        console.log("WebGazer is initialized");
        
        window.webgazer.setRegression('ridge')
          .setGazeListener((data: any) => {
            if (data) {
              const [sx, sy] = smoothGaze(data.x, data.y);
              drawGazeDot(sx, sy);
              if (calibrated && !showConfirmOverlay) handleGridFocus(sx, sy);
              if (showConfirmOverlay) handleConfirmOverlayFocus(sx, sy);
            }
          })
          .begin();
    
        window.webgazer.showVideoPreview(true)
          .showPredictionPoints(false)
          .showFaceOverlay(true);
      } else {
        console.error("WebGazer is not available");
      }
    } catch (error) {
      console.error("Error initializing webgazer:", error);
    }
      
    return () => {
      // Cleanup if needed
      try {
        if (window.webgazer) {
          window.webgazer.end();
        }
      } catch (e) {
        console.error("Error cleaning up webgazer:", e);
      }
    };
  }, [calibrated, showConfirmOverlay, isAuthenticated]);

  // Setup canvas
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, [isAuthenticated]);

  // Handle calibration dot clicks
  const handleCalibrationClick = (id: string) => {
    if (calibrated) return;

    setClickCounts(prev => {
      const newCounts = { ...prev, [id]: prev[id] + 1 };
      const dot = document.getElementById(id);
      if (dot) {
        dot.style.opacity = (1 - newCounts[id] * 0.15).toString();
        if (newCounts[id] >= requiredClicks) {
          dot.style.display = 'none';
        }
      }

      const allDone = Object.values(newCounts).every(count => count >= requiredClicks);
      if (allDone) {
        setCalibrated(true);
        const instructions = document.getElementById("instructions");
        if (instructions) {
          instructions.textContent = "✅ Calibration complete. Gaze tracking is active!";
        }
      }

      return newCounts;
    });
  };

  // Draw gaze dot on canvas
  const drawGazeDot = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const clampedX = Math.max(0, Math.min(x, width));
    const clampedY = Math.max(0, Math.min(y, height));

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 150, 255, 0.6)";
    ctx.fill();
  };

  // Handle eye focus on grid items
  const handleGridFocus = (x: number, y: number) => {
    const boxes = document.querySelectorAll(".grid-box");
    const buffer = 60;
    let hoveredIndex = null;

    boxes.forEach((box, idx) => {
      const rect = box.getBoundingClientRect();
      const inBox =
        x >= rect.left - buffer &&
        x <= rect.right + buffer &&
        y >= rect.top - buffer &&
        y <= rect.bottom + buffer;

      if (inBox) hoveredIndex = idx;
    });

    if (hoveredIndex !== null) {
      const box = boxes[hoveredIndex] as HTMLElement;

      if (currentFocusRef.current !== hoveredIndex) {
        currentFocusRef.current = hoveredIndex;
        dwellStartRef.current = Date.now();
        boxes.forEach((b: Element) => {
          (b as HTMLElement).classList.remove("focused");
          (b as HTMLElement).removeAttribute("data-confirmed");
        });
      }

      const now = Date.now();
      if (
        dwellStartRef.current &&
        now - dwellStartRef.current > 2000 &&
        !box.getAttribute("data-confirmed")
      ) {
        box.setAttribute("data-confirmed", "true");
        box.classList.add("focused");
        const phrase = box.innerText;
        setSelectedPhrase(phrase);
        setShowConfirmOverlay(true);
        confirmDwellRef.current = null;
        confirmSideRef.current = null;
      }
    } else {
      if (currentFocusRef.current !== null) {
        const prevBox = boxes[currentFocusRef.current] as HTMLElement;
        prevBox.classList.remove("focused");
        prevBox.removeAttribute("data-confirmed");
        currentFocusRef.current = null;
        dwellStartRef.current = null;
      }
    }
  };

  // Handle eye focus on confirmation overlay
  const handleConfirmOverlayFocus = (x: number, y: number) => {
    const screenWidth = window.innerWidth;
    const side = x < screenWidth / 2 ? "left" : "right";

    if (confirmSideRef.current !== side) {
      confirmSideRef.current = side;
      confirmDwellRef.current = Date.now();
      setDwellProgress(0);
    } else {
      const now = Date.now();
      const progress = confirmDwellRef.current ? (now - confirmDwellRef.current) / confirmDwellDuration : 0;
      setDwellProgress(Math.min(progress, 1));
      if (progress >= 1) {
        if (side === "left") {
          // Confirm
          console.log("✅ Confirmed:", selectedPhrase);
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(selectedPhrase || ""));
        } else {
          console.log("❌ Cancelled");
        }
        setShowConfirmOverlay(false);
        setSelectedPhrase(null);
        setDwellProgress(0);
        confirmSideRef.current = null;
      }
    }
  };

  // Auth complete handler
  const handleAuthComplete = () => {
    setIsAuthenticated(true);
  };

  // If not authenticated, show Auth page
  if (!isAuthenticated) {
    return (
      <div className="app">
        <Auth onAuthComplete={handleAuthComplete} />
        <Toaster />
      </div>
    );
  }

  // If authenticated, show eye tracker app
  return (
    <div className="app">
      <h1>LooKey Eye Tracker</h1>
      <p id="instructions">Click each red dot 5 times to calibrate.</p>
      <canvas id="overlay" ref={canvasRef}></canvas>

      {!calibrated && dotIds.map(id => (
        <div key={id} id={id} className="calibration-dot" onClick={() => handleCalibrationClick(id)} />
      ))}

      {calibrated && !showConfirmOverlay && (
        <div className="grid-container">
          {gridItems.map((text, i) => (
            <div key={i} className="grid-box">{text}</div>
          ))}
        </div>
      )}

      {showConfirmOverlay && (
        <div className="confirm-overlay">
          <div className="confirm-side left">
            <h2>✅ You chose:</h2>
            <p>{selectedPhrase}</p>
            <div className="progress-bar">
              <div className="fill" style={{ width: confirmSideRef.current === "left" ? `${dwellProgress * 100}%` : 0 }}></div>
            </div>
          </div>
          <div className="confirm-side right">
            <h2>❌ Cancel</h2>
            <div className="progress-bar">
              <div className="fill" style={{ width: confirmSideRef.current === "right" ? `${dwellProgress * 100}%` : 0 }}></div>
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}

export default App;
