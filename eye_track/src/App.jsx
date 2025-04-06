import React, { useEffect, useRef, useState } from 'react';
import webgazer from 'webgazer';
import './App.css';

function App() {
  const lastPosRef = useRef({ x: null, y: null });


  const smoothGaze = (x, y, alpha = 0.8) => {
    let { x: lastX, y: lastY } = lastPosRef.current;
  
    // Boost for top rows if y is too low
    const height = window.innerHeight;
    if (y < height * 0.3) {
      y = y - (height * 0.05); // bump up slightly when low
      y = Math.max(0, y); // clamp
    }
  
    if (lastX === null || lastY === null) {
      lastPosRef.current = { x, y };
    } else {
      lastX = lastX * (1 - alpha) + x * alpha;
      lastY = lastY * (1 - alpha) + y * alpha;
      lastPosRef.current = { x: lastX, y: lastY };
    }
  
    return [lastPosRef.current.x, lastPosRef.current.y];
  };
  
  

  const [clickCounts, setClickCounts] = useState({});
  const [calibrated, setCalibrated] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [confirmSide, setConfirmSide] = useState(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const canvasRef = useRef(null);
  const dwellStartRef = useRef(null);
  const currentFocusRef = useRef(null);
  const confirmDwellRef = useRef(null);
  const confirmSideRef = useRef(null);

  const gridItems = [
    "I'm hungry", "Need help", "Bathroom",
    "I'm in pain", "Yes", "No"
  ];

  const dotIds = Array.from({ length: 9 }, (_, i) => `Pt${i + 1}`);
  const requiredClicks = 5;
  const confirmDwellDuration = 3000; // ms

  useEffect(() => {
    const initialCounts = {};
    dotIds.forEach(id => initialCounts[id] = 0);
    setClickCounts(initialCounts);

    webgazer.setRegression('ridge')
      .setGazeListener((data) => {
        if (data) {
          const [sx, sy] = smoothGaze(data.x, data.y);
          drawGazeDot(sx, sy);
          if (calibrated && !showConfirmOverlay) handleGridFocus(sx, sy);
          if (showConfirmOverlay) handleConfirmOverlayFocus(sx, sy);
        }
      })
      .begin();

    webgazer.showVideoPreview(true)
      .showPredictionPoints(false)
      .showFaceOverlay(true);
  }, [calibrated, showConfirmOverlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  const handleCalibrationClick = (id) => {
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
        document.getElementById("instructions").textContent = "✅ Calibration complete. Gaze tracking is active!";
      }

      return newCounts;
    });
  };

  const drawGazeDot = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const margin = 10; // radius of the dot
const clampedX = Math.max(margin, Math.min(x, width - margin));
const clampedY = Math.max(margin, Math.min(y, height - margin));


    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 150, 255, 0.6)";
    ctx.fill();
  };

  const handleGridFocus = (x, y) => {
    const boxes = document.querySelectorAll(".grid-box");
    const buffer = 60;
    let hoveredIndex = null;
  
    boxes.forEach((box, idx) => {
      const rect = box.getBoundingClientRect();
      const topRow = idx < 3; // adjust this if layout changes
      const dynamicBuffer = topRow ? 80 : 60;
    
      const inBox =
        x >= rect.left - dynamicBuffer &&
        x <= rect.right + dynamicBuffer &&
        y >= rect.top - dynamicBuffer &&
        y <= rect.bottom + dynamicBuffer;
    
      if (inBox) hoveredIndex = idx;
    });
    
  
    if (hoveredIndex !== null) {
      const box = boxes[hoveredIndex];
  
      if (currentFocusRef.current !== hoveredIndex) {
        currentFocusRef.current = hoveredIndex;
        dwellStartRef.current = Date.now();
        boxes.forEach(b => {
          b.classList.remove("focused");
          b.removeAttribute("data-confirmed");
        });
      } else {
        const now = Date.now();
        const dwellTime = now - dwellStartRef.current;
        box.classList.add("focused"); // show focus immediately
        if (dwellTime > 2000 && !box.getAttribute("data-confirmed")) {
          box.setAttribute("data-confirmed", "true");
          setSelectedPhrase(box.innerText);
          setShowConfirmOverlay(true);
          confirmDwellRef.current = null;
          confirmSideRef.current = null;
        }
      }
    } else {
      if (currentFocusRef.current !== null) {
        const prevBox = boxes[currentFocusRef.current];
        prevBox.classList.remove("focused");
        prevBox.removeAttribute("data-confirmed");
        currentFocusRef.current = null;
        dwellStartRef.current = null;
      }
    }
  };
  

  const handleConfirmOverlayFocus = (x, y) => {
    const screenWidth = window.innerWidth;
    const side = x < screenWidth / 2 ? "left" : "right";

    if (confirmSideRef.current !== side) {
      confirmSideRef.current = side;
      confirmDwellRef.current = Date.now();
      setDwellProgress(0);
    } else {
      const now = Date.now();
      const progress = (now - confirmDwellRef.current) / confirmDwellDuration;
      setDwellProgress(Math.min(progress, 1));
      if (progress >= 1) {
        if (side === "left") {
          console.log("✅ Confirmed:", selectedPhrase);
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(selectedPhrase));
        } else {
          console.log("❌ Cancelled");
        }
      
        // 🔄 Fully reset all state
        lastPosRef.current = { x: null, y: null };
        currentFocusRef.current = null;
        dwellStartRef.current = null;
        confirmSideRef.current = null;
        confirmDwellRef.current = null;
      
        setShowConfirmOverlay(false);
        setSelectedPhrase(null);
        setDwellProgress(0);
      }
      
      
    }
  };

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
    </div>
  );
}

export default App;
