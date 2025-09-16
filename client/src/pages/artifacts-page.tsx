import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  Download, 
  Copy, 
  Edit3,
  Save,
  X,
  Filter,
  Calendar,
  Building2,
  Database,
  CheckCircle,
  AlertCircle,
  History,
  Settings,
  Clipboard,
  ExternalLink
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

const noteTypes = [
  { value: "CompanyResearch", label: "Company Research" },
  { value: "Qual-LTS", label: "LTS Qualification Notes" },
  { value: "Qual-LSS", label: "LSS Qualification Notes" },
  { value: "VEF", label: "VEF Framework" },
  { value: "MEDDPICC", label: "MEDDPICC Notes" },
  { value: "BANT", label: "BANT Qualification" },
  { value: "LicenseDemandPlan", label: "License Demand Plan" },
];

export default function HistoricalNotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [exportFormat, setExportFormat] = useState("docx");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: artifacts = [], isLoading } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts"],
    queryFn: () => {
      return fetch('/api/artifacts').then(res => {
        if (!res.ok) throw new Error('Failed to fetch notes');
        return res.json();
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: any }) => {
      await apiRequest("PUT", `/api/artifacts/${id}`, { title, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
      setEditingNote(null);
      toast({
        title: "Note Updated",
        description: "Your note has been saved successfully.",
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

  // Filter notes based on search query and type
  const filteredNotes = artifacts.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         JSON.stringify(note.content).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || note.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEditNote = (note: Artifact) => {
    setEditingNote(note.id);
    setEditedTitle(note.title);
    setEditedContent(typeof note.content === 'string' ? note.content : JSON.stringify(note.content, null, 2));
  };

  const handleSaveNote = () => {
    if (editingNote) {
      let processedContent;
      try {
        processedContent = JSON.parse(editedContent);
      } catch {
        processedContent = editedContent;
      }
      
      updateNoteMutation.mutate({
        id: editingNote,
        title: editedTitle,
        content: processedContent
      });
    }
  };

  const handleCopyToClipboard = async (content: any, title: string) => {
    const textContent = typeof content === 'string' 
      ? content 
      : JSON.stringify(content, null, 2);
    
    const fullContent = `${title}\n\n${textContent}`;
    
    try {
      await navigator.clipboard.writeText(fullContent);
      toast({
        title: "Copied to Clipboard",
        description: "Note content has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleExportToDOCX = async (selectedIds?: string[]) => {
    const notesToExport = selectedIds 
      ? artifacts.filter(note => selectedIds.includes(note.id))
      : filteredNotes;
    
    try {
      const docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>SENA Historical Notes Export</title>
            <style>
              body { font-family: 'Calibri', Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #2e75b6; border-bottom: 2px solid #2e75b6; padding-bottom: 10px; }
              h2 { color: #4a90e2; margin-top: 30px; }
              .note-header { background: #f8f9fa; padding: 15px; margin: 20px 0 10px 0; border-left: 4px solid #2e75b6; }
              .note-content { background: #ffffff; padding: 20px; border: 1px solid #e9ecef; margin-bottom: 30px; }
              .metadata { font-size: 12px; color: #6c757d; margin-bottom: 10px; }
              .type-badge { background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
              pre { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>SENA Historical Notes Export</h1>
            <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Notes:</strong> ${notesToExport.length}</p>
            <hr>
            
            ${notesToExport.map(note => `
              <div class="note-header">
                <h2>${note.title}</h2>
                <div class="metadata">
                  <span class="type-badge">${note.type}</span> |
                  Account: ${getAccountName(note.accountId)} |
                  Created: ${formatDate(note.createdAt)} |
                  Updated: ${formatDate(note.updatedAt)}
                </div>
                ${note.summary ? `<p><strong>Summary:</strong> ${note.summary}</p>` : ''}
              </div>
              <div class="note-content">
                <pre>${typeof note.content === 'string' ? note.content : JSON.stringify(note.content, null, 2)}</pre>
              </div>
            `).join('')}
          </body>
        </html>
      `;
      
      const blob = new Blob([docContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sena_historical_notes_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `${notesToExport.length} notes exported to DOCX successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export notes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || "Unknown Account";
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatContent = (content: any) => {
    if (typeof content === 'string') {
      return content;
    }
    return JSON.stringify(content, null, 2);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-historical-notes-title">
              Historical Notes
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              Access, edit, and manage all your sales notes and framework documentation
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search Notes</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-notes"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Note Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {noteTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Export Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger data-testid="select-export-format">
                  <SelectValue placeholder="Export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export and CRM Integration Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Export your filtered notes ({filteredNotes.length} notes) to various formats.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => handleExportToDOCX()}
                disabled={filteredNotes.length === 0}
                data-testid="button-export-filtered-notes"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Filtered Notes
              </Button>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => handleExportToDOCX(selectedNotes)}
                disabled={selectedNotes.length === 0}
                data-testid="button-export-selected-notes"
              >
                Export Selected ({selectedNotes.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              CRM Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sync your notes with your CRM system for seamless workflow integration.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </Badge>
              </div>
              <Button className="w-full" data-testid="button-setup-crm">
                <Settings className="w-4 h-4 mr-2" />
                Setup CRM Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-20 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== "all" 
                  ? "No notes match your current search and filters."
                  : "You don't have any historical notes yet. Create your first notes through framework analysis or company research."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingNote === note.id ? (
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-lg font-semibold mb-2"
                        data-testid={`input-edit-title-${note.id}`}
                      />
                    ) : (
                      <CardTitle 
                        className="text-lg mb-2 cursor-pointer hover:text-primary"
                        data-testid={`text-note-title-${note.id}`}
                      >
                        {note.title}
                      </CardTitle>
                    )}
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge className={getTypeColor(note.type)} data-testid={`badge-type-${note.id}`}>
                        {noteTypes.find(t => t.value === note.type)?.label || note.type}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{getAccountName(note.accountId)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(note.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      checked={selectedNotes.includes(note.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotes(prev => [...prev, note.id]);
                        } else {
                          setSelectedNotes(prev => prev.filter(id => id !== note.id));
                        }
                      }}
                      className="rounded"
                      data-testid={`checkbox-select-${note.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(note.content, note.title)}
                      data-testid={`button-copy-${note.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {editingNote === note.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveNote}
                          data-testid={`button-save-${note.id}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNote(null)}
                          data-testid={`button-cancel-${note.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                        data-testid={`button-edit-${note.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {note.summary && (
                  <p className="text-sm text-muted-foreground mb-3 p-3 bg-muted/50 rounded">
                    <strong>Summary:</strong> {note.summary}
                  </p>
                )}
                
                {editingNote === note.id ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    data-testid={`textarea-edit-content-${note.id}`}
                  />
                ) : (
                  <div className="bg-muted/20 rounded p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-foreground overflow-x-auto">
                      {formatContent(note.content)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}