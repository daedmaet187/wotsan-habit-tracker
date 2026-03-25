import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const frequencyLabel = (value) => {
  if (!value) return 'Custom';
  return String(value).replace('_', ' ');
};

const dotColorClass = (colorValue = '') => {
  const c = colorValue.toLowerCase();
  if (c.includes('red') || c.includes('ef4444')) return 'bg-red-500';
  if (c.includes('green') || c.includes('22c55e')) return 'bg-emerald-500';
  if (c.includes('yellow') || c.includes('eab308')) return 'bg-amber-500';
  if (c.includes('purple') || c.includes('a855f7')) return 'bg-purple-500';
  return 'bg-sky-500';
};

export default function Activity() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => api.get('/api/admin/activity').then((r) => r.data),
    refetchInterval: 30000,
  });

  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const lastUpdatedTime = dataUpdatedAt || Date.now();
    const id = window.setInterval(() => {
      setSecondsAgo(() => Math.max(0, Math.floor((Date.now() - lastUpdatedTime) / 1000)));
    }, 1000);

    return () => window.clearInterval(id);
  }, [dataUpdatedAt]);

  const activity = toArray(data);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activity.filter((item) => {
      const email = (item.user_email || '').toLowerCase();
      const habit = (item.habit_name || '').toLowerCase();
      return email.includes(q) || habit.includes(q);
    });
  }, [activity, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activity</h2>
          <p className="text-muted-foreground">Live feed of habit logs across all users.</p>
        </div>
        <p className="text-xs text-muted-foreground">Last updated {secondsAgo}s ago</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent Logs ({activity.length})</CardTitle>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              placeholder="Filter by user email or habit name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : null}
          {isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Failed to load activity.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Habit</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No activity matches your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id || `${item.user_email}-${item.created_at}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${dotColorClass(item.habit_color || item.color)}`} />
                          <span className="font-medium">{item.habit_name || 'Untitled Habit'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.user_email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.logged_date
                          ? new Date(item.logged_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : formatRelativeTime(item.logged_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {frequencyLabel(item.frequency)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
