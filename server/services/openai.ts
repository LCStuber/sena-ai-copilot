import OpenAI from "openai";
import { SENA_PROMPTS } from './sena-system-prompt';

// Using gpt-5 for latest AI generation - newest OpenAI model released August 7, 2025
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Helper function to create fallback responses for framework notes
function createFrameworkNotesFallback(framework: string, error: any): any {
  // Check if this is a missing/invalid API key
  const isMissingKey = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "default_key";
  
  // Check error type
  const isQuotaError = error instanceof Error && (
    (error as any)?.code === 'insufficient_quota'
  );
  
  const isRateLimit = error instanceof Error && (
    (error as any)?.status === 429 && (error as any)?.code !== 'insufficient_quota'
  );
  
  let errorNote: string;
  if (isMissingKey) {
    errorNote = "OpenAI API key not configured. Please add your OPENAI_API_KEY environment variable.";
  } else if (isQuotaError) {
    errorNote = "OpenAI API quota exceeded. Please check your OpenAI billing and upgrade your plan at https://platform.openai.com/account/billing.";
  } else if (isRateLimit) {
    errorNote = "OpenAI API rate limit reached. Please try again in a few minutes.";
  } else {
    errorNote = "AI-powered analysis is temporarily unavailable.";
  }
  
  // Return appropriate fallback based on framework
  const fallbacks = {
    "Qual-LSS": {
      date: "Unknown (AI unavailable)",
      accountName: "Unknown (AI unavailable)", 
      attendees: ["Unknown (AI unavailable)"],
      salesOrgStructure: "Unknown (AI unavailable)",
      idealBuyerPersonas: "Unknown (AI unavailable)",
      totalAddressableMarket: "Unknown (AI unavailable)",
      crm: "Unknown (AI unavailable)",
      otherSalesSystemsTools: "Unknown (AI unavailable)",
      salesProcess: "Unknown (AI unavailable)",
      averageDealSize: "Unknown (AI unavailable)",
      averageSalesCycle: "Unknown (AI unavailable)",
      salesNavigatorUseCases: "Unknown (AI unavailable)",
      errorNote
    },
    "Qual-LTS": {
      overallImpressionOfOpportunity: "Unknown (AI unavailable)",
      firstImpressionsOfPOCLead: "Unknown (AI unavailable)",
      generalCompanyInfo: "Unknown (AI unavailable)",
      numberOfEmployees: "Unknown (AI unavailable)",
      knowledgeAboutLinkedIn: "Unknown (AI unavailable)",
      errorNote
    },
    "VEF": {
      customersPressures: "Unknown (AI unavailable)",
      customersObjectives: "Unknown (AI unavailable)",
      customersChallenges: "Unknown (AI unavailable)",
      linkedInSolutions: "Unknown (AI unavailable)",
      linkedInExperience: "Unknown (AI unavailable)",
      linkedInUniqueValue: "Unknown (AI unavailable)",
      errorNote
    },
    "MEDDPICC": {
      metrics: "Unknown (AI unavailable)",
      economicBuyer: "Unknown (AI unavailable)",
      decisionCriteria: "Unknown (AI unavailable)",
      decisionProcess: "Unknown (AI unavailable)",
      paperProcess: "Unknown (AI unavailable)",
      identifiedPain: "Unknown (AI unavailable)",
      champion: "Unknown (AI unavailable)",
      competition: "Unknown (AI unavailable)",
      errorNote
    },
    "BANT": {
      budget: "Unknown (AI unavailable)",
      authority: "Unknown (AI unavailable)",
      need: "Unknown (AI unavailable)",
      timeline: "Unknown (AI unavailable)",
      errorNote
    },
    "LicenseDemandPlan": {
      customersProgramTeam: "Unknown (AI unavailable)",
      customersMeasurementGoals: "Unknown (AI unavailable)",
      purchasedLicenseDistributionPlan: "Unknown (AI unavailable)",
      errorNote
    }
  };
  
  return fallbacks[framework as keyof typeof fallbacks] || {
    error: `Unknown framework: ${framework}`,
    errorNote
  };
}

// Helper function to create fallback NBAs
function createNBAsFallback(error: any): any[] {
  // Check error type
  const isMissingKey = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "default_key";
  const isQuotaError = error instanceof Error && (error as any)?.code === 'insufficient_quota';
  const isRateLimit = error instanceof Error && (error as any)?.status === 429 && (error as any)?.code !== 'insufficient_quota';
  
  let errorMessage: string;
  if (isMissingKey) {
    errorMessage = "OpenAI API key not configured. Please add your OPENAI_API_KEY environment variable.";
  } else if (isQuotaError) {
    errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing and upgrade your plan.";
  } else if (isRateLimit) {
    errorMessage = "OpenAI API rate limit reached. Please try again in a few minutes.";
  } else {
    errorMessage = "AI-powered NBA generation is temporarily unavailable.";
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return [
    {
      title: "Follow up on meeting discussion",
      description: `Review meeting notes and follow up on key discussion points. ${errorMessage}`,
      evidence: "Standard follow-up practice",
      priority: "Medium",
      dueDate: tomorrow.toISOString(),
      source: "Meeting Transcript"
    }
  ];
}

export interface FrameworkNotesInput {
  transcript: string;
  framework: string;
  lob: "LTS" | "LSS";
  companyContext?: string;
}

export interface CompanyResearchResult {
  overview: string;
  pressures: string[];
  objectives: string[];
  signals: string[];
  techStack?: string[];
}

export async function generateFrameworkNotes(input: FrameworkNotesInput): Promise<any> {
  const { transcript, framework, lob, companyContext } = input;

  const frameworkPrompts = {
    "Qual-LSS": `Generate Qual Notes for LinkedIn Sales Solutions (LSS) from this transcript. Extract information for these exact fields:
    - Date
    - Account Name
    - Attendees (Name, Role, Company)
    - Sales Org Structure (Role, headcount)
    - Ideal Buyer personas
    - Total Addressable Market
    - CRM
    - Other Sales Systems & Tools
    - Sales Process
    - Average Deal Size
    - Average Sales Cycle
    - Sales Navigator Use Cases
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`,

    "Qual-LTS": `Generate Qual Notes for LinkedIn Talent Solutions (LTS) from this transcript. Extract information for these exact fields:
    - Overall Impression of Opportunity
    - First Impressions of POC/Lead
    - General Company Info
    - Nº of Employees
    - Knowledge about LinkedIn (Have used Premium, Lite or CORP in the past)
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`,

    "VEF": `Generate Value Engagement Framework (VEF) notes from this transcript. Extract information for these exact fields:
    - Customer's Pressures
    - Customer's Objectives
    - Customer's Challenges
    - LinkedIn's Solutions
    - LinkedIn's Experience
    - LinkedIn's Unique Value
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`,

    "MEDDPICC": `Generate MEDDPICC notes from this transcript. Extract information for these exact fields:
    - Metrics
    - Economic Buyer
    - Decision Criteria
    - Decision Process
    - Paper Process
    - Identified Pain
    - Champion
    - Competition
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`,

    "BANT": `Generate BANT notes from this transcript. Extract information for these exact fields:
    - Budget
    - Authority
    - Need
    - Timeline
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`,

    "LicenseDemandPlan": `Generate License Demand Plan notes from this transcript. Extract information for these exact sections:
    
    Section 1 – Customer's Program Team:
    - Executive Sponsor: [Name], [Title], [Company]
    - Program Lead: [Name], [Title], [Company]
    - Manager Champions: [Name], [Title], [Company]; [Name], [Title], [Company]
    - Enablement & Comms Leads: [Name], [Title], [Company]; [Name], [Title], [Company]
    - Technical Lead: [Name], [Title], [Company]
    
    Customer's Measurement Goals: (SMART metrics explicitly mentioned only; do NOT invent.)
    
    Section 2 – Purchased License Distribution Plan
    Table with columns: Role | Business Unit | Geography | Sales Leader | Group Owner | Headcount | Number of Licenses
    
    ("Group Owner" = accountable for success; leave blank unless transcript specifies.)
    
    If information is not mentioned in the transcript, mark as "Unknown (not mentioned)".`
  };

  const prompt = frameworkPrompts[framework as keyof typeof frameworkPrompts];
  
  if (!prompt) {
    throw new Error(`Unsupported framework: ${framework}`);
  }

  const systemMessage = SENA_PROMPTS.transcriptAnalysis(lob) + `

${companyContext ? `Company Context: ${companyContext}` : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5mini", // newest OpenAI model released August 7, 2025
      messages: [
        { role: "system", content: systemMessage + "\n\nRespond with valid JSON only." },
        { role: "user", content: `${prompt}\n\nTranscript:\n${transcript}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
    } catch (parseError) {
      console.warn("Failed to parse framework notes response as JSON, using fallback", parseError);
      return createFrameworkNotesFallback(framework, parseError);
    }
    
    return result;
  } catch (error) {
    console.error("Error generating framework notes:", error);
    return createFrameworkNotesFallback(framework, error);
  }
}

export async function generateNextBestActions(input: {
  transcript?: string;
  frameworkNotes?: any[];
  companyResearch?: any;
  accountName: string;
  userTimeZone: string;
  accountTimeZone?: string;
  lob: "LTS" | "LSS";
}): Promise<any[]> {
  const { transcript, frameworkNotes, companyResearch, accountName, userTimeZone, lob } = input;

  const systemMessage = SENA_PROMPTS.nextBestActions(lob) + ` Generate 3-7 prioritized Next Best Actions (NBAs) for an SDR working with ${accountName}.

NBAs should be actionable items that move the deal forward: clarify pain, multithread, confirm economic buyer, secure next meeting, log CRM, tailored outreach.

For each NBA, provide:
- title: Imperative action title
- description: Brief description of the action
- evidence: Why this matters (evidence from sources)
- priority: High, Medium, or Low
- dueDate: ISO 8601 timestamp with timezone offset for ${userTimeZone}
- source: Reference to transcript/notes/research

Focus on the SDR workflow and ${lob} sales process. Prioritize based on sales stage and opportunity signals.

IMPORTANT: Respond with a valid JSON object that contains an "nbas" array. Your response must be valid JSON that can be parsed with JSON.parse().

Example format:
{
  "nbas": [
    {
      "title": "Action title",
      "description": "Action description", 
      "evidence": "Supporting evidence",
      "priority": "High",
      "dueDate": "2025-09-16T12:00:00-07:00",
      "source": "Meeting Transcript"
    }
  ]
}`;

  const contextData = {
    transcript: transcript || "No transcript provided",
    frameworkNotes: frameworkNotes || [],
    companyResearch: companyResearch || "No company research available",
    lob,
    userTimeZone
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5mini", // newest OpenAI model released August 7, 2025
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Generate NBAs based on this context:\n\n${JSON.stringify(contextData, null, 2)}` }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
    } catch (parseError) {
      console.warn("Failed to parse NBAs response as JSON, using fallback", parseError);
      return createNBAsFallback(parseError);
    }
    
    return result.nbas || [];
  } catch (error) {
    console.error("Error generating NBAs:", error);
    return createNBAsFallback(error);
  }
}

export async function generateCoachingGuidance(input: {
  transcript: string;
  frameworks: string[];
  frameworkNotes: any[];
  lob: "LTS" | "LSS";
}): Promise<string> {
  const { transcript, frameworks, frameworkNotes, lob } = input;

  const systemMessage = SENA_PROMPTS.general() + `

Analyze the sales call transcript and framework notes to provide constructive, actionable coaching for ${lob} SDRs. Focus on:
- Sales technique improvements
- Framework application
- Discovery question quality
- Next steps and follow-up
- ${lob}-specific best practices

Provide specific examples from the transcript with timestamps when possible. Be constructive and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5mini", // newest OpenAI model released August 7, 2025
      messages: [
        { role: "system", content: systemMessage },
        { 
          role: "user", 
          content: `Provide coaching guidance based on:
          
Frameworks used: ${frameworks.join(", ")}
          
Transcript:
${transcript}

Framework Notes:
${JSON.stringify(frameworkNotes, null, 2)}`
        }
      ],
      temperature: 0.6,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating coaching guidance:", error);
    
    // Check error type and provide appropriate fallback
    const isMissingKey = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "default_key";
    const isQuotaError = error instanceof Error && (error as any)?.code === 'insufficient_quota';
    const isRateLimit = error instanceof Error && (error as any)?.status === 429 && (error as any)?.code !== 'insufficient_quota';
    
    let errorMessage: string;
    if (isMissingKey) {
      errorMessage = "OpenAI API key not configured. Please add your OPENAI_API_KEY environment variable to enable AI-powered coaching guidance.";
    } else if (isQuotaError) {
      errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing and upgrade your plan at https://platform.openai.com/account/billing to enable AI-powered coaching guidance.";
    } else if (isRateLimit) {
      errorMessage = "OpenAI API rate limit reached. Please try again in a few minutes to generate coaching guidance.";
    } else {
      errorMessage = "AI-powered coaching guidance is temporarily unavailable. Please try again later.";
    }
    
    return `**Coaching Guidance Unavailable**\n\n${errorMessage}\n\nIn the meantime, consider reviewing the transcript manually for:\n- Discovery question quality\n- Framework application\n- Next steps and follow-up opportunities\n- ${lob}-specific best practices`;
  }
}
