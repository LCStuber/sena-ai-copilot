import OpenAI from 'openai';
import { storage } from "../storage.js";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface PipelineHealthScore {
  accountId: string;
  score: number; // 0-100
  label: 'Healthy' | 'Watchlist' | 'At Risk';
  breakdown: {
    frameworkCoverage: number;
    qualitySignal: number;
    recency: number;
    nbaProgress: number;
  };
  readinessFlags: {
    economicBuyer: boolean;
    champion: boolean;
    painExplicit: boolean;
    decisionProcess: boolean;
    decisionCriteria: boolean;
    paperProcess: boolean;
  };
  lastUpdatedAt: Date;
}

// Framework field definitions for coverage calculation
const FRAMEWORK_FIELDS = {
  'MEDDPICC': ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Paper Process', 'Identified Pain', 'Champion', 'Competition'],
  'VEF': ['Customer\'s Pressures', 'Customer\'s Objectives', 'Customer\'s Challenges', 'LinkedIn\'s Solutions', 'LinkedIn\'s Experience', 'LinkedIn\'s Unique Value'],
  'BANT': ['Budget', 'Authority', 'Need', 'Timeline'],
  'Qual-LTS': ['Overall Impression of Opportunity', 'First Impressions of POC/Lead', 'General Company Info', 'Nº of Employees', 'Knowledge about LinkedIn'],
  'Qual-LSS': ['Date', 'Account Name', 'Attendees', 'Sales Org Structure', 'Ideal Buyer personas', 'Total Addressable Market', 'CRM', 'Other Sales Systems & Tools', 'Sales Process', 'Average Deal Size', 'Average Sales Cycle', 'Sales Navigator Use Cases']
} as const;

const FRAMEWORK_WEIGHTS = {
  'MEDDPICC': 0.4,
  'VEF': 0.3,
  'BANT': 0.15,
  'Qual-LTS': 0.075,
  'Qual-LSS': 0.075
} as const;

export async function calculatePipelineHealth(accountId: string): Promise<PipelineHealthScore> {
  try {
    // Get all framework notes for the account
    const frameworkNotes = await storage.getFrameworkNotesByAccount(accountId);
    
    // Get all transcripts for the account
    const transcripts = await storage.getTranscriptsByAccount(accountId);
    
    // Get all NBAs for the account
    const nbas = await storage.getNBAsByAccount(accountId);
    
    // Calculate framework coverage (50% weight)
    const frameworkCoverage = calculateFrameworkCoverage(frameworkNotes);
    
    // Calculate quality signal (30% weight)
    const qualitySignal = await calculateQualitySignal(transcripts, frameworkNotes);
    
    // Calculate recency (10% weight)  
    const recency = calculateRecency(transcripts);
    
    // Calculate NBA progress (10% weight)
    const nbaProgress = calculateNBAProgress(nbas);
    
    // Calculate final score (0-100)
    const score = Math.round((
      0.5 * frameworkCoverage + 
      0.3 * qualitySignal + 
      0.1 * recency + 
      0.1 * nbaProgress
    ) * 100);
    
    // Determine label
    let label: 'Healthy' | 'Watchlist' | 'At Risk';
    if (score >= 80) label = 'Healthy';
    else if (score >= 50) label = 'Watchlist';
    else label = 'At Risk';
    
    // Extract readiness flags
    const readinessFlags = extractReadinessFlags(frameworkNotes);
    
    return {
      accountId,
      score,
      label,
      breakdown: {
        frameworkCoverage,
        qualitySignal,
        recency,
        nbaProgress
      },
      readinessFlags,
      lastUpdatedAt: new Date()
    };
    
  } catch (error) {
    console.error('Error calculating pipeline health:', error);
    throw new Error('Failed to calculate pipeline health: ' + (error as Error).message);
  }
}

function calculateFrameworkCoverage(frameworkNotes: any[]): number {
  if (frameworkNotes.length === 0) return 0;
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const [framework, weight] of Object.entries(FRAMEWORK_WEIGHTS)) {
    const notes = frameworkNotes.find(note => note.framework === framework);
    if (!notes) continue;
    
    const fields = FRAMEWORK_FIELDS[framework as keyof typeof FRAMEWORK_FIELDS];
    const content = notes.content;
    
    let knownFields = 0;
    for (const field of fields) {
      const fieldValue = content[field];
      if (fieldValue && 
          typeof fieldValue === 'string' && 
          fieldValue.trim() !== '' && 
          !fieldValue.includes('Unknown (not mentioned)') &&
          !fieldValue.includes('Not mentioned')) {
        knownFields++;
      }
    }
    
    const coverageScore = knownFields / fields.length;
    totalWeightedScore += coverageScore * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

async function calculateQualitySignal(transcripts: any[], frameworkNotes: any[]): Promise<number> {
  if (transcripts.length === 0) return 0;
  
  try {
    // Use most recent transcript for quality evaluation
    const recentTranscript = transcripts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    // Limit transcript content for API efficiency
    const truncatedContent = recentTranscript.content.slice(0, 2000);
    const notesContext = frameworkNotes.map(note => 
      `${note.framework}: ${JSON.stringify(note.content).slice(0, 500)}`
    ).join('\n');
    
    const prompt = `Analyze this sales transcript and framework notes to evaluate conversation quality on a scale of 0-1.

Transcript excerpt: ${truncatedContent}

Framework Notes: ${notesContext}

Rate the following aspects (0-1 each):
- Specificity: Presence of quantitative metrics, specific dates, concrete numbers
- Stakeholder Clarity: Clear identification of economic buyer, champion, decision makers
- Actionability: Clear next steps, committed actions, follow-up plans
- Objection Handling: Evidence of addressing concerns, pain points, challenges

Return ONLY a JSON object with this exact format:
{
  "qualityScore": 0.75,
  "reasons": ["Specific metrics discussed", "Economic buyer identified"],
  "readinessFlags": {
    "EB": true,
    "Champion": false,
    "Pain": true,
    "DP": false,
    "DC": true,
    "PP": false
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"qualityScore": 0}');
    return Math.max(0, Math.min(1, result.qualityScore || 0));
    
  } catch (error) {
    console.error('Error calculating quality signal, using fallback:', error);
    // Fallback to rule-based quality scoring
    return calculateFallbackQuality(transcripts, frameworkNotes);
  }
}

function calculateFallbackQuality(transcripts: any[], frameworkNotes: any[]): number {
  if (transcripts.length === 0) return 0;
  
  const recentTranscript = transcripts[0];
  const content = recentTranscript.content.toLowerCase();
  
  let score = 0;
  
  // Check for numbers/metrics (25%)
  if (/\d+[%$]|\$\d+|\d+\s*(million|thousand|k|m)|\d+%/.test(content)) {
    score += 0.25;
  }
  
  // Check for named roles (25%)
  if (/(ceo|cfo|vp|director|manager|head of)/.test(content)) {
    score += 0.25;
  }
  
  // Check for dates/timeline (25%)
  if (/(next week|next month|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)/.test(content)) {
    score += 0.25;
  }
  
  // Check for action verbs (25%)
  if (/(will|plan to|need to|going to|schedule|follow up)/.test(content)) {
    score += 0.25;
  }
  
  return score;
}

function calculateRecency(transcripts: any[]): number {
  if (transcripts.length === 0) return 0;
  
  const mostRecentDate = Math.max(...transcripts.map(t => new Date(t.createdAt).getTime()));
  const daysSince = (Date.now() - mostRecentDate) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: exp(-days/30)
  return Math.exp(-daysSince / 30);
}

function calculateNBAProgress(nbas: any[]): number {
  if (nbas.length === 0) return 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentNBAs = nbas.filter(nba => new Date(nba.createdAt) >= thirtyDaysAgo);
  if (recentNBAs.length === 0) return 0;
  
  const completedNBAs = recentNBAs.filter(nba => nba.status === 'Completed').length;
  return completedNBAs / recentNBAs.length;
}

function extractReadinessFlags(frameworkNotes: any[]): PipelineHealthScore['readinessFlags'] {
  const meddpiccNotes = frameworkNotes.find(note => note.framework === 'MEDDPICC');
  
  if (!meddpiccNotes) {
    return {
      economicBuyer: false,
      champion: false,
      painExplicit: false,
      decisionProcess: false,
      decisionCriteria: false,
      paperProcess: false
    };
  }
  
  const content = meddpiccNotes.content;
  
  return {
    economicBuyer: isFieldComplete(content['Economic Buyer']),
    champion: isFieldComplete(content['Champion']),
    painExplicit: isFieldComplete(content['Identified Pain']),
    decisionProcess: isFieldComplete(content['Decision Process']),
    decisionCriteria: isFieldComplete(content['Decision Criteria']),
    paperProcess: isFieldComplete(content['Paper Process'])
  };
}

function isFieldComplete(fieldValue: any): boolean {
  return fieldValue && 
         typeof fieldValue === 'string' && 
         fieldValue.trim() !== '' && 
         !fieldValue.includes('Unknown (not mentioned)') &&
         !fieldValue.includes('Not mentioned');
}

export async function calculateBulkPipelineHealth(accountIds: string[]): Promise<PipelineHealthScore[]> {
  const results: PipelineHealthScore[] = [];
  
  for (const accountId of accountIds) {
    try {
      const health = await calculatePipelineHealth(accountId);
      results.push(health);
    } catch (error) {
      console.error(`Error calculating health for account ${accountId}:`, error);
      // Add a default/error state
      results.push({
        accountId,
        score: 0,
        label: 'At Risk',
        breakdown: {
          frameworkCoverage: 0,
          qualitySignal: 0,
          recency: 0,
          nbaProgress: 0
        },
        readinessFlags: {
          economicBuyer: false,
          champion: false,
          painExplicit: false,
          decisionProcess: false,
          decisionCriteria: false,
          paperProcess: false
        },
        lastUpdatedAt: new Date()
      });
    }
  }
  
  return results;
}