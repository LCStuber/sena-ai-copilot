import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uuid,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import session from "express-session";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  role: varchar("role", { length: 50 }).default("sdr"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const lobEnum = pgEnum("lob", ["LTS", "LSS"]);
export const frameworkEnum = pgEnum("framework", [
  "Qual-LTS", 
  "Qual-LSS", 
  "VEF", 
  "MEDDPICC", 
  "BANT", 
  "LicenseDemandPlan"
]);
export const priorityEnum = pgEnum("priority", ["Low", "Medium", "High"]);
export const nbaStatusEnum = pgEnum("nba_status", ["Open", "In Progress", "Completed", "Overdue"]);
export const artifactTypeEnum = pgEnum("artifact_type", [
  "CompanyResearch",
  "Qual-LTS", 
  "Qual-LSS", 
  "VEF", 
  "MEDDPICC", 
  "BANT", 
  "LicenseDemandPlan"
]);

// Accounts table
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  stage: varchar("stage", { length: 100 }),
  priority: priorityEnum("priority").default("Medium"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  lob: lobEnum("lob"),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Research table
export const companyResearch = pgTable("company_research", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  query: varchar("query", { length: 500 }).notNull(),
  results: jsonb("results").notNull(),
  sources: jsonb("sources").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meeting Transcripts table
export const transcripts = pgTable("transcripts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  content: text("content").notNull(),
  speakerCount: integer("speaker_count"),
  wordCount: integer("word_count"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Framework Notes table
export const frameworkNotes = pgTable("framework_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transcriptId: uuid("transcript_id").references(() => transcripts.id).notNull(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  framework: frameworkEnum("framework").notNull(),
  content: jsonb("content").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Next Best Actions table
export const nextBestActions = pgTable("next_best_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  evidence: text("evidence"),
  source: varchar("source", { length: 500 }),
  priority: priorityEnum("priority").default("Medium"),
  status: nbaStatusEnum("status").default("Open"),
  owner: uuid("owner").references(() => users.id).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  userTimeZone: varchar("user_time_zone", { length: 50 }),
  accountTimeZone: varchar("account_time_zone", { length: 50 }),
  link: varchar("link", { length: 500 }),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artifacts table
export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  type: artifactTypeEnum("type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: jsonb("content").notNull(),
  summary: text("summary"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  companyResearch: many(companyResearch),
  transcripts: many(transcripts),
  frameworkNotes: many(frameworkNotes),
  nextBestActions: many(nextBestActions),
  artifacts: many(artifacts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [accounts.assignedTo],
    references: [users.id],
  }),
  companyResearch: many(companyResearch),
  transcripts: many(transcripts),
  frameworkNotes: many(frameworkNotes),
  nextBestActions: many(nextBestActions),
  artifacts: many(artifacts),
}));

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transcripts.accountId],
    references: [accounts.id],
  }),
  createdBy: one(users, {
    fields: [transcripts.createdBy],
    references: [users.id],
  }),
  frameworkNotes: many(frameworkNotes),
}));

export const frameworkNotesRelations = relations(frameworkNotes, ({ one }) => ({
  transcript: one(transcripts, {
    fields: [frameworkNotes.transcriptId],
    references: [transcripts.id],
  }),
  account: one(accounts, {
    fields: [frameworkNotes.accountId],
    references: [accounts.id],
  }),
  createdBy: one(users, {
    fields: [frameworkNotes.createdBy],
    references: [users.id],
  }),
}));

export const nextBestActionsRelations = relations(nextBestActions, ({ one }) => ({
  account: one(accounts, {
    fields: [nextBestActions.accountId],
    references: [accounts.id],
  }),
  owner: one(users, {
    fields: [nextBestActions.owner],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [nextBestActions.createdBy],
    references: [users.id],
  }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  account: one(accounts, {
    fields: [artifacts.accountId],
    references: [accounts.id],
  }),
  createdBy: one(users, {
    fields: [artifacts.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyResearchSchema = createInsertSchema(companyResearch).omit({
  id: true,
  createdAt: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  createdAt: true,
});

export const insertFrameworkNotesSchema = createInsertSchema(frameworkNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNextBestActionSchema = createInsertSchema(nextBestActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArtifactSchema = createInsertSchema(artifacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type CompanyResearch = typeof companyResearch.$inferSelect;
export type InsertCompanyResearch = z.infer<typeof insertCompanyResearchSchema>;

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;

export type FrameworkNotes = typeof frameworkNotes.$inferSelect;
export type InsertFrameworkNotes = z.infer<typeof insertFrameworkNotesSchema>;

export type NextBestAction = typeof nextBestActions.$inferSelect;
export type InsertNextBestAction = z.infer<typeof insertNextBestActionSchema>;

export type Artifact = typeof artifacts.$inferSelect;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
