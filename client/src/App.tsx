import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Auth from "@/pages/Auth";
import PatientDashboard from "@/pages/PatientDashboard";
import CaregiverDashboard from "@/pages/CaregiverDashboard";
import { useQuery } from "@tanstack/react-query";
import { AuthResponse } from "@shared/schema";

function ProtectedRoute({ 
  component: Component, 
  requiredUserType
}: { 
  component: React.ComponentType, 
  requiredUserType?: string 
}) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ["/api/user"],
    staleTime: 300000, // 5 minutes
    retry: false,
    onError: () => {
      setLocation("/");
    }
  });
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    setLocation("/");
    return null;
  }
  
  if (requiredUserType && user.userType !== requiredUserType) {
    if (user.userType === "patient") {
      setLocation("/patient");
    } else {
      setLocation("/caregiver");
    }
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Auth} />
      <Route path="/patient">
        <ProtectedRoute component={PatientDashboard} requiredUserType="patient" />
      </Route>
      <Route path="/caregiver">
        <ProtectedRoute component={CaregiverDashboard} requiredUserType="caregiver" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
