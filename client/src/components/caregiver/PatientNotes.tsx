import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PatientListItem, HealthNoteResponse, HealthNoteRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ClipboardList, Search } from "lucide-react";

interface PatientNotesProps {
  patients: PatientListItem[] | undefined;
  isLoading: boolean;
}

// Form validation schema
const noteFormSchema = z.object({
  patientId: z.number({
    required_error: "Patient is required",
  }),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Note content is required"),
});

export default function PatientNotes({ patients, isLoading }: PatientNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activePatient, setActivePatient] = useState<PatientListItem | null>(null);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<PatientListItem | null>(null);

  // Search patient by username
  const searchPatient = useMutation({
    mutationFn: async (username: string) => {
      setIsSearching(true);
      try {
        const response = await apiRequest("GET", `/api/caregiver/search-patient?username=${encodeURIComponent(username)}`, null);
        const result = await response.json();
        return result as PatientListItem;
      } catch (error) {
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    onSuccess: (data) => {
      setSearchResult(data);
      // If patient is not in the patient list, we can still create notes for them
      setActivePatient(data);
      form.setValue("patientId", data.id);
      setShowAddNoteDialog(true);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Patient not found",
        description: "No patient found with that username.",
      });
      setSearchResult(null);
    }
  });

  const handleSearch = () => {
    if (searchUsername.trim()) {
      searchPatient.mutate(searchUsername);
    }
  };

  // Form setup
  const form = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      patientId: activePatient?.id,
      title: "",
      content: "",
    },
  });

  // Update form values when active patient changes
  useEffect(() => {
    if (activePatient) {
      form.setValue("patientId", activePatient.id);
    }
  }, [activePatient, form]);

  // Set first patient as active if available and none selected
  useEffect(() => {
    if (patients && patients.length > 0 && !activePatient) {
      setActivePatient(patients[0]);
      form.setValue("patientId", patients[0].id);
    }
  }, [patients, activePatient, form]);

  // Get health notes for the active patient
  const { data: healthNotes, isLoading: loadingNotes } = useQuery<HealthNoteResponse[]>({
    queryKey: ["/api/caregiver/patient", activePatient?.id, "health-notes"],
    enabled: !!activePatient,
  });

  // Add a new health note
  const addNote = useMutation({
    mutationFn: async (data: HealthNoteRequest) => {
      await apiRequest("POST", "/api/caregiver/health-note", data);
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Health note has been added successfully.",
      });
      setShowAddNoteDialog(false);
      form.reset();
      
      // Invalidate the notes query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ["/api/caregiver/patient", activePatient?.id, "health-notes"] 
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to add note",
        description: "There was a problem adding your note. Please try again.",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: z.infer<typeof noteFormSchema>) {
    addNote.mutate(data);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-6">
            <p>Loading patients...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Patient Health Notes</CardTitle>
            <CardDescription>
              Document and track patient health information
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative flex items-center">
              <Input 
                type="text" 
                placeholder="Search by username" 
                className="w-44 text-xs" 
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                size="sm" 
                onClick={handleSearch}
                disabled={isSearching || !searchUsername.trim()}
                className="ml-2 text-xs"
              >
                <Search className="h-4 w-4 mr-1" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                if (patients && patients.length > 0) {
                  setShowAddNoteDialog(true);
                } else {
                  toast({
                    variant: "destructive",
                    title: "No patients available",
                    description: "You need patients before you can create notes. Try searching for one by username.",
                  });
                }
              }}
              className="text-xs"
              disabled={(isSearching || (!patients || patients.length === 0)) && !searchResult}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {patients && patients.length > 0 ? (
            <Tabs 
              defaultValue={activePatient?.id.toString() || ""}
              onValueChange={(value) => {
                const patient = patients.find(p => p.id.toString() === value);
                if (patient) {
                  setActivePatient(patient);
                  form.setValue("patientId", patient.id);
                }
              }}
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-4">
                {patients.map((patient) => (
                  <TabsTrigger 
                    key={patient.id} 
                    value={patient.id.toString()}
                    id={`patient-notes-${patient.id}`}
                  >
                    {patient.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {patients.map((patient) => (
                <TabsContent key={patient.id} value={patient.id.toString()}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">{patient.name}'s Health Notes</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setActivePatient(patient);
                          form.setValue("patientId", patient.id);
                          setShowAddNoteDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Note
                      </Button>
                    </div>
                    
                    {patient.id === activePatient?.id && (
                      <>
                        {loadingNotes ? (
                          <div className="text-center py-4">Loading notes...</div>
                        ) : (
                          <>
                            {healthNotes && healthNotes.length > 0 ? (
                              <div className="space-y-4">
                                {healthNotes.map((note) => (
                                  <div 
                                    key={note.id} 
                                    className="border rounded-lg p-4"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-medium text-primary text-lg">{note.title}</h4>
                                      <div className="text-sm text-gray-500">
                                        {new Date(note.createdAt).toLocaleDateString()} 
                                        {new Date(note.createdAt).toLocaleDateString() !== new Date(note.updatedAt).toLocaleDateString() && 
                                          ` (updated: ${new Date(note.updatedAt).toLocaleDateString()})`}
                                      </div>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-line">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-500">
                                <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                <p>No health notes yet for {patient.name}.</p>
                                <p className="text-sm mt-1">Add your first note to start tracking their health.</p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p>No patients available for notes.</p>
              <p className="text-sm mt-1">Add patients to your care list first.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Health Note</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {patients && patients.length > 1 && (
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border border-gray-300 rounded-md"
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                          value={field.value}
                        >
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter note title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter detailed health notes..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={addNote.isPending}>
                  {addNote.isPending ? "Saving..." : "Save Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}