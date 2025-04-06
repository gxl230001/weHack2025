import { users, patients, caregivers, type User, type InsertUser, type Patient, type InsertPatient, type Caregiver, type InsertCaregiver } from "@shared/schema";
import * as bcrypt from "bcrypt";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;
  
  // Patient operations
  getPatient(userId: number): Promise<(Patient & { user: User }) | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  
  // Caregiver operations
  getCaregiver(userId: number): Promise<(Caregiver & { user: User }) | undefined>;
  createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private caregivers: Map<number, Caregiver>;
  private userIdCounter: number;
  private patientIdCounter: number;
  private caregiverIdCounter: number;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.caregivers = new Map();
    this.userIdCounter = 1;
    this.patientIdCounter = 1;
    this.caregiverIdCounter = 1;
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
      password: hashedPassword
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

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.patientIdCounter++;
    const patient: Patient = { ...insertPatient, id };
    this.patients.set(id, patient);
    return patient;
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
}

export const storage = new MemStorage();
