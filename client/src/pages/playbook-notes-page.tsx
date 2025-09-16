import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Lightbulb, Save, Edit, CheckSquare, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  name: string;
  lob?: string;
}

interface ProcessTranscriptResult {
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

const frameworks = [
  { id: "Qual-LSS", label: "Qual Notes (LSS)", description: "LinkedIn Sales Solutions qualification" },
  { id: "Qual-LTS", label: "Qual Notes (LTS)", description: "LinkedIn Talent Solutions qualification" },
  { id: "VEF", label: "VEF", description: "Value Engagement Framework" },
  { id: "MEDDPICC", label: "MEDDPICC", description: "Sales methodology framework" },
  { id: "BANT", label: "BANT", description: "Budget, Authority, Need, Timeline" },
  { id: "LicenseDemandPlan", label: "License Demand Plan", description: "Sales Navigator planning" },
];

export default function PlaybookNotesPage() {
  const [transcript, setTranscript] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountMode, setAccountMode] = useState<"select" | "create">("select");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [lob, setLob] = useState<"LTS" | "LSS" | "">("")
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<any>({});;
  const [userTimeZone] = useState("America/New_York");
  const [processResults, setProcessResults] = useState<ProcessTranscriptResult | null>(null);
  const [showCoaching, setShowCoaching] = useState(false);
  const [coachingGuidance, setCoachingGuidance] = useState("");
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createAccountMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!lob) {
        throw new Error("Please select a Line of Business");
      }
      const response = await apiRequest("POST", "/api/accounts", { 
        name,
        lob,
        stage: "Discovery",
        priority: "Medium"
      });
      return response.json();
    },
    onSuccess: (newAccount: Account) => {
      setSelectedAccountId(newAccount.id);
      setAccountMode("select");
      setNewCompanyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Company Created",
        description: `${newAccount.name} has been added to your accounts.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processTranscriptMutation = useMutation({
    mutationFn: async (data: {
      accountId: string;
      transcriptContent: string;
      frameworks: string[];
      lob: string;
      userTimeZone: string;
    }) => {
      const response = await apiRequest("POST", "/api/transcripts/process", data);
      return response.json();
    },
    onSuccess: (data: ProcessTranscriptResult) => {
      setProcessResults(data);
      toast({
        title: "Transcript Processed",
        description: "Framework notes and NBAs have been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nbas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const coachingMutation = useMutation({
    mutationFn: async (data: {
      transcript: string;
      frameworks: string[];
      frameworkNotes: any[];
      lob: string;
    }) => {
      const response = await apiRequest("POST", "/api/coaching", data);
      return response.json();
    },
    onSuccess: (data: { guidance: string }) => {
      setCoachingGuidance(data.guidance);
      setShowCoaching(true);
      toast({
        title: "Coaching Generated",
        description: "Your personalized coaching guidance is ready.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Coaching Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFrameworkNotesMutation = useMutation({
    mutationFn: async (data: { id: string; content: any }) => {
      const response = await apiRequest("PATCH", `/api/framework-notes/${data.id}`, {
        content: data.content,
      });
      return response.json();
    },
    onSuccess: (updatedNote) => {
      // Update the processResults with the new content
      setProcessResults(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          frameworkNotes: prev.frameworkNotes.map(note => 
            note.id === updatedNote.id 
              ? { ...note, content: updatedNote.content }
              : note
          )
        };
      });
      setEditingNoteId(null);
      setEditedContent({});
      toast({
        title: "Notes Updated",
        description: "Framework notes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFrameworkToggle = (frameworkId: string) => {
    setSelectedFrameworks(prev => 
      prev.includes(frameworkId)
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId]
    );
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) {
      toast({
        title: "Missing Transcript",
        description: "Please paste a meeting transcript to process.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFrameworks.length === 0) {
      toast({
        title: "No Frameworks Selected",
        description: "Please select at least one framework to generate notes.",
        variant: "destructive",
      });
      return;
    }

    // Handle account selection or creation
    let accountId = selectedAccountId;
    if (accountMode === "create") {
      if (!newCompanyName.trim()) {
        toast({
          title: "Missing Company Name",
          description: "Please enter a company name to create a new account.",
          variant: "destructive",
        });
        return;
      }
      try {
        const newAccount = await createAccountMutation.mutateAsync(newCompanyName.trim());
        accountId = newAccount.id;
      } catch (error) {
        return; // Error is handled by the mutation
      }
    } else if (!accountId) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to associate with this transcript.",
        variant: "destructive",
      });
      return;
    }

    if (!lob) {
      toast({
        title: "Missing LOB",
        description: "Please select a Line of Business.",
        variant: "destructive",
      });
      return;
    }

    processTranscriptMutation.mutate({
      accountId,
      transcriptContent: transcript,
      frameworks: selectedFrameworks,
      lob,
      userTimeZone,
    });
  };

  const handleRequestCoaching = () => {
    if (!processResults) return;

    coachingMutation.mutate({
      transcript,
      frameworks: selectedFrameworks,
      frameworkNotes: processResults.frameworkNotes,
      lob,
    });
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const detectSpeakers = (text: string) => {
    const speakerPatterns = text.match(/^[A-Z][a-z]+ \([^)]*\):/gm) || [];
    const uniqueSpeakers = new Set(speakerPatterns.map(pattern => pattern.split(' (')[0]));
    return uniqueSpeakers.size;
  };

  const handleEditNote = (noteId: string, content: any) => {
    setEditingNoteId(noteId);
    setEditedContent(convertToText(content));
  };

  const handleSaveNote = (noteId: string) => {
    updateFrameworkNotesMutation.mutate({
      id: noteId,
      content: editedContent,
    });
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedContent("");
  };

  const handleContentChange = (newValue: string) => {
    setEditedContent(newValue);
  };

  const convertToText = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      // Convert JSON object to readable text format
      return Object.entries(content)
        .map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
          const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
          return `${formattedKey}: ${formattedValue}`;
        })
        .join('\n\n');
    }
    
    return String(content);
  };

  const convertFromText = (textContent: string): string => {
    // Store as plain text instead of converting back to JSON
    return textContent;
  };


  const renderFrameworkContent = (framework: string, content: any, noteId: string) => {
    if (!content) return null;

    const isEditing = editingNoteId === noteId;
    const textContent = convertToText(content);
    const displayContent = isEditing ? editedContent : textContent;

    return (
      <div className="space-y-3 text-sm">
        {isEditing ? (
          <div>
            <Textarea
              value={displayContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[200px] text-sm font-mono"
              placeholder="Enter your notes in plain text format..."
              data-testid={`textarea-edit-${framework}`}
            />
          </div>
        ) : (
          <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {displayContent || 'No notes available'}
          </div>
        )}
        {isEditing && (
          <div className="flex space-x-2 mt-4 pt-4 border-t">
            <Button 
              size="sm" 
              onClick={() => handleSaveNote(noteId)}
              disabled={updateFrameworkNotesMutation.isPending}
              data-testid={`button-save-changes-${framework}`}
            >
              {updateFrameworkNotesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelEdit}
              disabled={updateFrameworkNotesMutation.isPending}
              data-testid={`button-cancel-edit-${framework}`}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-playbook-title">
              Playbook Notes Studio
            </h1>
            <p className="mt-2 text-muted-foreground">
              Transform meeting transcripts into framework-specific notes with AI assistance
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Transcript Input */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Meeting Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Account and LOB Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Label>Account</Label>
                        <RadioGroup 
                          value={accountMode} 
                          onValueChange={(value) => {
                            setAccountMode(value as "select" | "create");
                            setSelectedAccountId("");
                            setNewCompanyName("");
                          }}
                          className="flex flex-row space-x-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="select" id="select-existing" data-testid="radio-select-existing" />
                            <Label htmlFor="select-existing" className="text-sm font-normal cursor-pointer">
                              Select existing
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="create" id="create-new" data-testid="radio-create-new" />
                            <Label htmlFor="create-new" className="text-sm font-normal cursor-pointer">
                              Add new company
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        {accountMode === "select" ? (
                          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger data-testid="select-account">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Enter company name"
                              value={newCompanyName}
                              onChange={(e) => setNewCompanyName(e.target.value)}
                              className="flex-1"
                              data-testid="input-company-name"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lobSelect">Line of Business</Label>
                        <Select value={lob} onValueChange={(value) => setLob(value as "LTS" | "LSS")}>
                          <SelectTrigger data-testid="select-lob">
                            <SelectValue placeholder="Select LOB" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LTS">LinkedIn Talent Solutions (LTS)</SelectItem>
                            <SelectItem value="LSS">LinkedIn Sales Solutions (LSS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Textarea
                      placeholder="Paste your meeting transcript here..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="min-h-64 resize-none"
                      data-testid="textarea-transcript"
                    />

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span data-testid="text-word-count">{countWords(transcript)}</span> words • 
                        <span className="ml-1" data-testid="text-speaker-count">
                          {detectSpeakers(transcript)}
                        </span> speakers detected
                      </div>
                      <Button 
                        onClick={handleProcessTranscript}
                        disabled={processTranscriptMutation.isPending || createAccountMutation.isPending}
                        data-testid="button-process-transcript"
                      >
                        {(processTranscriptMutation.isPending || createAccountMutation.isPending) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {createAccountMutation.isPending ? "Creating Company..." : "Processing..."}
                          </>
                        ) : (
                          "Process Transcript"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Framework Selector */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Select Frameworks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {frameworks.map((framework) => (
                      <div key={framework.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={framework.id}
                          checked={selectedFrameworks.includes(framework.id)}
                          onCheckedChange={() => handleFrameworkToggle(framework.id)}
                          data-testid={`checkbox-framework-${framework.id}`}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={framework.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {framework.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {framework.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    onClick={handleProcessTranscript}
                    disabled={processTranscriptMutation.isPending || createAccountMutation.isPending || selectedFrameworks.length === 0}
                    data-testid="button-generate-notes"
                  >
                    {(processTranscriptMutation.isPending || createAccountMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {createAccountMutation.isPending ? "Creating Company..." : "Generating..."}
                      </>
                    ) : (
                      "Generate Notes"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Generated Notes */}
          {processResults && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Generated Notes</h2>
                <Badge variant="secondary" data-testid="badge-notes-count">
                  {processResults.frameworkNotes.length} Framework{processResults.frameworkNotes.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Tabs defaultValue={processResults.frameworkNotes[0]?.framework || ""} className="space-y-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {processResults.frameworkNotes.map((note) => (
                    <TabsTrigger 
                      key={note.id} 
                      value={note.framework}
                      data-testid={`tab-framework-${note.framework}`}
                    >
                      {note.framework}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {processResults.frameworkNotes.map((note) => (
                  <TabsContent key={note.id} value={note.framework}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle data-testid={`text-framework-title-${note.framework}`}>
                          {note.framework} Notes
                        </CardTitle>
                        {editingNoteId !== note.id && (
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditNote(note.id, note.content)}
                              data-testid={`button-edit-${note.framework}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {renderFrameworkContent(note.framework, note.content, note.id)}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Coaching Prompt */}
              <Card className="mt-8 bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-foreground mb-2">
                        Would you like coaching guidance?
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get personalized coaching based on your transcript and selected frameworks to improve your sales approach.
                      </p>
                      <Button 
                        onClick={handleRequestCoaching}
                        disabled={coachingMutation.isPending}
                        data-testid="button-request-coaching"
                      >
                        {coachingMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Guidance...
                          </>
                        ) : (
                          "Get Coaching Guidance"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coaching Results */}
              {showCoaching && coachingGuidance && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Coaching Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <pre className="whitespace-pre-wrap font-sans" data-testid="text-coaching-guidance">
                        {coachingGuidance}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Best Actions Summary */}
              {processResults.nextBestActions.length > 0 && (
                <Alert className="mt-6">
                  <CheckSquare className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{processResults.nextBestActions.length} Next Best Actions</strong> have been generated and added to your NBAs dashboard.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
  );
}
