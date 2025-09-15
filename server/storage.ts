import {
  users,
  accounts,
  companyResearch,
  transcripts,
  frameworkNotes,
  nextBestActions,
  artifacts,
  type User,
  type InsertUser,
  type Account,
  type InsertAccount,
  type CompanyResearch,
  type InsertCompanyResearch,
  type Transcript,
  type InsertTranscript,
  type FrameworkNotes,
  type InsertFrameworkNotes,
  type NextBestAction,
  type InsertNextBestAction,
  type Artifact,
  type InsertArtifact,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth methods
  sessionStore: any;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Account methods
  getAccount(id: string): Promise<Account | undefined>;
  getAccountsByUser(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<Account>): Promise<Account>;

  // Company Research methods
  getCompanyResearch(accountId: string): Promise<CompanyResearch[]>;
  createCompanyResearch(research: InsertCompanyResearch): Promise<CompanyResearch>;

  // Transcript methods
  getTranscript(id: string): Promise<Transcript | undefined>;
  getTranscriptsByAccount(accountId: string): Promise<Transcript[]>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;

  // Framework Notes methods
  getFrameworkNotes(transcriptId: string): Promise<FrameworkNotes[]>;
  getFrameworkNotesByAccount(accountId: string): Promise<FrameworkNotes[]>;
  createFrameworkNotes(notes: InsertFrameworkNotes): Promise<FrameworkNotes>;
  updateFrameworkNotes(id: string, updates: Partial<FrameworkNotes>): Promise<FrameworkNotes>;

  // Next Best Actions methods
  getNextBestActions(filters?: { accountId?: string; status?: string; userId?: string }): Promise<NextBestAction[]>;
  createNextBestAction(nba: InsertNextBestAction): Promise<NextBestAction>;
  updateNextBestAction(id: string, updates: Partial<NextBestAction>): Promise<NextBestAction>;
  deleteNextBestAction(id: string): Promise<void>;

  // Artifacts methods
  getArtifacts(filters?: { accountId?: string; type?: string; userId?: string }): Promise<Artifact[]>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  deleteArtifact(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  // Auth methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAccountsByUser(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.assignedTo, userId))
      .orderBy(desc(accounts.updatedAt));
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  // Company Research methods
  async getCompanyResearch(accountId: string): Promise<CompanyResearch[]> {
    return await db
      .select()
      .from(companyResearch)
      .where(eq(companyResearch.accountId, accountId))
      .orderBy(desc(companyResearch.createdAt));
  }

  async createCompanyResearch(insertResearch: InsertCompanyResearch): Promise<CompanyResearch> {
    const [research] = await db.insert(companyResearch).values(insertResearch).returning();
    return research;
  }

  // Transcript methods
  async getTranscript(id: string): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return transcript;
  }

  async getTranscriptsByAccount(accountId: string): Promise<Transcript[]> {
    return await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.accountId, accountId))
      .orderBy(desc(transcripts.createdAt));
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const [transcript] = await db.insert(transcripts).values(insertTranscript).returning();
    return transcript;
  }

  // Framework Notes methods
  async getFrameworkNotes(transcriptId: string): Promise<FrameworkNotes[]> {
    return await db
      .select()
      .from(frameworkNotes)
      .where(eq(frameworkNotes.transcriptId, transcriptId))
      .orderBy(desc(frameworkNotes.createdAt));
  }

  async getFrameworkNotesByAccount(accountId: string): Promise<FrameworkNotes[]> {
    return await db
      .select()
      .from(frameworkNotes)
      .where(eq(frameworkNotes.accountId, accountId))
      .orderBy(desc(frameworkNotes.createdAt));
  }

  async createFrameworkNotes(insertNotes: InsertFrameworkNotes): Promise<FrameworkNotes> {
    const [notes] = await db.insert(frameworkNotes).values(insertNotes).returning();
    return notes;
  }

  async updateFrameworkNotes(id: string, updates: Partial<FrameworkNotes>): Promise<FrameworkNotes> {
    const [notes] = await db
      .update(frameworkNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(frameworkNotes.id, id))
      .returning();
    return notes;
  }

  // Next Best Actions methods
  async getNextBestActions(filters?: { accountId?: string; status?: string; userId?: string }): Promise<NextBestAction[]> {
    const conditions = [];
    if (filters?.accountId) {
      conditions.push(eq(nextBestActions.accountId, filters.accountId));
    }
    if (filters?.status) {
      conditions.push(eq(nextBestActions.status, filters.status as any));
    }
    if (filters?.userId) {
      conditions.push(eq(nextBestActions.owner, filters.userId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(nextBestActions)
        .where(and(...conditions))
        .orderBy(nextBestActions.dueDate);
    }

    return await db
      .select()
      .from(nextBestActions)
      .orderBy(nextBestActions.dueDate);
  }

  async createNextBestAction(insertNBA: InsertNextBestAction): Promise<NextBestAction> {
    const [nba] = await db.insert(nextBestActions).values(insertNBA).returning();
    return nba;
  }

  async updateNextBestAction(id: string, updates: Partial<NextBestAction>): Promise<NextBestAction> {
    const [nba] = await db
      .update(nextBestActions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(nextBestActions.id, id))
      .returning();
    return nba;
  }

  async deleteNextBestAction(id: string): Promise<void> {
    await db.delete(nextBestActions).where(eq(nextBestActions.id, id));
  }

  // Artifacts methods
  async getArtifacts(filters?: { accountId?: string; type?: string; userId?: string }): Promise<Artifact[]> {
    const conditions = [];
    if (filters?.accountId) {
      conditions.push(eq(artifacts.accountId, filters.accountId));
    }
    if (filters?.type) {
      conditions.push(eq(artifacts.type, filters.type as any));
    }
    if (filters?.userId) {
      conditions.push(eq(artifacts.createdBy, filters.userId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(artifacts)
        .where(and(...conditions))
        .orderBy(desc(artifacts.createdAt));
    }

    return await db
      .select()
      .from(artifacts)
      .orderBy(desc(artifacts.createdAt));
  }

  async createArtifact(insertArtifact: InsertArtifact): Promise<Artifact> {
    const [artifact] = await db.insert(artifacts).values(insertArtifact).returning();
    return artifact;
  }

  async deleteArtifact(id: string): Promise<void> {
    await db.delete(artifacts).where(eq(artifacts.id, id));
  }
}

export const storage = new DatabaseStorage();
