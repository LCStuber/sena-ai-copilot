import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  searchCompany,
  getCompanyFromUrl,
  vectorSearchCorpus,
} from "./services/company-research";
import { processTranscript } from "./services/notes-generation";
import { generateCoachingGuidance } from "./services/openai";
import {
  calculatePipelineHealth,
  calculateBulkPipelineHealth,
} from "./services/pipeline-health";
import { classifyIntent, dispatchAction } from "./services/agent";
import {
  insertAccountSchema,
  insertCompanyResearchSchema,
  insertArtifactSchema,
  agentChatRequestSchema,
} from "@shared/schema";
import { z } from "zod";

function isAuthenticated(req: any, res: any, next: any) {
  // Authentication disabled for now - bypassing all checks but providing mock user
  req.user = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "demo_user",
    email: "demo@sena.ai",
    firstName: "Demo",
    lastName: "User",
    role: "sdr",
  };
  return next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // User routes
  app.get("/api/user", isAuthenticated, (req: any, res) => {
    res.json(req.user);
  });

  // Account routes
  app.get("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const accounts = await storage.getAccountsByUser(req.user.id);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const accountData = insertAccountSchema.parse({
        ...req.body,
        assignedTo: req.user.id,
      });

      // Check for duplicate account based on name and website
      const existingAccount = await storage.findAccountByNameOrWebsite(
        accountData.name,
      );

      if (existingAccount) {
        // Return the existing account instead of creating a duplicate
        console.log(
          `Duplicate account detected: ${accountData.name}. Using existing account: ${existingAccount.id}`,
        );
        return res.status(200).json(existingAccount);
      }

      // No duplicate found, create new account
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(400).json({ message: "Failed to create account" + error });
    }
  });

  app.get("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const account = await storage.getAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  // Company Research routes
  app.post("/api/research/company", isAuthenticated, async (req: any, res) => {
    try {
      const { query, lob, accountId } = req.body;

      if (!query || !lob) {
        return res.status(400).json({ message: "Query and LOB are required" });
      }

      const results = await searchCompany(query, lob);

      // Save research if accountId provided and is not empty
      if (accountId && accountId.trim() !== "") {
        await storage.createCompanyResearch({
          accountId,
          query,
          results,
          sources: results.sources,
          createdBy: req.user.id,
        });
      }

      res.json(results);
    } catch (error) {
      console.error("Error researching company:", error);
      res.status(500).json({ message: "Failed to research company" });
    }
  });

  app.post("/api/research/url", isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const results = await getCompanyFromUrl(url);
      res.json(results);
    } catch (error) {
      console.error("Error processing company URL:", error);
      res.status(500).json({ message: "Failed to process company URL" });
    }
  });

  app.post(
    "/api/research/vector-search",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { company, k = 5 } = req.body;

        if (!company) {
          return res.status(400).json({ message: "Company name is required" });
        }

        const results = await vectorSearchCorpus(company, k);
        res.json(results);
      } catch (error) {
        console.error("Error in vector search:", error);
        res.status(500).json({ message: "Failed to perform vector search" });
      }
    },
  );

  // Transcript and Notes routes
  app.post(
    "/api/transcripts/process",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const {
          accountId,
          transcriptContent,
          frameworks,
          lob,
          userTimeZone,
          accountTimeZone,
        } = req.body;

        if (!accountId || !transcriptContent || !frameworks || !lob) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await processTranscript({
          accountId,
          transcriptContent,
          frameworks,
          lob,
          userId: req.user.id,
          userTimeZone: userTimeZone || "UTC",
          accountTimeZone,
        });

        res.json(result);
      } catch (error) {
        console.error("Error processing transcript:", error);
        res.status(500).json({ message: "Failed to process transcript" });
      }
    },
  );

  app.get(
    "/api/accounts/:accountId/notes",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const notes = await storage.getFrameworkNotesByAccount(
          req.params.accountId,
        );
        res.json(notes);
      } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ message: "Failed to fetch notes" });
      }
    },
  );

  app.patch(
    "/api/framework-notes/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { content } = req.body;

        if (!content) {
          return res.status(400).json({ message: "Content is required" });
        }

        const updatedNotes = await storage.updateFrameworkNotes(req.params.id, {
          content,
          updatedAt: new Date(),
        });

        res.json(updatedNotes);
      } catch (error) {
        console.error("Error updating framework notes:", error);
        res.status(500).json({ message: "Failed to update framework notes" });
      }
    },
  );

  // Coaching routes
  app.post("/api/coaching", isAuthenticated, async (req: any, res) => {
    try {
      const { transcript, frameworks, frameworkNotes, lob } = req.body;

      if (!transcript || !frameworks || !lob) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const guidance = await generateCoachingGuidance({
        transcript,
        frameworks,
        frameworkNotes: frameworkNotes || [],
        lob,
      });

      res.json({ guidance });
    } catch (error) {
      console.error("Error generating coaching guidance:", error);
      res.status(500).json({ message: "Failed to generate coaching guidance" });
    }
  });

  // Next Best Actions routes
  app.get("/api/nbas", isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, status, priority } = req.query;
      const filters: any = { userId: req.user.id };

      if (accountId) filters.accountId = accountId as string;
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;

      const nbas = await storage.getNextBestActions(filters);
      res.json(nbas);
    } catch (error) {
      console.error("Error fetching NBAs:", error);
      res.status(500).json({ message: "Failed to fetch NBAs" });
    }
  });

  app.patch("/api/nbas/:id", isAuthenticated, async (req: any, res) => {
    try {
      const nba = await storage.updateNextBestAction(req.params.id, req.body);
      res.json(nba);
    } catch (error) {
      console.error("Error updating NBA:", error);
      res.status(500).json({ message: "Failed to update NBA" });
    }
  });

  app.delete("/api/nbas/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteNextBestAction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting NBA:", error);
      res.status(500).json({ message: "Failed to delete NBA" });
    }
  });

  // Artifacts routes
  app.get("/api/artifacts", isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, type } = req.query;
      const filters: any = { userId: req.user.id };

      if (accountId) filters.accountId = accountId as string;
      if (type) filters.type = type as string;

      const artifacts = await storage.getArtifacts(filters);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  app.post("/api/artifacts", isAuthenticated, async (req: any, res) => {
    try {
      const artifactData = insertArtifactSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const artifact = await storage.createArtifact(artifactData);
      res.status(201).json(artifact);
    } catch (error) {
      console.error("Error creating artifact:", error);
      res.status(400).json({ message: "Failed to create artifact" });
    }
  });

  app.delete("/api/artifacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteArtifact(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting artifact:", error);
      res.status(500).json({ message: "Failed to delete artifact" });
    }
  });

  // Pipeline health routes
  app.get("/api/pipeline-health", isAuthenticated, async (req: any, res) => {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        return res.status(400).json({ message: "accountId is required" });
      }

      const healthScore = await calculatePipelineHealth(accountId);
      res.json(healthScore);
    } catch (error) {
      console.error("Error calculating pipeline health:", error);
      res.status(500).json({ message: "Failed to calculate pipeline health" });
    }
  });

  app.get(
    "/api/pipeline-health/bulk",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { accountIds } = req.query;

        if (!accountIds) {
          return res.status(400).json({ message: "accountIds is required" });
        }

        const accountIdArray = Array.isArray(accountIds)
          ? accountIds
          : [accountIds];
        const healthScores = await calculateBulkPipelineHealth(accountIdArray);
        res.json(healthScores);
      } catch (error) {
        console.error("Error calculating bulk pipeline health:", error);
        res
          .status(500)
          .json({ message: "Failed to calculate bulk pipeline health" });
      }
    },
  );

  // Dashboard stats route
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const accounts = await storage.getAccountsByUser(req.user.id);
      const nbas = await storage.getNextBestActions({
        userId: req.user.id,
        status: "Completed",
      });
      const artifacts = await storage.getArtifacts({ userId: req.user.id });

      // Calculate pipeline value (mock calculation)
      const pipelineValue = accounts.length * 100000; // $100k average per account

      // Calculate average pipeline health across all accounts
      let pipelineHealthAvg = 0;
      if (accounts.length > 0) {
        const accountIds = accounts.map((account) => account.id);
        const healthScores = await calculateBulkPipelineHealth(accountIds);
        const totalScore = healthScores.reduce(
          (sum, score) => sum + score.score,
          0,
        );
        pipelineHealthAvg = Math.round(totalScore / healthScores.length);
      }

      const stats = {
        activeAccounts: accounts.length,
        completedNBAs: nbas.length,
        pipelineValue: `$${(pipelineValue / 1000000).toFixed(1)}M`,
        pipelineHealth: `${pipelineHealthAvg}%`,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Agent chat route
  app.post("/api/agent/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationHistory } = agentChatRequestSchema.parse(
        req.body,
      );

      // Classify the user's intent
      const classification = await classifyIntent(message, conversationHistory);

      // If clarification is needed, return that immediately
      if (
        classification.needsConfirmation &&
        classification.clarificationQuestion
      ) {
        return res.json({
          message: classification.clarificationQuestion,
          intent: "clarification_needed",
          actionResults: [],
          needsConfirmation: true,
        });
      }

      // Dispatch the action based on the classified intent
      const result = await dispatchAction(
        classification.intent,
        classification.params,
        req.user.id,
      );

      const response = {
        message: result.summary,
        intent: classification.intent,
        actionResults: result.actionResults || [],
        needsConfirmation: false,
        suggestedFollowUps: result.suggestedFollowUps || [],
      };

      res.json(response);
    } catch (error: any) {
      console.error("Error processing agent chat:", error);

      // Handle validation errors (client errors)
      if (error.name === "ZodError") {
        return res.status(400).json({
          message:
            "Invalid request format. Please check your input and try again.",
          intent: "general_question",
          actionResults: [],
          needsConfirmation: false,
          suggestedFollowUps: [
            "Check your message format",
            "Try rephrasing your request",
          ],
        });
      }

      // Handle other known client errors
      if (
        error.message?.includes("Account not found") ||
        error.message?.includes("not found") ||
        error.message?.includes("required")
      ) {
        return res.status(400).json({
          message: error.message || "Invalid request. Please check your input.",
          intent: "general_question",
          actionResults: [],
          needsConfirmation: false,
          suggestedFollowUps: [
            "Check if the account exists",
            "Try with different parameters",
          ],
        });
      }

      // Handle server errors
      res.status(500).json({
        message:
          "I encountered an error while processing your request. Please try again.",
        intent: "general_question",
        actionResults: [],
        needsConfirmation: false,
        suggestedFollowUps: [
          "Try rephrasing your request",
          "Contact support if the issue persists",
        ],
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
