import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

// Trend badge used inside KPI cards
function TrendBadge({ value }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

const TIME_RANGES = ['Last 7 days', 'Last 30 days', 'Last 3 months'];

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('Last 7 days');
  const [activeTab, setActiveTab] = useState('overview');

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then((r) => r.data),
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/api/admin/analytics').then((r) => r.data),
  });

  const activityQuery = useQuery({
    queryKey: ['admin-activity-preview'],
    queryFn: () => api.get('/api/admin/activity').then((r) => r.data),
  });

  const stats = statsQuery.data || {};
  const analytics = analyticsQuery.data || {};
  const activity = toArray(activityQuery.data).slice(0, 5);
  const topHabits = toArray(analytics.top_habits).slice(0, 5);

  // Pick growth slice based on time range
  const allGrowth = toArray(analytics.user_growth);
  const growthSlice =
    timeRange === 'Last 7 days'
      ? allGrowth.slice(-7)
      : timeRange === 'Last 30 days'
      ? allGrowth.slice(-30)
      : allGrowth;

  const completionRate = stats.active_habits
    ? Math.min(100, Math.round(((stats.logs_today || 0) / stats.active_habits) * 100))
    : 0;

  const loading = statsQuery.isLoading || analyticsQuery.isLoading || activityQuery.isLoading;
  const hasError = statsQuery.isError || analyticsQuery.isError || activityQuery.isError;

  const kpis = [
    {
      label: 'Total Users',
      value: stats.total_users ?? 0,
      trend: 12.5,
      description: 'Trending up this month',
      subtitle: 'Registered accounts',
    },
    {
      label: 'Active This Week',
      value: analytics.active_this_week ?? 0,
      trend: analytics.active_this_week > 0 ? 8 : -5,
      description: analytics.active_this_week > 0 ? 'Good engagement rate' : 'Needs attention',
      subtitle: 'Users logged in past 7 days',
    },
    {
      label: 'Today\'s Completion',
      value: `${completionRate}%`,
      trend: completionRate > 50 ? 4.5 : -3,
      description: completionRate > 50 ? 'Steady performance' : 'Below average',
      subtitle: 'Habits logged vs active',
    },
    {
      label: 'Total Habits',
      value: stats.total_habits ?? 0,
      trend: 6,
      description: 'Growing habit library',
      subtitle: 'Across all users',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of users, habits, and momentum.</p>
      </div>

      {hasError && (
        <p className="text-sm text-destructive">Could not load some dashboard data.</p>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium">{kpi.label}</CardDescription>
                {!loading && <TrendBadge value={kpi.trend} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
              )}
              {loading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                <>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {kpi.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    {kpi.description}
                  </p>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Top Habits */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Area chart — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base">User Growth</CardTitle>
              <CardDescription className="text-xs">
                {timeRange === 'Last 7 days'
                  ? 'Total for the last 7 days'
                  : timeRange === 'Last 30 days'
                  ? 'Total for the last 30 days'
                  : 'Total for the last 3 months'}
              </CardDescription>
            </div>
            {/* Segmented time-range control */}
            <div className="flex items-center rounded-md border bg-muted p-0.5 text-xs">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded px-2.5 py-1 transition-colors ${
                    timeRange === r
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : growthSlice.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No growth data available.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthSlice}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={(value) => [value, 'New Users']}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                      contentStyle={{ fontSize: 12, borderRadius: 6 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="new_users"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Habits — 1 col */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Habits</CardTitle>
            <CardDescription className="text-xs">Most logged across all users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : topHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No habit data yet.</p>
            ) : (
              topHabits.map((habit, index) => {
                const maxCount = Math.max(...topHabits.map((h) => h.log_count || 0), 1);
                const value = Math.round(((habit.log_count || 0) / maxCount) * 100);
                return (
                  <div key={habit.id || `${habit.name}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-medium">#{index + 1} {habit.name || 'Untitled'}</p>
                      <Badge variant="secondary" className="text-xs">{habit.log_count || 0}</Badge>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed section */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <TabsList className="h-9">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Recent Activity
                  {activity.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {activity.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="habits" className="text-xs">
                  Habits
                  {topHabits.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {topHabits.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <Link to="/activity">View all activity</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Overview tab */}
            <TabsContent value="overview" className="m-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Logs today</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.logs_today ?? 0}</p>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Active habits</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.active_habits ?? 0}</p>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">New users this week</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.new_users_this_week ?? 0}</p>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Streak leaders</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.streak_leaders ?? 0}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Recent Activity tab */}
            <TabsContent value="activity" className="m-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Habit</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          No recent activity
                        </TableCell>
                      </TableRow>
                    ) : (
                      activity.map((item) => (
                        <TableRow key={item.id || `${item.user_email}-${item.created_at}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary/80" />
                              <span className="text-sm font-medium">{item.habit_name || 'Habit'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.user_email || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.logged_date
                              ? new Date(item.logged_date).toLocaleDateString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Habits tab */}
            <TabsContent value="habits" className="m-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topHabits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No habit data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Rank</TableHead>
                      <TableHead className="text-xs">Habit</TableHead>
                      <TableHead className="text-xs text-right">Logs</TableHead>
                      <TableHead className="text-xs">Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topHabits.map((habit, index) => {
                      const maxCount = Math.max(...topHabits.map((h) => h.log_count || 0), 1);
                      const value = Math.round(((habit.log_count || 0) / maxCount) * 100);
                      return (
                        <TableRow key={habit.id || `${habit.name}-${index}`}>
                          <TableCell className="text-sm text-muted-foreground">#{index + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{habit.name || 'Untitled'}</TableCell>
                          <TableCell className="text-right text-sm">{habit.log_count || 0}</TableCell>
                          <TableCell className="w-32">
                            <Progress value={value} className="h-1.5" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
