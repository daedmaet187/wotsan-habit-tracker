import { useMemo, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const [range, setRange] = useState('30');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/api/admin/analytics').then((r) => r.data),
  });

  const daysRange = Number(range);
  const userGrowth = toArray(data?.user_growth).slice(-daysRange);
  const completionRaw = toArray(data?.completion_trend).slice(-daysRange);
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
  const maxTopHabit = Math.max(...topHabits.map((habit) => habit.log_count || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Performance trends for growth, completion, and engagement.</p>
        </div>
        <div className="w-48">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger>
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? <p className="text-sm text-destructive">Failed to load analytics.</p> : null}

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>Growth & Completion</CardTitle>
              <Tabs defaultValue="growth">
                <TabsList>
                  <TabsTrigger value="growth">Growth</TabsTrigger>
                  <TabsTrigger value="completion">Completion</TabsTrigger>
                </TabsList>
                <TabsContent value="growth" className="h-64">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>New users</span>
                    <Badge variant="secondary">{totalNewUsers}</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} className="text-xs" />
                      <YAxis allowDecimals={false} className="text-xs" />
                      <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                      <Area type="monotone" dataKey="new_users" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="completion" className="space-y-2">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Average completion</span>
                    <Badge variant="secondary">{avgCompletion}%</Badge>
                  </div>
                  <Progress value={avgCompletion} />
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={completionTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip formatter={(v) => [`${v}%`, 'Completion']} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                        <Line type="monotone" dataKey="completion_rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
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

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Habits</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
                    <Progress value={Math.round(((habit.log_count || 0) / maxTopHabit) * 100)} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
