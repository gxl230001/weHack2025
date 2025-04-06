import { useEffect, useRef, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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

  // UI config
  const gridItems = [
    "I'm hungry", "Need help", "Bathroom",
    "I'm in pain", "Yes", "No"
  ];
  const dotIds = useMemo(() => Array.from({ length: 9 }, (_, i) => `Pt${i + 1}`), []);
  const requiredClicks = 5;
  const confirmDwellDuration = 4000;

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

  // Check camera permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissions.state === 'granted') {
          setCameraPermission('granted');
        } else if (permissions.state === 'denied') {
          setCameraPermission('denied');
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please allow camera access to use eye tracking.",
          });
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraPermission('granted');
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        setCameraPermission('denied');
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera access and reload the page.",
        });
      }
    };

    checkPermission();
  }, [toast]);

  // Initialize WebGazer
  useEffect(() => {
    if (cameraPermission !== 'granted') return;

    const initialCounts: Record<string, number> = {};
    dotIds.forEach(id => initialCounts[id] = 0);
    setClickCounts(initialCounts);

    try {
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
        toast({
          variant: "destructive",
          title: "WebGazer Error",
          description: "WebGazer library is not available. Please reload or check browser compatibility.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "WebGazer Error",
        description: "Failed to initialize eye tracking. Please try again.",
      });
    }

    return () => {
      try {
        if (window.webgazer) {
          window.webgazer.end();
          console.log("WebGazer stopped");
        }
      } catch (err) {
        console.error("Error stopping WebGazer:", err);
      }
    };
  }, [cameraPermission, calibrated, showConfirmOverlay, toast, dotIds]);

  // Set canvas size
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

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calibration click handler
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
        toast({
          title: "Calibration Complete",
          description: "Eye tracking is now active.",
        });
        const instructions = document.getElementById("instructions");
        if (instructions) {
          instructions.textContent = "✅ Calibration complete. Gaze tracking is active!";
        }
      }

      return newCounts;
    });
  };

  // Draw gaze dot
  const drawGazeDot = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 150, 255, 0.6)";
    ctx.fill();
  };

  const handleGridFocus = (x: number, y: number) => {
    const boxes = document.querySelectorAll(".grid-box");
    const buffer = 60;
    let hoveredIndex: number | null = null;

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
        boxes.forEach((b) => {
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

  const handleConfirmOverlayFocus = (x: number, y: number) => {
    const screenWidth = window.innerWidth;
    const side = x < screenWidth / 2 ? "left" : "right";

    if (confirmSideRef.current !== side) {
      confirmSideRef.current = side;
      confirmDwellRef.current = Date.now();
      setDwellProgress(0);
    } else {
      const now = Date.now();
      const progress = confirmDwellRef.current
        ? (now - confirmDwellRef.current) / confirmDwellDuration
        : 0;
      setDwellProgress(Math.min(progress, 1));
      if (progress >= 1) {
        if (side === "left") {
          toast({
            title: "Message Sent",
            description: `"${selectedPhrase}" has been sent.`,
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
          <Button variant="outline" onClick={onClose}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="w-full h-full pt-20">
        <p id="instructions" className="text-center text-lg mb-8 font-medium">
          {!calibrated
            ? "Click each red dot 5 times to calibrate the eye tracking."
            : "✅ Calibration complete. Gaze tracking is active!"}
        </p>

        <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" />

        {!calibrated &&
          dotIds.map((id) => (
            <div key={id} id={id} className="calibration-dot" onClick={() => handleCalibrationClick(id)} />
          ))}

        {calibrated && !showConfirmOverlay && (
          <div className="grid-container fixed bottom-28 left-1/2 transform -translate-x-1/2 grid grid-cols-3 gap-5 w-4/5 max-w-4xl z-10">
            {gridItems.map((text, i) => (
              <div key={i} className="grid-box bg-primary text-white h-48 flex items-center justify-center font-bold text-xl border-3 border-transparent rounded-xl transition-all">
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
      </div>
    </div>
  );
}
