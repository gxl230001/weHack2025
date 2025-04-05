// App.jsx
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import webgazer from 'webgazer';

function App() {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [status, setStatus] = useState('Not started');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackingAreaRef = useRef(null);
  const cursorRef = useRef(null);
  
  const calibrationPoints = [
    { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
    { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
    { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 }
  ];

  useEffect(() => {
    // Setup canvas for WebGazer's video feedback
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startCamera = async () => {
    try {
      setStatus('Starting camera and initializing WebGazer...');
      
      // Initialize WebGazer
      await webgazer.setGazeListener((data, timestamp) => {
        if (data && isTracking) {
          setCoordinates({ x: data.x, y: data.y });
          if (cursorRef.current) {
            cursorRef.current.style.left = `${data.x}px`;
            cursorRef.current.style.top = `${data.y}px`;
          }
        }
      }).begin();
      
      // Set WebGazer video feed to our video element
      webgazer.showVideoPreview(false).showPredictionPoints(false);
      
      // Get a reference to WebGazer's video element and copy to our video element
      const webgazerVideo = document.getElementById('webgazerVideoFeed');
      if (webgazerVideo && videoRef.current) {
        videoRef.current.srcObject = webgazerVideo.srcObject;
      }
      
      setStatus('Camera started');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      console.error('Error starting WebGazer:', err);
    }
  };

  const startCalibration = () => {
    if (!webgazer.isReady()) {
      setStatus('Please start camera first');
      return;
    }
    
    setIsCalibrating(true);
    setCalibrationStep(0);
    setStatus('Calibration started: Point 1 of 9');
  };

  const handleCalibrationClick = (e) => {
    if (!isCalibrating) return;
    
    // WebGazer.js automatically collects calibration data on click events
    // Move to next calibration point
    setCalibrationStep(prevStep => {
      const nextStep = prevStep + 1;
      
      if (nextStep >= calibrationPoints.length) {
        finishCalibration();
        return prevStep;
      }
      
      setStatus(`Calibration: Point ${nextStep + 1} of 9`);
      return nextStep;
    });
  };

  const finishCalibration = () => {
    setIsCalibrating(false);
    setStatus('Calibration complete! Click "Start Tracking" to begin.');
  };

  const startTracking = () => {
    if (!webgazer.isReady()) {
      setStatus('Please calibrate first');
      return;
    }
    
    setIsTracking(true);
    setStatus('Tracking active - Look around the screen!');
  };

  const stopTracking = () => {
    setIsTracking(false);
    setStatus('Tracking stopped');
  };

  return (
    <div className="app-container">
      <div 
        ref={trackingAreaRef} 
        className="tracking-area"
        onClick={isCalibrating ? handleCalibrationClick : undefined}
      >
        <div 
          ref={cursorRef} 
          className="eye-cursor" 
          style={{ display: isTracking ? 'block' : 'none' }}
        ></div>
        
        {isCalibrating && (
          <div className="calibration-container">
            <div 
              className="calibration-point active"
              style={{ 
                left: `${calibrationPoints[calibrationStep].x}%`, 
                top: `${calibrationPoints[calibrationStep].y}%`
              }}
            ></div>
            
            <div className="calibration-instructions">
              <div className="instruction-box">
                <h3>Calibration Step {calibrationStep + 1} of 9</h3>
                <p>1. Look directly at the pulsing dot</p>
                <p>2. Click on the dot while keeping your gaze fixed on it</p>
                <p>3. Repeat for all 9 points to complete calibration</p>
              </div>
            </div>
            
            <div className="calibration-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(calibrationStep / calibrationPoints.length) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">{calibrationStep} of 9 points completed</div>
            </div>
          </div>
        )}
        
        <div className="video-feed">
          <video ref={videoRef} autoPlay playsInline></video>
          <canvas ref={canvasRef} width="400" height="300"></canvas>
        </div>
        
        <div className="controls">
          <button onClick={startCamera}>Start Camera</button>
          <button onClick={startCalibration} disabled={isCalibrating}>Start Calibration</button>
          <button onClick={startTracking} disabled={isTracking}>Start Tracking</button>
          <button onClick={stopTracking} disabled={!isTracking}>Stop Tracking</button>
          <div className="status">Status: {status}</div>
          <div className="coordinates">X: {Math.round(coordinates.x)}, Y: {Math.round(coordinates.y)}</div>
        </div>
      </div>
    </div>
  );
}

export default App;