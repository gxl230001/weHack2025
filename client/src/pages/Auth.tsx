import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AuthResponse } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "@/components/auth/LoginForm";
import SignupTypeSelection from "@/components/auth/SignupTypeSelection";
import PatientSignupForm from "@/components/auth/PatientSignupForm";
import CaregiverSignupForm from "@/components/auth/CaregiverSignupForm";
import SuccessMessage from "@/components/auth/SuccessMessage";

type AuthFormType = 'login' | 'signupType' | 'patientSignup' | 'caregiverSignup' | 'success';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [currentForm, setCurrentForm] = useState<AuthFormType>('login');
  const [, setLocation] = useLocation();

  // Check if user is already logged in
  const { data: user } = useQuery<AuthResponse | null>({
    queryKey: ["/api/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.userType === "patient") {
        setLocation("/patient");
      } else {
        setLocation("/caregiver");
      }
    }
  }, [user, setLocation]);

  const switchToLogin = () => {
    setActiveTab('login');
    setCurrentForm('login');
  };

  const switchToSignup = () => {
    setActiveTab('signup');
    setCurrentForm('signupType');
  };

  const switchToPatientSignup = () => {
    setCurrentForm('patientSignup');
  };

  const switchToCaregiverSignup = () => {
    setCurrentForm('caregiverSignup');
  };

  const showSuccessMessage = () => {
    setCurrentForm('success');
  };

  const backToSignupType = () => {
    setCurrentForm('signupType');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex items-center justify-center flex-grow p-4">
        <div className="w-full max-w-xl bg-white rounded-lg shadow-md overflow-hidden">
          <Header />
          
          {/* Auth Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button 
                className={`flex-1 py-4 font-medium text-center ${
                  activeTab === 'login' 
                    ? 'text-primary border-b-2 border-primary bg-primary-50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={switchToLogin}
              >
                Login
              </button>
              <button 
                className={`flex-1 py-4 font-medium text-center ${
                  activeTab === 'signup' 
                    ? 'text-primary border-b-2 border-primary bg-primary-50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={switchToSignup}
              >
                Signup
              </button>
            </div>
          </div>
          
          {/* Forms Container */}
          <div className="p-6">
            {currentForm === 'login' && <LoginForm />}
            
            {currentForm === 'signupType' && (
              <SignupTypeSelection 
                onSelectPatient={switchToPatientSignup} 
                onSelectCaregiver={switchToCaregiverSignup}
                onBackToLogin={switchToLogin}
              />
            )}
            
            {currentForm === 'patientSignup' && (
              <PatientSignupForm 
                onBack={backToSignupType}
                onSuccess={showSuccessMessage}
              />
            )}
            
            {currentForm === 'caregiverSignup' && (
              <CaregiverSignupForm 
                onBack={backToSignupType}
                onSuccess={showSuccessMessage}
              />
            )}
            
            {currentForm === 'success' && (
              <SuccessMessage onContinue={switchToLogin} />
            )}
          </div>
          
          <Footer />
        </div>
      </div>
    </div>
  );
}
