import OpenAI from "openai";
import { SENA_PROMPTS } from './sena-system-prompt';

// Using gpt-4 for company research - stable and reliable
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface CompanySearchResult {
  overview: string;
  pressures: string[];
  objectives: string[];
  challenges: string[];
  signals: string[];
  techStack: string[];
  sources: Array<{
    title: string;
    url: string;
    citation: string;
  }>;
}

export async function searchCompany(query: string, lob: "LTS" | "LSS"): Promise<CompanySearchResult> {
  // In a production environment, this would integrate with real data sources
  // For now, we'll use OpenAI to generate realistic company research based on the query
  
  const systemMessage = SENA_PROMPTS.companyResearch(lob) + `

Research the company "${query}" and provide:
1. Brief overview (what they do, ICP hints)
2. Recent pressures/challenges
3. Current objectives and goals  
4. Buying signals and sales opportunities
5. Relevant technology stack
6. Credible source citations

Provide 3-6 bullets max for the main content. Include realistic source URLs that would typically contain this information.`;

  try {
    console.log(`Starting company research for: ${query} (LOB: ${lob})`);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { 
          role: "user", 
          content: `Research company: ${query}\nLOB: ${lob}\n\nProvide comprehensive but concise research with credible sources.`
        }
      ],
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log(`Company research completed for: ${query}`);
    
    // Ensure we have the expected structure
    return {
      overview: result.overview || "No company overview available",
      pressures: result.pressures || [],
      objectives: result.objectives || [],
      challenges: result.challenges || [],
      signals: result.signals || [],
      techStack: result.techStack || [],
      sources: result.sources || [
        {
          title: "Company Website",
          url: `https://${query.toLowerCase().replace(/\s+/g, '')}.com/about`,
          citation: "[1]"
        }
      ]
    };
  } catch (error) {
    console.error("Error researching company:", error);
    
    // Check if this is an OpenAI quota issue
    const isQuotaError = error instanceof Error && (
      error.message?.includes("quota") || 
      error.message?.includes("429") ||
      (error as any)?.status === 429 ||
      (error as any)?.code === 'insufficient_quota'
    );
    
    // Provide specific messaging for quota issues
    const overviewMessage = isQuotaError 
      ? `${query} - OpenAI API quota exceeded. To enable AI-powered research, please check your OpenAI billing and upgrade your plan at https://platform.openai.com/account/billing. Using fallback data below.`
      : `${query} is a company in the technology sector. Research is temporarily unavailable.`;
    
    // Provide a fallback result instead of throwing an error
    return {
      overview: overviewMessage,
      pressures: ["Competitive market conditions", "Digital transformation requirements"],
      objectives: ["Growth expansion", "Technology modernization"],
      challenges: ["Market competition", "Talent acquisition"],
      signals: ["Recent product launches", "Hiring trends"],
      techStack: ["Cloud platforms", "Modern development tools"],
      sources: [
        {
          title: "Company Website",
          url: `https://${query.toLowerCase().replace(/\s+/g, '')}.com/about`,
          citation: "[1]"
        }
      ]
    };
  }
}

export async function getCompanyFromUrl(url: string): Promise<{
  normalizedName: string;
  website: string;
  sameAs: string[];
  sources: Array<{ title: string; url: string; citation: string }>;
}> {
  try {
    // Extract domain from URL
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    // Generate normalized company name from domain
    const normalizedName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    
    return {
      normalizedName,
      website: `https://${domain}`,
      sameAs: [`https://www.${domain}`, `https://${domain}`],
      sources: [
        {
          title: "Company Website",
          url: `https://${domain}`,
          citation: "[1]"
        }
      ]
    };
  } catch (error) {
    console.error("Error processing company URL:", error);
    throw new Error("Failed to process company URL: " + (error as Error).message);
  }
}

export async function vectorSearchCorpus(company: string, k: number = 5): Promise<{
  passages: string[];
  sources: Array<{ title: string; url: string; citation: string }>;
}> {
  // In a production environment, this would query a vector database
  // For now, we'll simulate relevant passages about the company
  
  try {
    const systemMessage = SENA_PROMPTS.companyResearch("LSS") + `

Generate ${k} relevant information passages about ${company} that would typically be found in a sales intelligence database. 

Each passage should be 2-3 sentences and cover different aspects like:
- Business model and operations
- Recent news and developments  
- Market position and competition
- Technology and innovation
- Growth and expansion
- Leadership and culture

Also provide realistic source citations.`;

    console.log(`Starting vector search for: ${company}`);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Company: ${company}\nNumber of passages: ${k}` }
      ],
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      passages: result.passages || [],
      sources: result.sources || []
    };
  } catch (error) {
    console.error("Error in vector search:", error);
    throw new Error("Failed to perform vector search: " + (error as Error).message);
  }
}
