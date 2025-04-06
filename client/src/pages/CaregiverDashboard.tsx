import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthResponse, PatientListItem } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PatientList from "@/components/caregiver/PatientList";
import PatientNotes from "@/components/caregiver/PatientNotes";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Users, ClipboardList, User } from "lucide-react";

export default function CaregiverDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Get current user
  const { data: user, isLoading: loadingUser } = useQuery<AuthResponse>({
    queryKey: ["/api/user"]
  });

  // Get assigned patients
  const { data: patients, isLoading: loadingPatients } = useQuery<PatientListItem[]>({
    queryKey: ["/api/caregiver/patients"],
    enabled: !!user
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
      // Clear query cache to ensure proper logout
      queryClient.clear();
    },
    onSuccess: () => {
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      window.location.href = "/"; // Use direct redirection for more reliable logout
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
      });
    }
  });

  if (loadingUser) {
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
          <h1 className="text-2xl font-semibold">Lookie</h1>
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
            <CardTitle>Caregiver Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to your caregiver dashboard, {user?.name}!</p>
            <p className="mt-4">Here you can manage your patients, document their health status, and view patient information.</p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Patient Management</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Health Notes</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Username:</span>
                      <span>{user?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Account Type:</span>
                      <span>Caregiver</span>
                    </div>
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setActiveTab("patients")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Patients
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Patient Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPatients ? (
                    <p className="text-center py-4">Loading patients...</p>
                  ) : (
                    <div className="space-y-4">
                      {patients && patients.length > 0 ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Patients:</span>
                            <span className="text-lg font-semibold text-primary">{patients.length}</span>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-sm font-medium mb-2">Patients under your care:</h4>
                            <ul className="space-y-2">
                              {patients.slice(0, 5).map((patient) => (
                                <li key={patient.id} className="flex justify-between text-sm">
                                  <span>{patient.name}</span>
                                  <span className="text-muted-foreground">Age: {patient.age}</span>
                                </li>
                              ))}
                            </ul>
                            {patients.length > 5 && (
                              <p className="text-xs text-center mt-2 text-muted-foreground">
                                + {patients.length - 5} more patients
                              </p>
                            )}
                          </div>
                          <div className="pt-2">
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => setActiveTab("notes")}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              View Health Notes
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 mb-4">No patients assigned yet.</p>
                          <Button 
                            onClick={() => setActiveTab("patients")}
                            className="w-full"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Add Patients
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="patients">
            <PatientList />
          </TabsContent>
          
          <TabsContent value="notes">
            <PatientNotes 
              patients={patients} 
              isLoading={loadingPatients} 
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-4 text-center text-sm text-gray-600">
        <p>© 2025 Lookie. All rights reserved.</p>
      </footer>
    </div>
  );
}
