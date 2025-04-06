import { 
  users, patients, caregivers, patientCaregivers, healthNotes,
  type User, type InsertUser, 
  type Patient, type InsertPatient, 
  type Caregiver, type InsertCaregiver,
  type PatientCaregiver, type InsertPatientCaregiver,
  type HealthNote, type InsertHealthNote,
  type PatientListItem, type HealthNoteResponse
} from "@shared/schema";
import * as bcrypt from "bcrypt";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;
  updateUserCalibrationPreference(userId: number, showPopup: boolean): Promise<User>;
  
  // Patient operations
  getPatient(userId: number): Promise<(Patient & { user: User }) | undefined>;
  getPatientById(id: number): Promise<(Patient & { user: User }) | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getAllPatients(): Promise<Patient[]>;
  
  // Caregiver operations
  getCaregiver(userId: number): Promise<(Caregiver & { user: User }) | undefined>;
  createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver>;
  
  // Patient-Caregiver relationship operations
  assignPatientToCaregiver(patientId: number, caregiverId: number): Promise<PatientCaregiver>;
  getCaregiverPatients(caregiverId: number): Promise<PatientListItem[]>;
  
  // Health notes operations
  createHealthNote(note: InsertHealthNote): Promise<HealthNote>;
  getPatientHealthNotes(patientId: number): Promise<HealthNoteResponse[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private caregivers: Map<number, Caregiver>;
  private patientCaregivers: Map<number, PatientCaregiver>;
  private healthNotes: Map<number, HealthNote>;
  private userIdCounter: number;
  private patientIdCounter: number;
  private caregiverIdCounter: number;
  private patientCaregiverIdCounter: number;
  private healthNoteIdCounter: number;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.caregivers = new Map();
    this.patientCaregivers = new Map();
    this.healthNotes = new Map();
    this.userIdCounter = 1;
    this.patientIdCounter = 1;
    this.caregiverIdCounter = 1;
    this.patientCaregiverIdCounter = 1;
    this.healthNoteIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      showCalibrationPopup: true
    };
    
    this.users.set(id, user);
    return user;
  }

  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    return user;
  }

  async updateUserCalibrationPreference(userId: number, showPopup: boolean): Promise<User> {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      showCalibrationPopup: showPopup
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Patient methods
  async getPatient(userId: number): Promise<(Patient & { user: User }) | undefined> {
    for (const patient of this.patients.values()) {
      if (patient.userId === userId) {
        const user = await this.getUser(userId);
        if (user) {
          return { ...patient, user };
        }
      }
    }
    return undefined;
  }

  async getPatientById(id: number): Promise<(Patient & { user: User }) | undefined> {
    const patient = this.patients.get(id);
    
    if (patient) {
      const user = await this.getUser(patient.userId);
      if (user) {
        return { ...patient, user };
      }
    }
    
    return undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.patientIdCounter++;
    const patient: Patient = { ...insertPatient, id };
    this.patients.set(id, patient);
    return patient;
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  // Caregiver methods
  async getCaregiver(userId: number): Promise<(Caregiver & { user: User }) | undefined> {
    for (const caregiver of this.caregivers.values()) {
      if (caregiver.userId === userId) {
        const user = await this.getUser(userId);
        if (user) {
          return { ...caregiver, user };
        }
      }
    }
    return undefined;
  }

  async createCaregiver(insertCaregiver: InsertCaregiver): Promise<Caregiver> {
    const id = this.caregiverIdCounter++;
    const caregiver: Caregiver = { ...insertCaregiver, id };
    this.caregivers.set(id, caregiver);
    return caregiver;
  }

  // Patient-Caregiver relationship methods
  async assignPatientToCaregiver(patientId: number, caregiverId: number): Promise<PatientCaregiver> {
    // Check if patient exists
    const patient = this.patients.get(patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }
    
    // Check if caregiver exists
    const caregiver = this.caregivers.get(caregiverId);
    if (!caregiver) {
      throw new Error("Caregiver not found");
    }
    
    // Check if assignment already exists
    for (const relation of this.patientCaregivers.values()) {
      if (relation.patientId === patientId && relation.caregiverId === caregiverId) {
        return relation;
      }
    }
    
    // Create new assignment
    const id = this.patientCaregiverIdCounter++;
    const now = new Date();
    
    const relation: PatientCaregiver = {
      id,
      patientId,
      caregiverId,
      assignedAt: now
    };
    
    this.patientCaregivers.set(id, relation);
    return relation;
  }

  async getCaregiverPatients(caregiverId: number): Promise<PatientListItem[]> {
    const patientIds = new Set<number>();
    
    // Find all patients assigned to this caregiver
    for (const relation of this.patientCaregivers.values()) {
      if (relation.caregiverId === caregiverId) {
        patientIds.add(relation.patientId);
      }
    }
    
    // Build the response with patient details
    const patients: PatientListItem[] = [];
    
    for (const patientId of patientIds) {
      const patientWithUser = await this.getPatientById(patientId);
      
      if (patientWithUser) {
        patients.push({
          id: patientWithUser.id,
          userId: patientWithUser.userId,
          name: patientWithUser.user.name,
          age: patientWithUser.age,
          disabilityType: patientWithUser.disabilityType
        });
      }
    }
    
    return patients;
  }

  // Health notes methods
  async createHealthNote(note: InsertHealthNote): Promise<HealthNote> {
    const id = this.healthNoteIdCounter++;
    const now = new Date();
    
    const healthNote: HealthNote = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.healthNotes.set(id, healthNote);
    return healthNote;
  }

  async getPatientHealthNotes(patientId: number): Promise<HealthNoteResponse[]> {
    const notes: HealthNoteResponse[] = [];
    
    for (const note of this.healthNotes.values()) {
      if (note.patientId === patientId) {
        const caregiver = await this.getCaregiver(note.caregiverId);
        
        if (caregiver) {
          notes.push({
            id: note.id,
            patientId: note.patientId,
            caregiverId: note.caregiverId,
            title: note.title,
            content: note.content,
            caregiverName: caregiver.user.name,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString()
          });
        }
      }
    }
    
    // Sort notes by creation date, newest first
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const storage = new MemStorage();
