import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface WebGazeTrackerProps {
  onClose: () => void;
}

export default function WebGazeTracker({ onClose }: WebGazeTrackerProps) {
  const { toast } = useToast();
  const [calibrated, setCalibrated] = useState(false);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
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

  // Check camera permissions
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        // First, check if we already have permission
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissions.state === 'granted') {
          setCameraPermission('granted');
          return;
        } else if (permissions.state === 'denied') {
          setCameraPermission('denied');
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please allow camera access to use eye tracking features.",
          });
          return;
        }
        
        // Ask for camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermission('granted');
        
        // Stop the stream immediately since WebGazer will request it again
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error("Camera permission error:", error);
        setCameraPermission('denied');
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please allow camera access in your browser settings and reload the page.",
        });
      }
    };
    
    checkCameraPermission();
  }, [toast]);

  // Initialize webgazer and calibration dots
  useEffect(() => {
    // Skip initialization if camera permission is not granted
    if (cameraPermission !== 'granted') return;
    
    const initialCounts: Record<string, number> = {};
    dotIds.forEach(id => initialCounts[id] = 0);
    setClickCounts(initialCounts);

    try {
      // Check if webgazer is available
      if (window.webgazer) {
        console.log("WebGazer is initializing...");
        
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
          
        console.log("WebGazer initialized successfully");
      } else {
        console.error("WebGazer is not available");
        toast({
          variant: "destructive",
          title: "WebGazer Error",
          description: "Eye tracking library is not available. Please check your browser compatibility.",
        });
      }
    } catch (error) {
      console.error("Error initializing webgazer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize eye tracking. Please try again.",
      });
    }
      
    return () => {
      // Cleanup webgazer when component unmounts
      try {
        if (window.webgazer) {
          window.webgazer.end();
          console.log("WebGazer ended");
        }
      } catch (e) {
        console.error("Error cleaning up webgazer:", e);
      }
    };
  }, [calibrated, showConfirmOverlay, toast, cameraPermission, dotIds]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        
        toast({
          title: "Calibration Complete",
          description: "Eye tracking is now active. Look at an option and hold your gaze to select it.",
        });
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
          toast({
            title: "Message Sent",
            description: `"${selectedPhrase}" has been sent to your caregiver.`,
          });
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

  return (
    <div className="webgaze-app">
      <div className="fixed top-0 left-0 z-50 w-full bg-primary px-6 py-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold">WebGaze Assistive Technology</h1>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="w-full h-full pt-20">
        {cameraPermission === 'pending' && (
          <div className="text-center py-10">
            <div className="animate-pulse bg-blue-100 inline-block p-6 rounded-full mb-6">
              <div className="w-12 h-12 mx-auto bg-primary/60 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-medium mb-2">Camera Access Required</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Please allow camera access when prompted. The WebGaze feature needs your camera to track eye movements.
            </p>
          </div>
        )}

        {cameraPermission === 'denied' && (
          <div className="text-center py-10">
            <div className="bg-red-100 inline-block p-6 rounded-full mb-6">
              <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-medium mb-2">Camera Access Denied</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              WebGaze requires camera access to track eye movements. Please enable camera access in your browser settings and reload this page.
            </p>
            <Button onClick={onClose}>
              Return to Dashboard
            </Button>
          </div>
        )}

        {cameraPermission === 'granted' && (
          <>
            <p id="instructions" className="text-center text-lg mb-8 font-medium">
              {!calibrated 
                ? "Click each red dot 5 times to calibrate the eye tracking." 
                : "✅ Calibration complete. Gaze tracking is active!"}
            </p>

            <canvas id="gaze-overlay" className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" ref={canvasRef}></canvas>

            {!calibrated && dotIds.map(id => (
              <div key={id} id={id} className="calibration-dot" onClick={() => handleCalibrationClick(id)} />
            ))}

            {calibrated && !showConfirmOverlay && (
              <div className="grid-container fixed bottom-28 left-1/2 transform -translate-x-1/2 
                              grid grid-cols-3 gap-5 w-4/5 max-w-4xl z-10">
                {gridItems.map((text, i) => (
                  <div key={i} className="grid-box bg-primary text-white h-48 flex items-center justify-center 
                                        font-bold text-xl border-3 border-transparent rounded-xl transition-all">
                    {text}
                  </div>
                ))}
              </div>
            )}

            {showConfirmOverlay && (
              <div className="confirm-overlay fixed top-0 left-0 w-full h-full flex z-[9999]">
                <div className="confirm-side left flex-1 flex flex-col justify-center items-center bg-green-500/70 text-white p-5">
                  <h2 className="text-2xl font-bold mb-4">✅ You chose:</h2>
                  <p className="text-3xl mb-6">{selectedPhrase}</p>
                  <div className="progress-bar w-4/5 h-3 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all" 
                      style={{ width: confirmSideRef.current === "left" ? `${dwellProgress * 100}%` : 0 }}
                    ></div>
                  </div>
                </div>
                <div className="confirm-side right flex-1 flex flex-col justify-center items-center bg-red-500/70 text-white p-5">
                  <h2 className="text-2xl font-bold mb-4">❌ Cancel</h2>
                  <div className="progress-bar w-4/5 h-3 bg-white/30 rounded-full overflow-hidden mt-12">
                    <div 
                      className="h-full bg-white transition-all" 
                      style={{ width: confirmSideRef.current === "right" ? `${dwellProgress * 100}%` : 0 }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    
    </div>
  );
}