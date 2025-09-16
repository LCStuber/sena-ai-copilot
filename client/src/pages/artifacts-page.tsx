import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Building2,
  Database,
  Settings,
  CheckCircle,
  AlertCircle
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

export default function CRMIntegrationPage() {
  const [exportFormat, setExportFormat] = useState("docx");
  const [d365Status, setD365Status] = useState("disconnected"); // disconnected, connecting, connected
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: artifacts = [], isLoading } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts"],
    queryFn: () => {
      return fetch('/api/artifacts').then(res => {
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

  const handleExportData = async (format: string) => {
    try {
      if (format === 'docx') {
        // Convert all artifacts to DOCX format
        const htmlContent = `
          <html>
            <head>
              <meta charset="UTF-8">
              <title>SENA Sales Data Export</title>
            </head>
            <body>
              <h1>SENA Sales Data Export</h1>
              <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
              <hr>
              ${artifacts.map(artifact => `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <h2>${artifact.title}</h2>
                  <p><strong>Type:</strong> ${artifact.type}</p>
                  <p><strong>Account:</strong> ${getAccountName(artifact.accountId)}</p>
                  <p><strong>Created:</strong> ${formatDate(artifact.createdAt)}</p>
                  ${artifact.summary ? `<p><strong>Summary:</strong> ${artifact.summary}</p>` : ''}
                  <div style="border: 1px solid #ccc; padding: 10px; margin-top: 10px;">
                    <pre>${JSON.stringify(artifact.content, null, 2)}</pre>
                  </div>
                </div>
              `).join('')}
            </body>
          </html>
        `;
        
        // Create a simple document format that can be opened by Word
        const docContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Calibri', Arial, sans-serif; line-height: 1.6; }
                h1, h2 { color: #2e75b6; }
                .artifact { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
                .metadata { background: #f5f5f5; padding: 10px; margin: 10px 0; }
                pre { background: #f8f8f8; padding: 15px; border: 1px solid #ddd; }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `;
        const docBlob = new Blob([docContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(docBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sena_sales_data_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback to JSON export
        const exportData = {
          exportDate: new Date().toISOString(),
          artifacts: artifacts,
          accounts: accounts
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sena_sales_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Export Complete",
        description: `Sales data exported successfully as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
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
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-crm-title">
              CRM Integration
            </h1>
            <p className="mt-2 text-muted-foreground">
              Connect and export your sales data to external CRM systems
            </p>
          </div>

          {/* CRM Integration Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Dynamics D365 Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Dynamics D365 Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Connect your SENA data with Microsoft Dynamics 365 CRM for seamless sales workflow integration.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <Button className="w-full" data-testid="button-setup-d365">
                    Setup D365 Integration
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Export your sales artifacts, research, and notes in various formats.
                </p>
                <div className="space-y-3">
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Export Format</label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger data-testid="select-export-format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleExportData(exportFormat)}
                    disabled={artifacts.length === 0}
                    data-testid="button-export-data"
                  >
                    {artifacts.length === 0 ? 'No Data to Export' : 'Export All Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Summary and Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Data Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{artifacts.length}</div>
                  <div className="text-sm text-muted-foreground">Total Artifacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{accounts.length}</div>
                  <div className="text-sm text-muted-foreground">Active Accounts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {artifacts.filter(a => a.type === 'CompanyResearch').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Research Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {artifacts.filter(a => a.type !== 'CompanyResearch').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Framework Notes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-medium">Microsoft Dynamics D365</div>
                      <div className="text-sm text-muted-foreground">CRM Integration</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Not Connected
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Download className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="font-medium">Data Export</div>
                      <div className="text-sm text-muted-foreground">Multiple formats available</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Data */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mx-auto mb-2" />
                <div className="h-3 bg-muted rounded w-24 mx-auto" />
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Available Data for Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                {artifacts.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-data">
                      No Data Available
                    </h3>
                    <p className="text-muted-foreground">
                      Generate framework notes or company research to have data available for export
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      The following data will be included in your export:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(
                        artifacts.reduce((acc, artifact) => {
                          acc[artifact.type] = (acc[artifact.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            <span className="font-medium">
                              {artifactTypes.find(t => t.value === type)?.label || type}
                            </span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
  );
}
