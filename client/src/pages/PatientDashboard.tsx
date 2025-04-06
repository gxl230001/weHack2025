import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthResponse } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function PatientDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get current user
  const { data: user, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/user"]
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary px-6 py-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold">MedConnect</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.name}</span>
            <Button 
              variant="outline" 
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to your patient dashboard, {user?.name}!</p>
            <p className="mt-4">This is where you would see your healthcare information, appointments, and communicate with caregivers.</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Username:</span>
                  <span>{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Account Type:</span>
                  <span>Patient</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-4">No recent activity to display.</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-4 text-center text-sm text-gray-600">
        <p>© 2023 MedConnect. All rights reserved.</p>
      </footer>
    </div>
  );
}
