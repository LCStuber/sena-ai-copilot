import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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
  
  const systemMessage = `You are SENA — Sales Enablement & Next-best Actions (AI), providing company research for ${lob} sales development.

Research the company "${query}" and provide:
1. Brief overview (what they do, ICP hints)
2. Recent pressures/challenges
3. Current objectives and goals  
4. Buying signals and sales opportunities
5. Relevant technology stack
6. Credible source citations

Focus on information relevant to ${lob === "LTS" ? "LinkedIn Talent Solutions (recruiting, talent acquisition)" : "LinkedIn Sales Solutions (sales enablement, CRM, prospecting)"}.

Provide 3-6 bullets max for the main content. Include realistic source URLs that would typically contain this information.

Respond with JSON in the specified format.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemMessage },
        { 
          role: "user", 
          content: `Research company: ${query}\nLOB: ${lob}\n\nProvide comprehensive but concise research with credible sources.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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
    throw new Error("Failed to research company: " + (error as Error).message);
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
    const systemMessage = `Generate ${k} relevant information passages about ${company} that would typically be found in a sales intelligence database. 

Each passage should be 2-3 sentences and cover different aspects like:
- Business model and operations
- Recent news and developments  
- Market position and competition
- Technology and innovation
- Growth and expansion
- Leadership and culture

Also provide realistic source citations.

Respond with JSON format containing passages array and sources array.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Company: ${company}\nNumber of passages: ${k}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
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
