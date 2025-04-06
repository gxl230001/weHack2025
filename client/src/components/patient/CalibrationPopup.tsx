import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ToggleCalibrationPopup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, ArrowRight } from "lucide-react";

interface CalibrationPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function CalibrationPopup({ open, onClose }: CalibrationPopupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const totalSteps = 3;

  // Toggle calibration popup preference
  const updateCalibrationPreference = useMutation({
    mutationFn: async (data: ToggleCalibrationPopup) => {
      await apiRequest("POST", "/api/patient/toggle-calibration-popup", data);
    },
    onSuccess: () => {
      toast({
        title: "Preference saved",
        description: dontShowAgain 
          ? "You will not see this popup again when you log in." 
          : "You'll see this popup when you log in next time.",
      });
      handleFinish();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to save preference",
        description: "There was a problem saving your preference. Please try again.",
      });
      handleFinish();
    }
  });

  // Handle next step
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      updateCalibrationPreference.mutate({ showPopup: !dontShowAgain });
    }
  };

  // Handle back step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle finish
  const handleFinish = () => {
    setStep(1);
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    setStep(1);
    setDontShowAgain(false);
    onClose();
  };

  // Content for each step
  const stepContent = [
    {
      title: "Welcome to WebGaze Calibration",
      description: (
        <>
          <p className="mb-4">
            WebGaze is a technology that tracks your eye movements to help you navigate 
            the application without using your hands. This is especially helpful for 
            people with neuromotor disabilities.
          </p>
          <p>
            In the next steps, we'll guide you through the calibration process to ensure 
            WebGaze works accurately with your eye movements.
          </p>
        </>
      ),
    },
    {
      title: "How It Works",
      description: (
        <>
          <p className="mb-4">
            WebGaze uses your device's camera to track your eye movements. The system 
            needs to be calibrated to understand how your specific eye movements relate 
            to positions on the screen.
          </p>
          <p className="mb-4">
            During calibration, you'll look at a series of dots that appear on your screen. 
            The system will learn from this and adapt to your unique eye patterns.
          </p>
          <p>
            For best results, make sure you're in a well-lit room and your face is clearly
            visible to your camera.
          </p>
        </>
      ),
    },
    {
      title: "Ready to Begin",
      description: (
        <>
          <p className="mb-4">
            When you're ready to start the calibration process, click the "Begin Calibration" 
            button below. The process takes about 30-60 seconds to complete.
          </p>
          <p className="mb-4">
            You can run this calibration again at any time from your dashboard if needed.
          </p>
          <div className="flex items-center space-x-2 mt-6">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => {
                if (typeof checked === 'boolean') {
                  setDontShowAgain(checked);
                }
              }}
            />
            <Label htmlFor="dont-show-again" className="cursor-pointer">
              Don't show this introduction again
            </Label>
          </div>
        </>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Eye className="h-5 w-5 mr-2 text-primary" />
            {stepContent[step - 1].title}
          </DialogTitle>
          <DialogDescription className="pt-4">
            Step {step} of {totalSteps}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {stepContent[step - 1].description}
        </div>
        
        <DialogFooter>
          <div className="flex w-full justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain layout
            )}
            
            <Button 
              onClick={handleNext}
              disabled={updateCalibrationPreference.isPending}
            >
              {step === totalSteps ? (
                updateCalibrationPreference.isPending ? (
                  "Saving..."
                ) : (
                  "Begin Calibration"
                )
              ) : (
                <>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}