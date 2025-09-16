import OpenAI from "openai";
import { 
  AgentIntent,
  AgentChatRequest,
  AgentChatResponse,
  CompanyResearchParams,
  TranscriptAnalysisParams,
  MeetingPrepParams,
  ListNbasParams,
  CompleteNbaParams,
  ListArtifactsParams,
  GeneralQuestionParams,
  companyResearchParamsSchema,
  transcriptAnalysisParamsSchema,
  meetingPrepParamsSchema,
  listNbasParamsSchema,
  completeNbaParamsSchema,
  listArtifactsParamsSchema,
  generalQuestionParamsSchema
} from '@shared/schema';
import { searchCompany } from './company-research';
import { processTranscript } from './notes-generation';
import { generateFrameworkNotes, generateCoachingGuidance } from './openai';
import { storage } from '../storage';

// Using gpt-4 for agent conversations
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface IntentClassification {
  intent: AgentIntent;
  params: any;
  confidence: number;
  needsConfirmation: boolean;
  clarificationQuestion?: string;
}

export async function classifyIntent(
  message: string, 
  conversationHistory: any[] = []
): Promise<IntentClassification> {
  const systemMessage = `You are SENA's intent classifier. Analyze the user message and determine their intent and extract relevant parameters.

Available intents:
- company_research: User wants to research a company (needs: companyName, optional: lob, accountId)
- transcript_analysis: User wants to analyze a transcript with frameworks (needs: transcript, frameworks, optional: accountId, accountName)
- meeting_prep: User wants help preparing for a meeting (needs: accountId, frameworks)
- list_nbas: User wants to see Next Best Actions (optional: accountId, status)
- complete_nba: User wants to mark an NBA as complete (needs: nbaId)
- list_artifacts: User wants to see saved artifacts/notes (optional: accountId, type)
- general_question: General questions about SENA capabilities or sales guidance
- clarification_needed: Intent unclear, need more information

For each intent, extract the relevant parameters. If critical parameters are missing, set needsConfirmation: true and provide a clarificationQuestion.

Respond ONLY with valid JSON in this exact format:
{
  "intent": "company_research",
  "params": {"companyName": "Acme Corp", "lob": "LSS"},
  "confidence": 0.85,
  "needsConfirmation": false,
  "clarificationQuestion": "Which frameworks would you like me to use?"
}`;

  const conversationContext = conversationHistory.length > 0 
    ? `\n\nConversation history:\n${conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
    : '';

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `${message}${conversationContext}` }
      ],
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      intent: result.intent || "general_question",
      params: result.params || {},
      confidence: result.confidence || 0.5,
      needsConfirmation: result.needsConfirmation || false,
      clarificationQuestion: result.clarificationQuestion
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    return {
      intent: "general_question",
      params: { question: message },
      confidence: 0.3,
      needsConfirmation: false
    };
  }
}

export async function dispatchAction(
  intent: AgentIntent,
  params: any,
  userId: string
): Promise<{
  summary: string;
  actionResults: Array<{
    type: string;
    title: string;
    description?: string;
    link?: string;
    data?: any;
  }>;
  suggestedFollowUps?: string[];
}> {
  try {
    switch (intent) {
      case "company_research":
        return await handleCompanyResearch(params, userId);
      
      case "transcript_analysis":
        return await handleTranscriptAnalysis(params, userId);
        
      case "meeting_prep":
        return await handleMeetingPrep(params, userId);
        
      case "list_nbas":
        return await handleListNbas(params, userId);
        
      case "complete_nba":
        return await handleCompleteNba(params, userId);
        
      case "list_artifacts":
        return await handleListArtifacts(params, userId);
        
      case "general_question":
        return await handleGeneralQuestion(params);
        
      default:
        return {
          summary: "I'm not sure how to help with that request. Could you please clarify what you'd like me to do?",
          actionResults: []
        };
    }
  } catch (error) {
    console.error(`Error dispatching action for intent ${intent}:`, error);
    return {
      summary: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
      actionResults: [],
      suggestedFollowUps: ["Try rephrasing your request", "Check if all required information was provided"]
    };
  }
}

async function handleCompanyResearch(params: CompanyResearchParams, userId: string) {
  const validatedParams = companyResearchParamsSchema.parse(params);
  
  const research = await searchCompany(validatedParams.companyName, validatedParams.lob || "LSS");
  
  let artifactId: string | undefined;
  
  // If accountId is provided, save the research as an artifact
  if (validatedParams.accountId) {
    const artifact = await storage.createArtifact({
      accountId: validatedParams.accountId,
      type: 'CompanyResearch',
      title: `Company Research: ${validatedParams.companyName}`,
      content: research,
      summary: research.overview.substring(0, 200) + '...',
      createdBy: userId,
    });
    artifactId = artifact.id;
  }
  
  return {
    summary: `I've researched ${validatedParams.companyName} and found key insights about their business pressures, objectives, and buying signals. ${validatedParams.accountId ? 'The research has been saved to your artifacts.' : ''}`,
    actionResults: [
      {
        type: 'company_research',
        title: `${validatedParams.companyName} Research`,
        description: research.overview,
        link: artifactId ? `/artifacts` : undefined,
        data: {
          pressures: research.pressures,
          objectives: research.objectives,
          signals: research.signals,
          sources: research.sources
        }
      }
    ],
    suggestedFollowUps: [
      "Would you like me to prepare meeting talking points based on this research?",
      "Should I create Next Best Actions for this account?",
      validatedParams.accountId ? undefined : "Would you like me to save this research to a specific account?"
    ].filter(Boolean) as string[]
  };
}

async function handleTranscriptAnalysis(params: TranscriptAnalysisParams, userId: string) {
  const validatedParams = transcriptAnalysisParamsSchema.parse(params);
  
  // If no accountId provided but accountName given, try to find or create account
  let accountId = validatedParams.accountId;
  if (!accountId && validatedParams.accountName) {
    const accounts = await storage.getAccountsByUser(userId);
    const existingAccount = accounts.find((acc: any) => 
      acc.name.toLowerCase() === validatedParams.accountName!.toLowerCase()
    );
    
    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const newAccount = await storage.createAccount({
        name: validatedParams.accountName,
        assignedTo: userId,
      });
      accountId = newAccount.id;
    }
  }
  
  if (!accountId) {
    throw new Error("Account ID or Account Name is required for transcript analysis");
  }
  
  const result = await processTranscript({
    accountId,
    transcriptContent: validatedParams.transcript,
    frameworks: validatedParams.frameworks,
    lob: "LSS", // Default to LSS, could be determined from user profile
    userId,
    userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  
  return {
    summary: `I've analyzed your transcript and generated notes using ${validatedParams.frameworks.join(", ")} framework(s). Created ${result.frameworkNotes.length} framework note(s) and ${result.nextBestActions.length} Next Best Action(s).`,
    actionResults: [
      {
        type: 'transcript_analysis',
        title: 'Transcript Analysis Complete',
        description: `Generated framework notes and next best actions`,
        link: `/notes`,
        data: {
          transcriptId: result.transcriptId,
          frameworkNotes: result.frameworkNotes.length,
          nextBestActions: result.nextBestActions.length
        }
      },
      ...result.frameworkNotes.map(note => ({
        type: 'framework_notes',
        title: `${note.framework} Notes`,
        description: `Framework notes generated from transcript`,
        link: `/notes`,
        data: note
      })),
      ...result.nextBestActions.map(nba => ({
        type: 'next_best_action',
        title: nba.title,
        description: nba.description,
        link: `/nbas`,
        data: nba
      }))
    ],
    suggestedFollowUps: [
      "Would you like me to provide coaching guidance based on this call?",
      "Should I research the company mentioned in the transcript?",
      "Would you like to see all your Next Best Actions?"
    ]
  };
}

async function handleMeetingPrep(params: MeetingPrepParams, userId: string) {
  const validatedParams = meetingPrepParamsSchema.parse(params);
  
  const account = await storage.getAccount(validatedParams.accountId);
  if (!account) {
    throw new Error("Account not found");
  }
  
  // Get existing company research
  const companyResearch = await storage.getCompanyResearch(validatedParams.accountId);
  
  // Get existing framework notes for context
  const frameworkNotes = await storage.getFrameworkNotesByAccount(validatedParams.accountId);
  
  // Get NBAs for this account
  const nbas = await storage.getNextBestActions({ accountId: validatedParams.accountId });
  
  return {
    summary: `I've prepared meeting insights for ${account.name} using your selected frameworks. You have ${companyResearch.length} research report(s), ${frameworkNotes.length} previous meeting note(s), and ${nbas.length} open action(s).`,
    actionResults: [
      {
        type: 'meeting_prep',
        title: `Meeting Prep for ${account.name}`,
        description: `Company research, previous notes, and action items ready`,
        link: `/accounts/${validatedParams.accountId}`,
        data: {
          companyResearch: companyResearch.length,
          frameworkNotes: frameworkNotes.length,
          openNbas: nbas.filter((nba: any) => nba.status === 'Open').length
        }
      }
    ],
    suggestedFollowUps: [
      "Would you like me to generate talking points based on the company research?",
      "Should I review your open Next Best Actions for this account?",
      "Do you need help with specific discovery questions?"
    ]
  };
}

async function handleListNbas(params: ListNbasParams, userId: string) {
  const validatedParams = listNbasParamsSchema.parse(params);
  
  const nbas = validatedParams.accountId 
    ? await storage.getNextBestActions({ accountId: validatedParams.accountId })
    : await storage.getNextBestActions({ userId });
  
  const filteredNbas = validatedParams.status 
    ? nbas.filter((nba: any) => nba.status === validatedParams.status)
    : nbas;
  
  return {
    summary: `I found ${filteredNbas.length} Next Best Action(s)${validatedParams.status ? ` with status "${validatedParams.status}"` : ''}. ${filteredNbas.filter((nba: any) => nba.status === 'Open').length} are still open.`,
    actionResults: [
      {
        type: 'nbas_list',
        title: 'Next Best Actions',
        description: `${filteredNbas.length} action(s) found`,
        link: '/nbas',
        data: { total: filteredNbas.length, open: filteredNbas.filter((nba: any) => nba.status === 'Open').length }
      },
      ...filteredNbas.slice(0, 5).map(nba => ({
        type: 'nba',
        title: nba.title,
        description: nba.description || '',
        link: `/nbas`,
        data: { id: nba.id, priority: nba.priority, status: nba.status, dueDate: nba.dueDate }
      }))
    ],
    suggestedFollowUps: [
      "Would you like me to help you complete any of these actions?",
      "Should I prioritize these actions by urgency?",
      filteredNbas.length > 5 ? "Would you like to see more Next Best Actions?" : undefined
    ].filter(Boolean) as string[]
  };
}

async function handleCompleteNba(params: CompleteNbaParams, userId: string) {
  const validatedParams = completeNbaParamsSchema.parse(params);
  
  await storage.updateNextBestAction(validatedParams.nbaId, {
    status: 'Completed',
    updatedAt: new Date()
  });
  
  const nbas = await storage.getNextBestActions();
  const nba = nbas.find((n: any) => n.id === validatedParams.nbaId);
  
  return {
    summary: `I've marked the Next Best Action "${nba?.title}" as completed. Great job moving the deal forward!`,
    actionResults: [
      {
        type: 'nba_completed',
        title: 'Action Completed',
        description: nba?.title || 'Next Best Action',
        link: '/nbas',
        data: { id: validatedParams.nbaId, status: 'Completed' }
      }
    ],
    suggestedFollowUps: [
      "Would you like to see your remaining open actions?",
      "Should I generate new Next Best Actions based on recent activity?",
      "Any new developments to capture from completing this action?"
    ]
  };
}

async function handleListArtifacts(params: ListArtifactsParams, userId: string) {
  const validatedParams = listArtifactsParamsSchema.parse(params);
  
  const artifacts = validatedParams.accountId
    ? await storage.getArtifacts({ accountId: validatedParams.accountId })
    : await storage.getArtifacts({ userId });
    
  const filteredArtifacts = validatedParams.type
    ? artifacts.filter((artifact: any) => artifact.type === validatedParams.type)
    : artifacts;
  
  return {
    summary: `I found ${filteredArtifacts.length} artifact(s)${validatedParams.type ? ` of type "${validatedParams.type}"` : ''}. These include your saved research, notes, and generated content.`,
    actionResults: [
      {
        type: 'artifacts_list',
        title: 'Saved Artifacts',
        description: `${filteredArtifacts.length} artifact(s) found`,
        link: '/artifacts',
        data: { total: filteredArtifacts.length }
      },
      ...filteredArtifacts.slice(0, 5).map((artifact: any) => ({
        type: 'artifact',
        title: artifact.title,
        description: artifact.summary || `${artifact.type} artifact`,
        link: '/artifacts',
        data: { id: artifact.id, type: artifact.type, createdAt: artifact.createdAt }
      }))
    ],
    suggestedFollowUps: [
      "Would you like me to export any of these artifacts?",
      "Should I help you organize these by account or type?",
      filteredArtifacts.length > 5 ? "Would you like to see more artifacts?" : undefined
    ].filter(Boolean) as string[]
  };
}

async function handleGeneralQuestion(params: GeneralQuestionParams) {
  const validatedParams = generalQuestionParamsSchema.parse(params);
  
  const systemMessage = `You are SENA — Sales Enablement & Next-best Actions (AI), a comprehensive sales development copilot for LinkedIn sellers.

You can help with:
- Company research and buyer insights
- Meeting transcript analysis using sales frameworks (MEDDPICC, BANT, VEF, Qual-LTS, Qual-LSS, LicenseDemandPlan)
- Next Best Action generation and prioritization
- Meeting preparation and talking points
- Sales coaching and guidance
- Artifact management and export

Provide helpful, actionable guidance related to sales development and LinkedIn selling. Keep responses concise and practical.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: validatedParams.question }
      ],
      temperature: 0.6,
    });

    const answer = response.choices[0].message.content || "I'm not sure how to help with that. Could you please be more specific?";
    
    return {
      summary: answer,
      actionResults: [
        {
          type: 'general_guidance',
          title: 'SENA Guidance',
          description: 'General sales enablement assistance',
          data: { question: validatedParams.question, answer }
        }
      ],
      suggestedFollowUps: [
        "Would you like me to help you with company research?",
        "Do you have a transcript you'd like me to analyze?",
        "Should I show you your current Next Best Actions?"
      ]
    };
  } catch (error) {
    console.error("Error handling general question:", error);
    return {
      summary: "I can help you with company research, transcript analysis, meeting prep, and managing your Next Best Actions. What would you like to work on?",
      actionResults: [],
      suggestedFollowUps: [
        "Ask me to research a specific company",
        "Upload a transcript for framework analysis", 
        "Show me my current action items"
      ]
    };
  }
}