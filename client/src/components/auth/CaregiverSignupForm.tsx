import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { caregiverSignupSchema, type CaregiverSignup } from "@shared/schema";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CaregiverSignupFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CaregiverSignupForm({ onBack, onSuccess }: CaregiverSignupFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CaregiverSignup>({
    resolver: zodResolver(caregiverSignupSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      hospital: "",
      userType: "caregiver",
    },
  });

  const register = useMutation({
    mutationFn: async (data: CaregiverSignup) => {
      await apiRequest("POST", "/api/register/caregiver", data);
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

  function onSubmit(data: CaregiverSignup) {
    setError(null);
    register.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Caregiver Registration</h2>
        
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
          
          <FormField
            control={form.control}
            name="hospital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital/Facility</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your hospital or facility name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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
