import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const widthClass = (value, max) => {
  const ratio = max ? value / max : 0;
  if (ratio >= 0.9) return 'w-full';
  if (ratio >= 0.8) return 'w-5/6';
  if (ratio >= 0.65) return 'w-4/5';
  if (ratio >= 0.5) return 'w-2/3';
  if (ratio >= 0.35) return 'w-1/2';
  if (ratio > 0) return 'w-1/3';
  return 'w-0';
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
              <p className="text-3xl font-bold">{loading ? '—' : kpi.value}</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Habits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No habit data yet.</p>
            ) : (
              topHabits.map((habit, index) => {
                const maxCount = Math.max(...topHabits.map((h) => h.log_count || 0), 1);
                return (
                  <div key={habit.id || `${habit.name}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium">#{index + 1} {habit.name || 'Untitled'}</p>
                      <Badge variant="secondary">{habit.log_count || 0} logs</Badge>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div className={`h-full rounded bg-primary ${widthClass(habit.log_count || 0, maxCount)}`} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Growth (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {growth.length === 0 ? (
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
                  <Tooltip
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
