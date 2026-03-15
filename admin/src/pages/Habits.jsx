import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import api from '@/lib/api';

export default function Habits() {
  const [search, setSearch] = useState('');

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['admin-habits'],
    queryFn: () => api.get('/api/admin/habits').then(r => r.data).catch(() => []),
  });

  const filtered = habits.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Habits</h2>
        <p className="text-muted-foreground">All habits across all users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Habits ({habits.length})</CardTitle>
            <Input
              placeholder="Search habits..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Habit</th>
                    <th className="h-10 px-4 text-left font-medium">Frequency</th>
                    <th className="h-10 px-4 text-left font-medium">Status</th>
                    <th className="h-10 px-4 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">No habits found</td></tr>
                  ) : filtered.map(habit => (
                    <tr key={habit.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color || '#6366f1' }} />
                          <span className="font-medium">{habit.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{habit.frequency}</td>
                      <td className="px-4 py-3">
                        <Badge variant={habit.is_active ? 'outline' : 'secondary'}>
                          {habit.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {habit.created_at ? new Date(habit.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}