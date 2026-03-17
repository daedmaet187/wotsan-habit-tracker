import { Link } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function Dashboard() {
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
  const growth = toArray(analytics.user_growth).slice(-7);

  const completionRate = stats.active_habits
    ? Math.min(100, Math.round(((stats.logs_today || 0) / stats.active_habits) * 100))
    : 0;

  const kpis = [
    { label: 'Total Users', value: stats.total_users ?? 0 },
    { label: 'Active This Week', value: analytics.active_this_week ?? 0 },
    { label: 'Completion Rate Today', value: `${completionRate}%` },
    { label: 'Total Habits', value: stats.total_habits ?? 0 },
  ];

  const loading = statsQuery.isLoading || analyticsQuery.isLoading || activityQuery.isLoading;
  const hasError = statsQuery.isError || analyticsQuery.isError || activityQuery.isError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of users, habits, and momentum.</p>
      </div>

      {hasError ? <p className="text-sm text-destructive">Could not load dashboard data.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-10 w-24" /> : <p className="text-3xl font-bold">{kpi.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/activity">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
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
                    <TableHead>Habit</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  ) : (
                    activity.map((item) => (
                      <TableRow key={item.id || `${item.user_email}-${item.created_at}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                            <span className="font-medium">{item.habit_name || 'Habit'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.user_email || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.logged_date ? new Date(item.logged_date).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Habits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : topHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No habit data yet.</p>
            ) : (
              topHabits.map((habit, index) => {
                const maxCount = Math.max(...topHabits.map((h) => h.log_count || 0), 1);
                const value = Math.round(((habit.log_count || 0) / maxCount) * 100);
                return (
                  <div key={habit.id || `${habit.name}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium">#{index + 1} {habit.name || 'Untitled'}</p>
                      <Badge variant="secondary">{habit.log_count || 0} logs</Badge>
                    </div>
                    <Progress value={value} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Growth (7 days)</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-xs text-muted-foreground">Data point labels</span>
            </TooltipTrigger>
            <TooltipContent>Hover chart points to inspect exact values by date.</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : growth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No growth data available.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <RechartsTooltip
                    formatter={(value) => [value, 'New Users']}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="new_users"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
