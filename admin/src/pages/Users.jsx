import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';

const filterOptions = ['All', 'Admins', 'Active', 'Inactive'];

const getFilteredUsers = (users, search, filter) => {
  const q = search.toLowerCase();
  return users
    .filter((user) => {
      const email = (user.email || '').toLowerCase();
      const name = (user.full_name || '').toLowerCase();
      return email.includes(q) || name.includes(q);
    })
    .filter((user) => {
      if (filter === 'Admins') return user.role === 'admin';
      if (filter === 'Active') return user.is_active !== false;
      if (filter === 'Inactive') return user.is_active === false;
      return true;
    });
};

export default function Users() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then((r) => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/api/admin/users/${id}/status`, { is_active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/users/${id}`),
    onSuccess: invalidate,
  });

  const filtered = useMemo(() => getFilteredUsers(users, search, filter), [users, search, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage accounts, access level, and account status.</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Users ({users.length})</CardTitle>
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={filter === option ? 'default' : 'outline'}
                onClick={() => setFilter(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}
          {isError ? <p className="text-sm text-destructive">Failed to load users.</p> : null}

          {!isLoading && !isError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Habits</TableHead>
                  <TableHead>Total Logs</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => {
                    const initial = (user.email || '?').charAt(0).toUpperCase();
                    const nextRole = user.role === 'admin' ? 'user' : 'admin';
                    const nextStatus = user.is_active === false;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                              {initial}
                            </span>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-xs text-muted-foreground">{user.full_name || 'No full name'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role || 'user'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={user.is_active === false ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700'}
                          >
                            {user.is_active === false ? 'Inactive' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.habit_count ?? 0}</TableCell>
                        <TableCell>{user.total_logs ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(user.last_active_at || user.updated_at || user.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={roleMutation.isPending}
                              onClick={() => roleMutation.mutate({ id: user.id, role: nextRole })}
                            >
                              Make {nextRole}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: user.id, is_active: nextStatus })}
                            >
                              {user.is_active === false ? 'Activate' : 'Deactivate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                const ok = window.confirm('This will delete all their habits and logs. Are you sure?');
                                if (ok) deleteMutation.mutate(user.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
