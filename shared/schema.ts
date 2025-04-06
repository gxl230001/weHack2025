import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema with common fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  userType: text("user_type").notNull(), // "patient" or "caregiver"
  showCalibrationPopup: boolean("show_calibration_popup").default(true),
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

// Patient-caregiver relationship
export const patientCaregivers = pgTable("patient_caregivers", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Health notes for patients
export const healthNotes = pgTable("health_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas for inserting data
export const insertUserSchema = createInsertSchema(users).omit({ id: true, showCalibrationPopup: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertCaregiverSchema = createInsertSchema(caregivers).omit({ id: true });
export const insertPatientCaregiverSchema = createInsertSchema(patientCaregivers).omit({ id: true, assignedAt: true });
export const insertHealthNoteSchema = createInsertSchema(healthNotes).omit({ id: true, createdAt: true, updatedAt: true });

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

export const healthNoteSchema = z.object({
  patientId: z.number(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Note content is required"),
});

export const toggleCalibrationPopupSchema = z.object({
  showPopup: z.boolean(),
});

// Response schemas
export const authResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  userType: z.string(),
  showCalibrationPopup: z.boolean().optional(),
});

export const patientListItemSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  age: z.number(),
  disabilityType: z.string(),
});

export const healthNoteResponseSchema = z.object({
  id: z.number(),
  patientId: z.number(),
  caregiverId: z.number(),
  title: z.string(),
  content: z.string(),
  caregiverName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type PatientCaregiver = typeof patientCaregivers.$inferSelect;
export type InsertPatientCaregiver = z.infer<typeof insertPatientCaregiverSchema>;

export type HealthNote = typeof healthNotes.$inferSelect;
export type InsertHealthNote = z.infer<typeof insertHealthNoteSchema>;

export type PatientSignup = z.infer<typeof patientSignupSchema>;
export type CaregiverSignup = z.infer<typeof caregiverSignupSchema>;
export type Login = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type HealthNoteRequest = z.infer<typeof healthNoteSchema>;
export type ToggleCalibrationPopup = z.infer<typeof toggleCalibrationPopupSchema>;
export type PatientListItem = z.infer<typeof patientListItemSchema>;
export type HealthNoteResponse = z.infer<typeof healthNoteResponseSchema>;
