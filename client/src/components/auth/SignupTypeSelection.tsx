import { UserIcon, FlaskRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignupTypeSelectionProps {
  onSelectPatient: () => void;
  onSelectCaregiver: () => void;
  onBackToLogin: () => void;
}

export default function SignupTypeSelection({ 
  onSelectPatient, 
  onSelectCaregiver,
  onBackToLogin
}: SignupTypeSelectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-medium text-gray-800 text-center mb-4">I am a:</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={onSelectPatient}
          className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <UserIcon className="h-10 w-10 text-primary mb-2" />
          <span className="font-medium text-gray-800">Patient</span>
        </button>
        
        <button 
          onClick={onSelectCaregiver}
          className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <FlaskRound className="h-10 w-10 text-primary mb-2" />
          <span className="font-medium text-gray-800">Caregiver</span>
        </button>
      </div>
      
      <Button
        variant="link"
        onClick={onBackToLogin}
        className="w-full text-primary hover:text-primary-600"
      >
        Already have an account? Login
      </Button>
    </div>
  );
}
