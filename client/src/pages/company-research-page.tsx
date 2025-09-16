import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, ExternalLink, Plus, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompanySearchResult {
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

interface Account {
  id: string;
  name: string;
  website?: string;
}

export default function CompanyResearchPage() {
  const [query, setQuery] = useState("");
  const [lob, setLob] = useState<"LTS" | "LSS" | "">("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [searchResults, setSearchResults] = useState<CompanySearchResult | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const researchMutation = useMutation({
    mutationFn: async (data: { query: string; lob: string; accountId?: string }) => {
      const response = await apiRequest("POST", "/api/research/company", data);
      return response.json();
    },
    onSuccess: (data: CompanySearchResult, variables) => {
      setSearchResults(data);
      setSearchedQuery(variables.query); // Store the searched company name from variables
      
      // Only show toast if this is not an auto-save after account creation
      if (!variables.accountId || variables.accountId === selectedAccountId) {
        toast({
          title: "Research Complete",
          description: "Company research has been generated successfully.",
        });
      }
      
      // Show save prompt only if no account was involved in this research call
      if (!variables.accountId) {
        setShowSavePrompt(true);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        setShowSavePrompt(false); // Hide prompt since research is saved
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Research Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/accounts", { 
        name,
        stage: "Discovery",
        priority: "Medium",
        lob: lob
      });
      return response.json();
    },
    onSuccess: (newAccount: Account) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setSelectedAccountId(newAccount.id); // Update selected account for UI consistency
      setShowSavePrompt(false);
      toast({
        title: "Account Created & Research Saved",
        description: `${newAccount.name} has been added to your active accounts and research has been saved.`,
      });
      // Now save the research to the newly created account (will be silent)
      if (searchResults) {
        researchMutation.mutate({ 
          query: searchedQuery, 
          lob, 
          accountId: newAccount.id 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const urlResearchMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/research/url", { url });
      return response.json();
    },
    onSuccess: (data) => {
      setQuery(data.normalizedName);
      toast({
        title: "URL Processed",
        description: `Company name extracted: ${data.normalizedName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "URL Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a company name or website.",
        variant: "destructive",
      });
      return;
    }
    
    if (!lob) {
      toast({
        title: "Missing Information", 
        description: "Please select a Line of Business (LOB).",
        variant: "destructive",
      });
      return;
    }

    // Check if query looks like a URL
    if (query.includes('.') && !query.includes(' ')) {
      urlResearchMutation.mutate(query);
      return;
    }

    researchMutation.mutate({ 
      query, 
      lob, 
      accountId: selectedAccountId && selectedAccountId !== "" && selectedAccountId !== "none" ? selectedAccountId : undefined 
    });
  };

  const isLoading = researchMutation.isPending || urlResearchMutation.isPending;

  return (
        <div>
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-research-title">Company Research</h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              Find and cite succinct company/industry context to accelerate prospecting
            </p>
          </div>

          {/* Research Form */}
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <CardTitle data-testid="text-research-form-title">Research Company</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySearch">Company Name or Website</Label>
                    <Input
                      id="companySearch"
                      type="text"
                      placeholder="e.g., Salesforce, salesforce.com"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      data-testid="input-company-search"
                    />
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
                
                {accounts.length > 0 && (
                  <details className="space-y-2">
                    <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">Advanced: Save to Existing Account</summary>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="accountSelect">Save to Existing Account (Optional)</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger data-testid="select-account">
                          <SelectValue placeholder="Select existing account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Don't save to existing account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </details>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  data-testid="button-research-company"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Research Company
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Save Account Prompt */}
          {showSavePrompt && searchResults && (
            <Alert className="mb-6 border-primary bg-primary/5" data-testid="alert-save-account">
              <Building className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>Add {searchedQuery} to your active accounts?</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will create a new account in your pipeline for ongoing sales activities.
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowSavePrompt(false)}
                    data-testid="button-skip-save"
                  >
                    Skip
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => createAccountMutation.mutate(searchedQuery)}
                    disabled={createAccountMutation.isPending}
                    data-testid="button-save-account"
                  >
                    {createAccountMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Accounts
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Research Results */}
          {searchResults && (
            <Card data-testid="card-research-results">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Research Results: {searchedQuery}
                  {((selectedAccountId && selectedAccountId !== "" && selectedAccountId !== "none") || !showSavePrompt) && searchResults && <Badge variant="secondary">Saved to Account</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overview */}
                  {searchResults.overview && (
                    <div>
                      <h4 className="text-base font-medium text-foreground mb-2">Company Overview</h4>
                      <p className="text-muted-foreground" data-testid="text-company-overview">
                        {searchResults.overview}
                      </p>
                    </div>
                  )}

                  {/* Pressures & Objectives */}
                  {(searchResults.pressures.length > 0 || searchResults.objectives.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResults.pressures.length > 0 && (
                        <div>
                          <h4 className="text-base font-medium text-foreground mb-2">Recent Pressures</h4>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            {searchResults.pressures.map((pressure, index) => (
                              <li key={index} data-testid={`text-pressure-${index}`}>
                                {pressure}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {searchResults.objectives.length > 0 && (
                        <div>
                          <h4 className="text-base font-medium text-foreground mb-2">Current Objectives</h4>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            {searchResults.objectives.map((objective, index) => (
                              <li key={index} data-testid={`text-objective-${index}`}>
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales Signals */}
                  {searchResults.signals.length > 0 && (
                    <div>
                      <h4 className="text-base font-medium text-foreground mb-2">Sales Signals</h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        {searchResults.signals.map((signal, index) => (
                          <li key={index} data-testid={`text-signal-${index}`}>
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tech Stack */}
                  {searchResults.techStack.length > 0 && (
                    <div>
                      <h4 className="text-base font-medium text-foreground mb-2">Technology Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {searchResults.techStack.map((tech, index) => (
                          <Badge key={index} variant="outline" data-testid={`badge-tech-${index}`}>
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {searchResults.sources.length > 0 && (
                    <div className="pt-6 border-t border-border">
                      <h4 className="text-base font-medium text-foreground mb-3">Sources</h4>
                      <div className="space-y-2">
                        {searchResults.sources.map((source, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary font-medium" data-testid={`text-citation-${index}`}>
                              {source.citation}
                            </span>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 underline flex items-center gap-1"
                              data-testid={`link-source-${index}`}
                            >
                              {source.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
  );
}
