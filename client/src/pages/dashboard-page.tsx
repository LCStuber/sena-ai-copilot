import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import TimeZoneSelector from "@/components/time-zone-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Target,
  ChevronRight,
  Clock,
  Filter
} from "lucide-react";
import { formatDueDate } from "@/lib/time-utils";

interface DashboardStats {
  activeAccounts: number;
  completedNBAs: number;
  pipelineValue: string;
  conversionRate: string;
}

interface Account {
  id: string;
  name: string;
  stage: string;
  priority: string;
  lastContactDate: string;
}

interface NextBestAction {
  id: string;
  title: string;
  accountId: string;
  priority: string;
  dueDate: string;
  userTimeZone: string;
}

export default function DashboardPage() {
  const [userTimeZone, setUserTimeZone] = useState("America/New_York");
  const [accountTimeZone, setAccountTimeZone] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Auto-detect user timezone
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimeZone(detected);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Filter accounts based on priority filter
  const filteredAccounts = priorityFilter && priorityFilter !== "all"
    ? accounts.filter(account => account.priority === priorityFilter)
    : accounts;

  const { data: nbas = [], isLoading: nbasLoading } = useQuery<NextBestAction[]>({
    queryKey: ["/api/nbas"],
  });

  // Get priority NBAs (open status, high/medium priority)
  const priorityNBAs = nbas
    .filter(nba => nba.priority === "High" || nba.priority === "Medium")
    .slice(0, 3);

  const statCards = [
    {
      title: "Active Accounts",
      value: stats?.activeAccounts || 0,
      icon: LayoutDashboard,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completed NBAs",
      value: stats?.completedNBAs || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pipeline Value",
      value: stats?.pipelineValue || "$0",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Conversion Rate",
      value: stats?.conversionRate || "0%",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAccountInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
        <div>
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">Account Dashboard</h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">Your sales enablement command center</p>
          </div>

          {/* Time Zone Selector */}
          <TimeZoneSelector
            userTimeZone={userTimeZone}
            accountTimeZone={accountTimeZone}
            onUserTimeZoneChange={setUserTimeZone}
            onAccountTimeZoneChange={setAccountTimeZone}
          />

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-center">
                      <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
                      </div>
                      <div className="ml-3 md:ml-4">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-xl md:text-2xl font-bold text-foreground" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          {statsLoading ? "..." : stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Active Accounts */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <CardTitle data-testid="text-active-accounts-title">Active Accounts</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full sm:w-40" data-testid="select-priority-filter">
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
                  </div>
                  <Link href="/research">
                    <Button variant="ghost" size="sm" data-testid="button-view-all-accounts">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg animate-pulse">
                          <div className="w-10 h-10 bg-muted rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground" data-testid="text-no-accounts">
                        {priorityFilter ? `No ${priorityFilter.toLowerCase()} priority accounts found` : 'No active accounts found'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {priorityFilter ? 'Try changing the priority filter' : 'Create your first account to get started'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAccounts.slice(0, 5).map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`account-item-${account.id}`}>
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {getAccountInitials(account.name)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground" data-testid={`text-account-name-${account.id}`}>
                                {account.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {account.stage} • Last contact: {account.lastContactDate ? new Date(account.lastContactDate).toLocaleDateString() : 'No recent contact'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(account.priority)}>
                              {account.priority} Priority
                            </Badge>
                            <Link href="/research">
                              <Button variant="ghost" size="sm" data-testid={`button-open-account-${account.id}`}>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Priority NBAs */}
            <div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle data-testid="text-priority-nbas-title">Priority NBAs</CardTitle>
                  <Badge variant="secondary" data-testid="text-nbas-count">
                    {nbas.length} Open
                  </Badge>
                </CardHeader>
                <CardContent>
                  {nbasLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2 mb-1" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                        </div>
                      ))}
                    </div>
                  ) : priorityNBAs.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground" data-testid="text-no-nbas">No priority actions</p>
                      <p className="text-sm text-muted-foreground mt-1">Create transcripts to generate NBAs</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {priorityNBAs.map((nba) => (
                        <div key={nba.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`nba-item-${nba.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-foreground" data-testid={`text-nba-title-${nba.id}`}>
                                {nba.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Account ID: {nba.accountId}
                              </p>
                              <p className={`text-xs mt-1 ${
                                nba.priority === 'High' ? 'text-red-600' : 
                                nba.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                              }`} data-testid={`text-nba-due-${nba.id}`}>
                                Due: {formatDueDate(new Date(nba.dueDate), userTimeZone)}
                              </p>
                            </div>
                            <Link href="/nbas">
                              <Button variant="ghost" size="sm" data-testid={`button-complete-nba-${nba.id}`}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {priorityNBAs.length > 0 && (
                    <Link href="/nbas">
                      <Button variant="ghost" className="w-full mt-4" data-testid="button-view-all-nbas">
                        View All NBAs
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  );
}
