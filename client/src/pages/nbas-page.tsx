import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  Edit, 
  Trash2, 
  Clock,
  AlertCircle,
  Filter,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDueDate } from "@/lib/time-utils";

interface NextBestAction {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  evidence?: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed" | "Overdue";
  owner: string;
  dueDate: string;
  userTimeZone?: string;
  link?: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
}

export default function NbasPage() {
  const [accountFilter, setAccountFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [userTimeZone] = useState("America/New_York");
  const [editingNBA, setEditingNBA] = useState<NextBestAction | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    evidence: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    status: "Open" as "Open" | "In Progress" | "Completed" | "Overdue",
    dueDate: ""
  });
  const { toast } = useToast();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: nbas = [], isLoading } = useQuery<NextBestAction[]>({
    queryKey: ["/api/nbas", { accountId: accountFilter, status: statusFilter, priority: priorityFilter }],
    queryFn: ({ queryKey }) => {
      const [, filters] = queryKey as [string, any];
      const params = new URLSearchParams();
      if (filters.accountId && filters.accountId !== 'all') params.append('accountId', filters.accountId);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
      
      return fetch(`/api/nbas?${params.toString()}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch NBAs');
        return res.json();
      });
    },
  });

  const updateNBAMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NextBestAction> }) => {
      const response = await apiRequest("PATCH", `/api/nbas/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nbas"] });
      toast({
        title: "NBA Updated",
        description: "Next Best Action has been updated successfully.",
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

  const deleteNBAMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/nbas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nbas"] });
      toast({
        title: "NBA Deleted",
        description: "Next Best Action has been deleted successfully.",
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

  const handleCompleteNBA = (id: string) => {
    updateNBAMutation.mutate({
      id,
      updates: { status: "Completed" },
    });
  };

  const handleDeleteNBA = (id: string) => {
    if (confirm("Are you sure you want to delete this NBA?")) {
      deleteNBAMutation.mutate(id);
    }
  };

  const handleEditNBA = (nba: NextBestAction) => {
    setEditingNBA(nba);
    setEditForm({
      title: nba.title,
      description: nba.description || "",
      evidence: nba.evidence || "",
      priority: nba.priority,
      status: nba.status,
      dueDate: nba.dueDate.slice(0, 16) // Format for datetime-local input
    });
  };

  const handleCloseEditDialog = () => {
    setEditingNBA(null);
    setEditForm({
      title: "",
      description: "",
      evidence: "",
      priority: "Medium",
      status: "Open",
      dueDate: ""
    });
  };

  const handleSaveEdit = () => {
    if (!editingNBA) return;
    
    if (!editForm.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for the NBA.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.dueDate) {
      toast({
        title: "Missing Due Date",
        description: "Please select a due date for the NBA.",
        variant: "destructive",
      });
      return;
    }

    updateNBAMutation.mutate({
      id: editingNBA.id,
      updates: {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        evidence: editForm.evidence.trim() || undefined,
        priority: editForm.priority,
        status: editForm.status,
        dueDate: new Date(editForm.dueDate).toISOString()
      }
    });
    
    handleCloseEditDialog();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "Low": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "In Progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "Overdue":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || "Unknown Account";
  };

  return (
    <>
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-nbas-title">
              Next Best Actions
            </h1>
            <p className="mt-2 text-muted-foreground">
              AI-generated prioritized actions to move deals forward
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
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-48" data-testid="select-priority-filter">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NBAs Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-nbas-table-title">Open NBAs</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your next best actions and move deals forward
                </p>
              </div>
              <Badge variant="secondary" data-testid="badge-nbas-count">
                {nbas.length} Action{nbas.length !== 1 ? 's' : ''}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-muted/50 rounded-lg animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-1" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : nbas.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-nbas">
                    No NBAs Found
                  </h3>
                  <p className="text-muted-foreground">
                    Process meeting transcripts to generate Next Best Actions
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nbas.map((nba) => (
                        <TableRow key={nba.id} data-testid={`nba-row-${nba.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground" data-testid={`text-nba-title-${nba.id}`}>
                                {nba.title}
                              </div>
                              {nba.evidence && (
                                <div className="text-xs text-muted-foreground mt-1" data-testid={`text-nba-evidence-${nba.id}`}>
                                  {nba.evidence}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground" data-testid={`text-nba-account-${nba.id}`}>
                              {getAccountName(nba.accountId)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(nba.priority)} data-testid={`badge-nba-priority-${nba.id}`}>
                              {nba.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground" data-testid={`text-nba-due-${nba.id}`}>
                              {formatDueDate(new Date(nba.dueDate), userTimeZone)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(nba.status)}
                              <span className="text-sm" data-testid={`text-nba-status-${nba.id}`}>
                                {nba.status}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {nba.status !== "Completed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCompleteNBA(nba.id)}
                                  disabled={updateNBAMutation.isPending}
                                  className="text-green-600 hover:text-green-700"
                                  data-testid={`button-complete-nba-${nba.id}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNBA(nba)}
                                disabled={updateNBAMutation.isPending}
                                className="text-primary hover:text-primary/80"
                                data-testid={`button-edit-nba-${nba.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNBA(nba.id)}
                                disabled={deleteNBAMutation.isPending}
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`button-delete-nba-${nba.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Edit NBA Dialog */}
      <Dialog open={!!editingNBA} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-edit-nba">
          <DialogHeader>
            <DialogTitle>Edit Next Best Action</DialogTitle>
            <DialogDescription>
              Update the details for this next best action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Enter NBA title"
                data-testid="input-edit-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter detailed description"
                rows={3}
                data-testid="textarea-edit-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-evidence">Evidence</Label>
              <Textarea
                id="edit-evidence"
                value={editForm.evidence}
                onChange={(e) => setEditForm({ ...editForm, evidence: e.target.value })}
                placeholder="Enter supporting evidence"
                rows={2}
                data-testid="textarea-edit-evidence"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select 
                  value={editForm.priority} 
                  onValueChange={(value) => setEditForm({ ...editForm, priority: value as "High" | "Medium" | "Low" })}
                >
                  <SelectTrigger data-testid="select-edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as "Open" | "In Progress" | "Completed" | "Overdue" })}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date *</Label>
              <Input
                id="edit-due-date"
                type="datetime-local"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                data-testid="input-edit-due-date"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseEditDialog}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateNBAMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateNBAMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
