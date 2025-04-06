import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema with common fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  userType: text("user_type").notNull(), // "patient" or "caregiver"
});

// Patient-specific fields
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  age: integer("age").notNull(),
  disabilityType: text("disability_type").notNull(),
  otherConditions: text("other_conditions"),
  likesDislikes: text("likes_dislikes"),
});

// Caregiver-specific fields
export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  hospital: text("hospital").notNull(),
});

// Schemas for inserting data
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertCaregiverSchema = createInsertSchema(caregivers).omit({ id: true });

// Extended schemas for form validation
export const patientSignupSchema = insertUserSchema.extend({
  age: z.coerce.number().min(0).max(120),
  disabilityType: z.string().min(1, "Please select a disability type"),
  otherConditions: z.string().optional(),
  likesDislikes: z.string().optional(),
}).refine(data => data.userType === "patient", {
  message: "User type must be patient",
  path: ["userType"]
});

export const caregiverSignupSchema = insertUserSchema.extend({
  hospital: z.string().min(1, "Hospital name is required"),
}).refine(data => data.userType === "caregiver", {
  message: "User type must be caregiver",
  path: ["userType"]
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Response schema for login
export const authResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  userType: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type PatientSignup = z.infer<typeof patientSignupSchema>;
export type CaregiverSignup = z.infer<typeof caregiverSignupSchema>;
export type Login = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
