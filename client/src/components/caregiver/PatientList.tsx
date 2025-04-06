import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PatientListItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Activity, UserPlus } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const DISABILITY_TYPES = {
  "cerebral-palsy": "Cerebral Palsy",
  "multiple-sclerosis": "Multiple Sclerosis",
  "parkinsons": "Parkinson's Disease",
  "spinal-cord-injury": "Spinal Cord Injury",
  "stroke": "Stroke",
  "other": "Other"
};

export default function PatientList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddPatientDialog, setShowAddPatientDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);

  // Get current caregiver's patients
  const { data: assignedPatients, isLoading: loadingAssigned } = useQuery<PatientListItem[]>({
    queryKey: ["/api/caregiver/patients"],
  });

  // Get all available patients
  const { data: availablePatients, isLoading: loadingAvailable } = useQuery<PatientListItem[]>({
    queryKey: ["/api/caregiver/available-patients"],
    enabled: showAddPatientDialog,
  });

  // Assign patient mutation
  const assignPatient = useMutation({
    mutationFn: async (patientId: number) => {
      await apiRequest("POST", `/api/caregiver/assign-patient/${patientId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Patient assigned successfully",
        description: "The patient has been added to your list.",
      });
      setShowAddPatientDialog(false);
      // Invalidate patients queries
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to assign patient",
        description: "There was a problem assigning the patient. Please try again.",
      });
    }
  });

  // Filter out already assigned patients from available list
  const filteredAvailablePatients = availablePatients?.filter((availablePatient) => {
    return !assignedPatients?.some((assignedPatient) => 
      assignedPatient.id === availablePatient.id
    );
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Your Patients</CardTitle>
            <CardDescription>
              Manage your patient list
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowAddPatientDialog(true)}
            className="text-xs"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Patient
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAssigned ? (
            <div className="flex justify-center py-6">
              <p>Loading patients...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedPatients && assignedPatients.length > 0 ? (
                assignedPatients.map((patient) => (
                  <div 
                    key={patient.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div>
                      <h4 className="font-medium">{patient.name}</h4>
                      <div className="flex items-center mt-1">
                        <Badge variant="outline" className="mr-2 text-xs">
                          Age: {patient.age}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {DISABILITY_TYPES[patient.disabilityType as keyof typeof DISABILITY_TYPES] || patient.disabilityType}
                        </Badge>
                      </div>
                    </div>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p>No patients assigned yet.</p>
                  <p className="text-sm mt-1">Add patients to your care list to start monitoring.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Patient Dialog */}
      <Dialog open={showAddPatientDialog} onOpenChange={setShowAddPatientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
            <DialogDescription>
              Select a patient to add to your care list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            {loadingAvailable ? (
              <p className="text-center py-4">Loading available patients...</p>
            ) : (
              <>
                {filteredAvailablePatients && filteredAvailablePatients.length > 0 ? (
                  filteredAvailablePatients.map((patient) => (
                    <div 
                      key={patient.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h4 className="font-medium">{patient.name}</h4>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="mr-2 text-xs">
                            Age: {patient.age}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {DISABILITY_TYPES[patient.disabilityType as keyof typeof DISABILITY_TYPES] || patient.disabilityType}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        disabled={assignPatient.isPending}
                        onClick={() => assignPatient.mutate(patient.id)}
                      >
                        {assignPatient.isPending ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No more patients available to add.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog - would normally be a more detailed view */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPatient?.name}</DialogTitle>
            <DialogDescription>
              Patient details and health information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Age</p>
                <p>{selectedPatient?.age}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Disability Type</p>
                <p>{DISABILITY_TYPES[selectedPatient?.disabilityType as keyof typeof DISABILITY_TYPES] 
                  || selectedPatient?.disabilityType}</p>
              </div>
            </div>
            
            <div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  if (selectedPatient) {
                    window.location.href = `#patient-notes-${selectedPatient.id}`;
                    setSelectedPatient(null);
                  }
                }}
              >
                View Health Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}