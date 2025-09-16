import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink } from "lucide-react";
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
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const researchMutation = useMutation({
    mutationFn: async (data: { query: string; lob: string; accountId?: string }) => {
      const response = await apiRequest("POST", "/api/research/company", data);
      return response.json();
    },
    onSuccess: (data: CompanySearchResult) => {
      setSearchResults(data);
      toast({
        title: "Research Complete",
        description: "Company research has been generated successfully.",
      });
      
      // Invalidate accounts if research was saved to an account
      if (selectedAccountId) {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-research-title">Company Research</h1>
            <p className="mt-2 text-muted-foreground">
              Find and cite succinct company/industry context to accelerate prospecting
            </p>
          </div>

          {/* Research Form */}
          <Card className="mb-8">
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
                  <div className="space-y-2">
                    <Label htmlFor="accountSelect">Save to Account (Optional)</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger data-testid="select-account">
                        <SelectValue placeholder="Select account to save research" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Don't save to account</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

          {/* Research Results */}
          {searchResults && (
            <Card data-testid="card-research-results">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Research Results: {query}
                  {selectedAccountId && selectedAccountId !== "" && selectedAccountId !== "none" && <Badge variant="secondary">Saved to Account</Badge>}
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
      </main>
    </div>
  );
}
