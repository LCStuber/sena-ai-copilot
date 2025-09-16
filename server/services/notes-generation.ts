import { generateFrameworkNotes, generateNextBestActions } from './openai';
import { storage } from '../storage';
import type { InsertFrameworkNotes, InsertNextBestAction } from '@shared/schema';

export interface ProcessTranscriptRequest {
  accountId: string;
  transcriptContent: string;
  frameworks: string[];
  lob: "LTS" | "LSS";
  userId: string;
  userTimeZone: string;
  accountTimeZone?: string;
}

export interface ProcessTranscriptResult {
  transcriptId: string;
  frameworkNotes: Array<{
    id: string;
    framework: string;
    content: any;
  }>;
  nextBestActions: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    dueDate: string;
  }>;
}

export async function processTranscript(request: ProcessTranscriptRequest): Promise<ProcessTranscriptResult> {
  const { accountId, transcriptContent, frameworks, lob, userId, userTimeZone, accountTimeZone } = request;

  try {
    // Create transcript record
    const transcript = await storage.createTranscript({
      accountId,
      content: transcriptContent,
      speakerCount: detectSpeakerCount(transcriptContent),
      wordCount: countWords(transcriptContent),
      createdBy: userId,
    });

    // Get company context for better notes generation
    const companyResearchRecords = await storage.getCompanyResearch(accountId);
    const companyContext = companyResearchRecords.length > 0 
      ? JSON.stringify(companyResearchRecords[0].results) 
      : undefined;

    // Generate framework notes
    const frameworkNotesResults = [];
    for (const framework of frameworks) {
      try {
        const notesContent = await generateFrameworkNotes({
          transcript: transcriptContent,
          framework,
          lob,
          companyContext,
        });

        const notes = await storage.createFrameworkNotes({
          transcriptId: transcript.id,
          accountId,
          framework: framework as any,
          content: notesContent,
          createdBy: userId,
        });

        // Also save framework notes as artifacts for Historical Notes access
        await storage.createArtifact({
          accountId,
          type: framework as any,
          title: `${framework} Notes`,
          content: notesContent,
          summary: `${framework} framework notes generated from meeting transcript`,
          createdBy: userId,
        });

        frameworkNotesResults.push({
          id: notes.id,
          framework: notes.framework,
          content: notes.content,
        });
      } catch (error) {
        console.error(`Error generating ${framework} notes:`, error);
        // Continue with other frameworks even if one fails
      }
    }

    // Generate Next Best Actions
    const account = await storage.getAccount(accountId);
    const nbasData = await generateNextBestActions({
      transcript: transcriptContent,
      frameworkNotes: frameworkNotesResults,
      companyResearch: companyResearchRecords[0]?.results,
      accountName: account?.name || 'Unknown Company',
      userTimeZone,
      accountTimeZone,
      lob,
    });

    const nextBestActionsResults = [];
    for (const nbaData of nbasData) {
      try {
        const nba = await storage.createNextBestAction({
          accountId,
          title: nbaData.title,
          description: nbaData.description,
          evidence: nbaData.evidence,
          source: nbaData.source || 'Meeting Transcript',
          priority: nbaData.priority as any,
          status: 'Open',
          owner: userId,
          dueDate: new Date(nbaData.dueDate),
          userTimeZone,
          accountTimeZone,
          link: nbaData.link,
          createdBy: userId,
        });

        nextBestActionsResults.push({
          id: nba.id,
          title: nba.title,
          description: nba.description || '',
          priority: nba.priority || 'Medium',
          dueDate: nba.dueDate.toISOString(),
        });
      } catch (error) {
        console.error('Error creating NBA:', error);
        // Continue with other NBAs even if one fails
      }
    }

    // Update account last contact date
    await storage.updateAccount(accountId, {
      lastContactDate: new Date(),
    });

    return {
      transcriptId: transcript.id,
      frameworkNotes: frameworkNotesResults,
      nextBestActions: nextBestActionsResults,
    };
  } catch (error) {
    console.error('Error processing transcript:', error);
    throw new Error('Failed to process transcript: ' + (error as Error).message);
  }
}

function detectSpeakerCount(transcript: string): number {
  // Simple speaker detection based on name patterns
  const speakerPatterns = transcript.match(/^[A-Z][a-z]+ \([^)]*\):/gm) || [];
  const uniqueSpeakers = new Set(speakerPatterns.map(pattern => pattern.split(' (')[0]));
  return uniqueSpeakers.size;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
