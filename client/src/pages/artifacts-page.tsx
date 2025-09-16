import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  Filter,
  Calendar,
  User,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Artifact {
  id: string;
  accountId: string;
  type: string;
  title: string;
  content: any;
  summary?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
}

const artifactTypes = [
  { value: "CompanyResearch", label: "Company Research" },
  { value: "Qual-LTS", label: "Qual Notes (LTS)" },
  { value: "Qual-LSS", label: "Qual Notes (LSS)" },
  { value: "VEF", label: "VEF" },
  { value: "MEDDPICC", label: "MEDDPICC" },
  { value: "BANT", label: "BANT" },
  { value: "LicenseDemandPlan", label: "License Demand Plan" },
];

export default function ArtifactsPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: artifacts = [], isLoading } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts", { accountId: accountFilter, type: typeFilter }],
    queryFn: ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.type) params.append('type', filters.type);
      
      return fetch(`/api/artifacts?${params.toString()}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch artifacts');
        return res.json();
      });
    },
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/artifacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
      toast({
        title: "Artifact Deleted",
        description: "Artifact has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteArtifact = (id: string) => {
    if (confirm("Are you sure you want to delete this artifact?")) {
      deleteArtifactMutation.mutate(id);
    }
  };

  const handleDownloadArtifact = (artifact: Artifact) => {
    const content = JSON.stringify(artifact.content, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Artifact content is being downloaded.",
    });
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || "Unknown Account";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CompanyResearch":
        return <Search className="w-6 h-6 text-blue-600" />;
      default:
        return <FileText className="w-6 h-6 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CompanyResearch":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "MEDDPICC":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "VEF":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "BANT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-artifacts-title">
              Artifacts
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage saved notes, research, and generated content
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-foreground">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48" data-testid="select-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {artifactTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-foreground">Account</label>
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger className="w-48" data-testid="select-account-filter">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-foreground">Date Range</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-48" data-testid="select-date-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                      <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Custom Range">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Artifacts Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-20" />
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </div>
                    <div className="h-16 bg-muted rounded mb-4" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-24" />
                      <div className="h-3 bg-muted rounded w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : artifacts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-artifacts">
                No Artifacts Found
              </h3>
              <p className="text-muted-foreground">
                Generate framework notes or company research to create artifacts
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artifacts.map((artifact) => (
                <Card key={artifact.id} className="hover:shadow-md transition-shadow" data-testid={`artifact-card-${artifact.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {getTypeIcon(artifact.type)}
                        </div>
                        <div>
                          <Badge className={getTypeColor(artifact.type)} data-testid={`badge-artifact-type-${artifact.id}`}>
                            {artifactTypes.find(t => t.value === artifact.type)?.label || artifact.type}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {getAccountName(artifact.accountId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadArtifact(artifact)}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`button-download-artifact-${artifact.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteArtifact(artifact.id)}
                          disabled={deleteArtifactMutation.isPending}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-artifact-${artifact.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-foreground mb-2" data-testid={`text-artifact-title-${artifact.id}`}>
                        {artifact.title}
                      </h4>
                      {artifact.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-artifact-summary-${artifact.id}`}>
                          {artifact.summary}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span data-testid={`text-artifact-created-${artifact.id}`}>
                          Created: {formatDate(artifact.createdAt)}
                        </span>
                      </div>
                      <span data-testid={`text-artifact-updated-${artifact.id}`}>
                        Updated: {formatDate(artifact.updatedAt)}
                      </span>
                    </div>
                    
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      data-testid={`button-view-artifact-${artifact.id}`}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
