import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  patientSignupSchema, 
  caregiverSignupSchema, 
  loginSchema,
  insertUserSchema,
  insertPatientSchema,
  insertCaregiverSchema,
  insertPatientCaregiverSchema,
  insertHealthNoteSchema,
  authResponseSchema,
  healthNoteSchema,
  toggleCalibrationPopupSchema,
  patientListItemSchema,
  healthNoteResponseSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import MemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userType: string;
    username: string;
    name: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  const SessionStore = MemoryStore(session);
  
  app.use(
    session({
      cookie: {
        maxAge: 86400000, // 24 hours
        secure: process.env.NODE_ENV === "production",
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "medconnect-secret",
    })
  );

  // Helper middleware for authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }
    next();
  };

  // Helper middleware to check if user is a caregiver
  const requireCaregiver = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userType !== "caregiver") {
      return res.status(403).json({ message: "Access denied. Only caregivers can perform this action." });
    }
    next();
  };

  // Helper middleware to check if user is a patient
  const requirePatient = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userType !== "patient") {
      return res.status(403).json({ message: "Access denied. Only patients can perform this action." });
    }
    next();
  };

  // Register patient route
  app.post("/api/register/patient", async (req, res) => {
    try {
      // Validate patient data
      const validatedData = patientSignupSchema.parse({
        ...req.body,
        userType: "patient",
      });

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken" });
      }

      // Create user
      const userData = insertUserSchema.parse({
        username: validatedData.username,
        password: validatedData.password,
        name: validatedData.name,
        userType: "patient",
      });

      const user = await storage.createUser(userData);

      // Create patient profile
      const patientData = insertPatientSchema.parse({
        userId: user.id,
        age: validatedData.age,
        disabilityType: validatedData.disabilityType,
        otherConditions: validatedData.otherConditions || "",
        likesDislikes: validatedData.likesDislikes || "",
      });

      await storage.createPatient(patientData);
      
      res.status(201).json({ message: "Patient registered successfully" });
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  // Register caregiver route
  app.post("/api/register/caregiver", async (req, res) => {
    try {
      // Validate caregiver data
      const validatedData = caregiverSignupSchema.parse({
        ...req.body,
        userType: "caregiver",
      });

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken" });
      }

      // Create user
      const userData = insertUserSchema.parse({
        username: validatedData.username,
        password: validatedData.password,
        name: validatedData.name,
        userType: "caregiver",
      });

      const user = await storage.createUser(userData);

      // Create caregiver profile
      const caregiverData = insertCaregiverSchema.parse({
        userId: user.id,
        hospital: validatedData.hospital,
      });

      await storage.createCaregiver(caregiverData);
      
      res.status(201).json({ message: "Caregiver registered successfully" });
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  // Login route
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.validateUserCredentials(
        validatedData.username,
        validatedData.password
      );
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Store user info in session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.name = user.name;
      req.session.userType = user.userType;
      
      // Return user info (without password)
      const userResponse = authResponseSchema.parse({
        id: user.id,
        username: user.username,
        name: user.name,
        userType: user.userType,
        showCalibrationPopup: user.showCalibrationPopup
      });
      
      res.status(200).json(userResponse);
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error during login" });
    }
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Get the current user with the updated info
    storage.getUser(req.session.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const userResponse = authResponseSchema.parse({
          id: user.id,
          username: user.username,
          name: user.name,
          userType: user.userType,
          showCalibrationPopup: user.showCalibrationPopup
        });
        
        res.status(200).json(userResponse);
      })
      .catch(error => {
        res.status(500).json({ message: "Server error retrieving user data" });
      });
  });

  // Update user calibration popup preference
  app.post("/api/user/calibration-preference", requireAuth, async (req, res) => {
    try {
      const { showPopup } = toggleCalibrationPopupSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserCalibrationPreference(req.session.userId, showPopup);
      
      res.status(200).json({ 
        message: "Preference updated successfully",
        showCalibrationPopup: updatedUser.showCalibrationPopup
      });
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error updating preference" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // =================== Caregiver-specific routes ===================
  
  // Get list of all available patients
  app.get("/api/caregiver/available-patients", requireAuth, requireCaregiver, async (req, res) => {
    try {
      // Get all patients
      const patients = await storage.getAllPatients();
      
      // For each patient, get the user information
      const patientsList = await Promise.all(patients.map(async (patient) => {
        const patientWithUser = await storage.getPatientById(patient.id);
        
        if (patientWithUser) {
          return patientListItemSchema.parse({
            id: patientWithUser.id,
            userId: patientWithUser.userId,
            name: patientWithUser.user.name,
            age: patientWithUser.age,
            disabilityType: patientWithUser.disabilityType
          });
        }
        return null;
      }));
      
      // Filter out any null values
      const filteredPatients = patientsList.filter(patient => patient !== null);
      
      res.status(200).json(filteredPatients);
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving patients" });
    }
  });
  
  // Assign a patient to the caregiver
  app.post("/api/caregiver/assign-patient/:patientId", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      
      // Get the caregiver's ID
      const caregiver = await storage.getCaregiver(req.session.userId);
      
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver profile not found" });
      }
      
      // Assign the patient to the caregiver
      await storage.assignPatientToCaregiver(patientId, caregiver.id);
      
      res.status(200).json({ message: "Patient assigned successfully" });
    } catch (error) {
      if (error.message === "Patient not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error assigning patient" });
    }
  });
  
  // Get caregiver's assigned patients
  app.get("/api/caregiver/patients", requireAuth, requireCaregiver, async (req, res) => {
    try {
      // Get the caregiver's ID
      const caregiver = await storage.getCaregiver(req.session.userId);
      
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver profile not found" });
      }
      
      // Get the caregiver's patients
      const patients = await storage.getCaregiverPatients(caregiver.id);
      
      res.status(200).json(patients);
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving patients" });
    }
  });
  
  // Add a health note for a patient
  app.post("/api/caregiver/health-note", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const noteData = healthNoteSchema.parse(req.body);
      
      // Get the caregiver's ID
      const caregiver = await storage.getCaregiver(req.session.userId);
      
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver profile not found" });
      }
      
      // Create the health note
      const healthNote = await storage.createHealthNote({
        patientId: noteData.patientId,
        caregiverId: caregiver.id,
        title: noteData.title,
        content: noteData.content
      });
      
      res.status(201).json({ message: "Health note created successfully", noteId: healthNote.id });
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Server error creating health note" });
    }
  });
  
  // Get health notes for a specific patient
  app.get("/api/caregiver/patient/:patientId/health-notes", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      
      // Get the health notes for the patient
      const notes = await storage.getPatientHealthNotes(patientId);
      
      res.status(200).json(notes);
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving health notes" });
    }
  });
  
  // =================== Patient-specific routes ===================
  
  // Get health notes for the current patient
  app.get("/api/patient/health-notes", requireAuth, requirePatient, async (req, res) => {
    try {
      // Get the patient's ID
      const patient = await storage.getPatient(req.session.userId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      
      // Get the health notes for the patient
      const notes = await storage.getPatientHealthNotes(patient.id);
      
      res.status(200).json(notes);
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving health notes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
