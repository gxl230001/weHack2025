import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthResponse, HealthNoteResponse } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CalibrationPopup from "@/components/patient/CalibrationPopup";
import WebGazeTracker from "@/components/patient/WebGazeTracker";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  User, 
  ClipboardList, 
  Eye, 
  Calendar,
  Activity 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PatientDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCalibrationPopup, setShowCalibrationPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showWebGazeTracker, setShowWebGazeTracker] = useState(false);

  // Get current user
  const { data: user, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/user"]
  });

  // Check if calibration popup should be shown
  useEffect(() => {
    if (user && user.showCalibrationPopup) {
      setShowCalibrationPopup(true);
    }
  }, [user]);

  // Handle calibration popup close
  const handleCalibrationClose = () => {
    setShowCalibrationPopup(false);
    // Start WebGazer when calibration popup is closed
    if (user?.showCalibrationPopup === false) {
      setShowWebGazeTracker(true);
    }
  };

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

  // Health notes query
  const { data: healthNotes = [] } = useQuery<HealthNoteResponse[]>({
    queryKey: ["/api/patient/health-notes"],
    enabled: !!user,
  });

  // Handle WebGaze start
  const startWebGaze = () => {
    setShowWebGazeTracker(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // If WebGaze is active, show the WebGazeTracker component
  if (showWebGazeTracker) {
    return <WebGazeTracker onClose={() => setShowWebGazeTracker(false)} />;
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
            <CardTitle className="text-2xl">Patient Dashboard</CardTitle>
            <CardDescription>
              Welcome to your personal healthcare portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Hello {user?.name}! From here you can view your health notes, manage your account, and access the WebGaze assistive technology.</p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Health Records</span>
            </TabsTrigger>
            <TabsTrigger value="webgaze" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">WebGaze</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Name:</span>
                      <span>{user?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Username:</span>
                      <span>{user?.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Account Type:</span>
                      <Badge>Patient</Badge>
                    </div>
                    
                    <div className="pt-4">
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("webgaze")}>
                        <Eye className="h-4 w-4 mr-2" />
                        WebGaze Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-primary" />
                    Health Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Recent Notes:</span>
                      <span className="text-lg font-semibold text-primary">{healthNotes.length}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Last updated:</h3>
                      {healthNotes.length > 0 ? (
                        <p className="text-sm">
                          {new Date(
                            Math.max(...healthNotes.map(n => new Date(n.updatedAt).getTime()))
                          ).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No health records yet</p>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setActiveTab("health")}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        View Health Records
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                  Health Notes & Records
                </CardTitle>
                <CardDescription>
                  View notes and records from your caregivers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {healthNotes.length > 0 ? (
                  <div className="space-y-6">
                    {healthNotes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg text-primary">{note.title}</h3>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            {new Date(note.createdAt).toLocaleDateString() !== 
                              new Date(note.updatedAt).toLocaleDateString() && (
                              <span className="text-xs text-gray-500">
                                Updated: {new Date(note.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line py-2">{note.content}</p>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t">
                          <Badge variant="outline">Health Note</Badge>
                          <span className="text-sm text-gray-500">By: {note.caregiverName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No health notes or records yet.</p>
                    <p className="text-sm mt-1">Your caregivers will add health information here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="webgaze">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-primary" />
                  WebGaze Assistant
                </CardTitle>
                <CardDescription>
                  Eye tracking technology to help with navigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-primary/5 rounded-lg p-6 mb-6">
                  <h3 className="font-medium text-primary text-lg mb-3">About WebGaze Technology</h3>
                  <p className="mb-4">
                    WebGaze is an assistive technology that tracks your eye movements to help you
                    navigate the application without using your hands. This is designed specifically 
                    for individuals with neuromotor disabilities.
                  </p>
                  <p className="mb-4">
                    The technology uses your device's camera to track your eye movements and translate
                    them into cursor movements and actions. To work properly, WebGaze needs to be
                    calibrated to your specific eye movements.
                  </p>
                  <div className="bg-white rounded p-4 border mb-4">
                    <h4 className="font-medium mb-2">Setup Requirements:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="bg-green-500 rounded-full h-2 w-2 mt-1.5 mr-2"></span>
                        Webcam or front-facing camera
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 rounded-full h-2 w-2 mt-1.5 mr-2"></span>
                        Good lighting on your face
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 rounded-full h-2 w-2 mt-1.5 mr-2"></span>
                        Stable head position during calibration
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 rounded-full h-2 w-2 mt-1.5 mr-2"></span>
                        Browser permission to access your camera
                      </li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={startWebGaze}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Launch WebGaze Communication Tool
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <span className="bg-primary/20 p-1.5 rounded-full mr-2">
                        <Eye className="h-4 w-4 text-primary" />
                      </span>
                      Tips for Best Results
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li>Maintain good lighting on your face</li>
                      <li>Keep a stable head position</li>
                      <li>Take breaks if your eyes feel tired</li>
                      <li>Recalibrate if accuracy decreases</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <span className="bg-primary/20 p-1.5 rounded-full mr-2">
                        <Activity className="h-4 w-4 text-primary" />
                      </span>
                      Control Functions
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li>Stare to move cursor</li>
                      <li>Blink once to click</li>
                      <li>Blink twice to right-click</li>
                      <li>Look up/down to scroll</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-4 text-center text-sm text-gray-600">
        <p>© 2025 Lookie. All rights reserved.</p>
      </footer>

      {/* Calibration Popup */}
      <CalibrationPopup 
        open={showCalibrationPopup} 
        onClose={handleCalibrationClose} 
      />
    </div>
  );
}
