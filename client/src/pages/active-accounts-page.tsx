import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  LayoutDashboard, 
  Search, 
  Filter, 
  Plus, 
  Building, 
  Calendar, 
  Globe, 
  Tag,
  Users,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";
import { Link } from "wouter";

interface Account {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  stage: string;
  priority: string;
  assignedTo?: string;
  lob: string;
  lastContactDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ActiveAccountsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [lobFilter, setLobFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "priority" | "stage" | "lastContact">("name");

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Filter and sort accounts
  const filteredAndSortedAccounts = accounts
    .filter((account) => {
      const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           account.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           account.website?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStage = stageFilter === "all" || account.stage === stageFilter;
      const matchesPriority = priorityFilter === "all" || account.priority === priorityFilter;
      const matchesLob = lobFilter === "all" || account.lob === lobFilter;
      
      return matchesSearch && matchesStage && matchesPriority && matchesLob;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "priority":
          const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "stage":
          return a.stage.localeCompare(b.stage);
        case "lastContact":
          const aDate = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
          const bDate = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
          return bDate - aDate;
        default:
          return 0;
      }
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Discovery":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Qualification":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Proposal":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Negotiation":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "Closed Won":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Closed Lost":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-active-accounts-title">
              Active Accounts
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              Manage and track all your active sales accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{filteredAndSortedAccounts.length} of {accounts.length} accounts</span>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-accounts"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stage</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger data-testid="select-stage-filter">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Discovery">Discovery</SelectItem>
                  <SelectItem value="Qualification">Qualification</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Closed Won">Closed Won</SelectItem>
                  <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-priority-filter">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High Priority</SelectItem>
                  <SelectItem value="Medium">Medium Priority</SelectItem>
                  <SelectItem value="Low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Line of Business</label>
              <Select value={lobFilter} onValueChange={setLobFilter}>
                <SelectTrigger data-testid="select-lob-filter">
                  <SelectValue placeholder="All LOBs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LOBs</SelectItem>
                  <SelectItem value="LTS">LinkedIn Talent Solutions</SelectItem>
                  <SelectItem value="LSS">LinkedIn Sales Solutions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger data-testid="select-sort-by">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="lastContact">Last Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 bg-muted rounded w-20" />
                      <div className="h-6 bg-muted rounded w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedAccounts.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="text-center py-12">
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Accounts Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || stageFilter !== "all" || priorityFilter !== "all" || lobFilter !== "all" 
                  ? "No accounts match your current filters. Try adjusting your search criteria."
                  : "You don't have any active accounts yet. Create your first account to get started."
                }
              </p>
              <Link href="/research">
                <Button data-testid="button-create-account">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          // Accounts list
          filteredAndSortedAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`text-account-name-${account.id}`}>
                          {account.name}
                        </h3>
                        <Badge className={getPriorityColor(account.priority)} data-testid={`badge-priority-${account.id}`}>
                          {account.priority}
                        </Badge>
                        <Badge className={getStageColor(account.stage)} data-testid={`badge-stage-${account.id}`}>
                          {account.stage}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        {account.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <a 
                              href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-primary underline truncate"
                              data-testid={`link-website-${account.id}`}
                            >
                              {account.website}
                            </a>
                          </div>
                        )}
                        
                        {account.industry && (
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span className="truncate" data-testid={`text-industry-${account.id}`}>{account.industry}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span data-testid={`text-last-contact-${account.id}`}>
                            Last contact: {formatDate(account.lastContactDate)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${account.lob === 'LTS' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                          <span data-testid={`text-lob-${account.id}`}>{account.lob}</span>
                        </div>
                        <span>Created: {formatDate(account.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href="/research">
                      <Button variant="ghost" size="sm" data-testid={`button-research-${account.id}`}>
                        Research
                      </Button>
                    </Link>
                    <Link href="/playbook">
                      <Button variant="ghost" size="sm" data-testid={`button-playbook-${account.id}`}>
                        Playbook
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" data-testid={`button-view-details-${account.id}`}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}