import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default function Analytics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/api/admin/analytics').then((r) => r.data),
  });

  const userGrowth = toArray(data?.user_growth).slice(-30);
  const completionRaw = toArray(data?.completion_trend).slice(-30);
  const topHabits = toArray(data?.top_habits).slice(0, 10);

  const completionTrend = useMemo(() => {
    if (completionRaw.length > 0) {
      return completionRaw.map((item) => ({
        ...item,
        completion_rate: Math.min(100, Math.round(item.completion_rate ?? 0)),
      }));
    }

    return userGrowth.map((item) => {
      const active = item.active_habits || 0;
      const logs = item.total_logs || 0;
      const rate = active ? (logs / active) * 100 : 0;
      return {
        date: item.date,
        completion_rate: Math.min(100, Math.round(rate)),
      };
    });
  }, [completionRaw, userGrowth]);

  const dayOfWeekData = useMemo(() => {
    const source = toArray(data?.day_of_week);
    if (source.length > 0) return source;

    const map = new Map(days.map((d) => [d, 0]));
    toArray(data?.activity_by_day).forEach((entry) => {
      const key = Number.isFinite(entry.day_index)
        ? days[entry.day_index]
        : new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
      map.set(key, (map.get(key) || 0) + (entry.total_logs || entry.count || 0));
    });

    return days.map((day) => ({ day, total_logs: map.get(day) || 0 }));
  }, [data]);

  const totalNewUsers = userGrowth.reduce((sum, item) => sum + (item.new_users || 0), 0);
  const avgCompletion = completionTrend.length
    ? Math.round(completionTrend.reduce((sum, item) => sum + (item.completion_rate || 0), 0) / completionTrend.length)
    : 0;
  const maxTopHabit = Math.max(...topHabits.map((habit) => habit.log_count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Performance trends for growth, completion, and engagement.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}
      {isError ? <p className="text-sm text-destructive">Failed to load analytics.</p> : null}

      {!isLoading && !isError ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Growth (30 days)</CardTitle>
              <Badge variant="secondary">{totalNewUsers} new users</Badge>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <Area type="monotone" dataKey="new_users" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Completion Trend (30 days)</CardTitle>
              <Badge variant="secondary">Avg {avgCompletion}%</Badge>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Completion']} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <Line type="monotone" dataKey="completion_rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most active day of week</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total_logs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Habits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topHabits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No habit ranking available.</p>
              ) : (
                topHabits.map((habit, index) => (
                  <div key={habit.id || `${habit.name}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">#{index + 1} {habit.name || 'Untitled Habit'}</p>
                        <p className="truncate text-xs text-muted-foreground">{habit.user_email || 'Unknown owner'}</p>
                      </div>
                      <Badge variant="secondary">{habit.log_count || 0}</Badge>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div className={`h-full rounded bg-primary ${widthClass(habit.log_count || 0, maxTopHabit)}`} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
