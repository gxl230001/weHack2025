import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  patientSignupSchema, 
  caregiverSignupSchema, 
  loginSchema,
  insertUserSchema,
  insertPatientSchema,
  insertCaregiverSchema,
  authResponseSchema
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
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
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
        userType: user.userType
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
    
    const userResponse = authResponseSchema.parse({
      id: req.session.userId,
      username: req.session.username,
      name: req.session.name,
      userType: req.session.userType
    });
    
    res.status(200).json(userResponse);
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

  const httpServer = createServer(app);
  return httpServer;
}
