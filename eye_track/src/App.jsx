import React, { useEffect, useRef, useState } from 'react';
import webgazer from 'webgazer';
import './App.css';

function App() {
  let lastX = null;
  let lastY = null;

  const smoothGaze = (x, y, alpha = 0.5) => {
    if (lastX === null || lastY === null) {
      lastX = x;
      lastY = y;
    } else {
      lastX = lastX * (1 - alpha) + x * alpha;
      lastY = lastY * (1 - alpha) + y * alpha;
    }
    return [lastX, lastY];
  };

  const [clickCounts, setClickCounts] = useState({});
  const [calibrated, setCalibrated] = useState(false);
  const canvasRef = useRef(null);

  const [focusedBoxIndex, setFocusedBoxIndex] = useState(null);
  const dwellStartRef = useRef(null);
  const gridItems = [
    "I'm hungry", "Need help", "Bathroom",
    "I'm in pain", "Yes", "No"
  ];

  const requiredClicks = 5;
  const dotIds = [
    'Pt1', 'Pt2', 'Pt3',
    'Pt4', 'Pt5', 'Pt6',
    'Pt7', 'Pt8', 'Pt9'
  ];

  useEffect(() => {
    const initialCounts = {};
    dotIds.forEach(id => initialCounts[id] = 0);
    setClickCounts(initialCounts);

    webgazer.setRegression('ridge')
      .setGazeListener((data) => {
        if (data) {
          const [sx, sy] = smoothGaze(data.x, data.y);
          drawGazeDot(sx, sy);
          if (calibrated) handleGridFocus(sx, sy);
        }
      })
      .begin();

    webgazer.showVideoPreview(true)
            .showPredictionPoints(false)
            .showFaceOverlay(true);
  }, []);

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
        const instructions = document.getElementById("instructions");
        if (instructions) instructions.textContent = "✅ Calibration complete. Gaze tracking is active!";
      }

      return newCounts;
    });
  };

  function drawGazeDot(x, y) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const clampedX = Math.max(0, Math.min(x, width));
    const clampedY = Math.max(0, Math.min(y, height));

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 150, 255, 0.6)";
    ctx.fill();
  }

  const handleGridFocus = (x, y) => {
    const boxes = document.querySelectorAll(".grid-box");
    let current = null;

    boxes.forEach((box, idx) => {
      const rect = box.getBoundingClientRect();
      const inBox = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      if (inBox) current = idx;
    });

    if (current !== null) {
      if (current !== focusedBoxIndex) {
        setFocusedBoxIndex(current);
        dwellStartRef.current = Date.now();
        boxes.forEach((b, i) => b.classList.remove("focused"));
      } else if (Date.now() - dwellStartRef.current > 1200) {
        boxes[current].classList.add("focused");
      }
    } else {
      setFocusedBoxIndex(null);
      boxes.forEach(box => box.classList.remove("focused"));
    }
  };

  return (
    <div className="app">
      <h1>LooKey Eye Tracker</h1>
      <p id="instructions">Click each red dot 5 times to calibrate.</p>

      <canvas id="overlay" ref={canvasRef}></canvas>

      {/* Red calibration dots */}
      {!calibrated && dotIds.map((id) => (
        <div
          key={id}
          id={id}
          className="calibration-dot"
          onClick={() => handleCalibrationClick(id)}
        ></div>
      ))}

      {/* Grid options after calibration */}
      {calibrated && (
        <div className="grid-container">
          {gridItems.map((text, i) => (
            <div key={i} className="grid-box" data-index={i}>
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
