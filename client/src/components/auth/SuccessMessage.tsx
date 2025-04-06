import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessMessageProps {
  onContinue: () => void;
}

export default function SuccessMessage({ onContinue }: SuccessMessageProps) {
  return (
    <div className="text-center py-6 animate-in fade-in duration-300">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Successful!</h3>
      <p className="text-gray-600 mb-4">Your account has been created successfully.</p>
      <Button className="w-full" onClick={onContinue}>
        Continue to Login
      </Button>
    </div>
  );
}
