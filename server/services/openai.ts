import OpenAI from "openai";

// Using gpt-4 for stable and reliable AI generation
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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

  const systemMessage = `You are SENA — Sales Enablement & Next-best Actions (AI), an expert sales development copilot for LinkedIn ${lob} sellers. 

Generate framework-specific notes from the sales call transcript. Use ONLY information explicitly mentioned in the transcript. Never invent or assume details.

${companyContext ? `Company Context: ${companyContext}` : ''}

IMPORTANT: Respond with a valid JSON object containing the extracted information exactly as requested. Use "Unknown (not mentioned)" for any field where information is not available in the transcript. 

Your response must be valid JSON that can be parsed with JSON.parse().`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `${prompt}\n\nTranscript:\n${transcript}` }
      ],
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating framework notes:", error);
    throw new Error("Failed to generate framework notes: " + (error as Error).message);
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

  const systemMessage = `You are SENA — Sales Enablement & Next-best Actions (AI). Generate 3-7 prioritized Next Best Actions (NBAs) for an SDR working with ${accountName}.

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
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Generate NBAs based on this context:\n\n${JSON.stringify(contextData, null, 2)}` }
      ],
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.nbas || [];
  } catch (error) {
    console.error("Error generating NBAs:", error);
    throw new Error("Failed to generate NBAs: " + (error as Error).message);
  }
}

export async function generateCoachingGuidance(input: {
  transcript: string;
  frameworks: string[];
  frameworkNotes: any[];
  lob: "LTS" | "LSS";
}): Promise<string> {
  const { transcript, frameworks, frameworkNotes, lob } = input;

  const systemMessage = `You are SENA — Sales Enablement & Next-best Actions (AI), providing coaching guidance for ${lob} SDRs.

Analyze the sales call transcript and framework notes to provide constructive, actionable coaching. Focus on:
- Sales technique improvements
- Framework application
- Discovery question quality
- Next steps and follow-up
- ${lob}-specific best practices

Provide specific examples from the transcript with timestamps when possible. Be constructive and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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
    throw new Error("Failed to generate coaching guidance: " + (error as Error).message);
  }
}
