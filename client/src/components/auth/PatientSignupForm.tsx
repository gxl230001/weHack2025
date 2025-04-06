import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { patientSignupSchema, type PatientSignup } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatientSignupFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function PatientSignupForm({ onBack, onSuccess }: PatientSignupFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PatientSignup>({
    resolver: zodResolver(patientSignupSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      age: undefined,
      disabilityType: "",
      otherConditions: "",
      likesDislikes: "",
      userType: "patient",
    },
  });

  const register = useMutation({
    mutationFn: async (data: PatientSignup) => {
      await apiRequest("POST", "/api/register/patient", data);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      const message = error.message || "Registration failed. Please try again.";
      setError(message);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    },
  });

  function onSubmit(data: PatientSignup) {
    setError(null);
    register.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Patient Registration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Enter your age" 
                    min={0}
                    max={120}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Choose a username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Choose a password" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="disabilityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neuromotor Disability Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select disability type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="als">ALS (Amyotrophic Lateral Sclerosis)</SelectItem>
                  <SelectItem value="cerebral-palsy">Cerebral Palsy</SelectItem>
                  <SelectItem value="multiple-sclerosis">Multiple Sclerosis</SelectItem>
                  <SelectItem value="parkinsons">Parkinson's Disease</SelectItem>
                  <SelectItem value="spinal-cord-injury">Spinal Cord Injury</SelectItem>
                  <SelectItem value="stroke">Stroke</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="otherConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Conditions</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please list any other conditions you may have" 
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="likesDislikes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Likes & Dislikes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us about your likes and dislikes" 
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex space-x-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1" 
            onClick={onBack}
          >
            Back
          </Button>
          
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={register.isPending}
          >
            {register.isPending ? "Registering..." : "Register"}
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
}
