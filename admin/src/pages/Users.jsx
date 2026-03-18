import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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
    onSuccess: () => {
      setDeleteTarget(null);
      invalidate();
    },
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

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {filterOptions.map((option) => (
                <TabsTrigger key={option} value={option}>
                  {option}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-3">
                  <Skeleton className="h-10 col-span-2" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ))}
            </div>
          ) : null}
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
                    const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
                    const nextRole = user.role === 'admin' ? 'user' : 'admin';
                    const nextStatus = user.is_active === false;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={roleMutation.isPending}
                                  onClick={() => roleMutation.mutate({ id: user.id, role: nextRole })}
                                >
                                  Make {nextRole}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Toggle user role</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={statusMutation.isPending}
                                  onClick={() => statusMutation.mutate({ id: user.id, is_active: nextStatus })}
                                >
                                  {user.is_active === false ? 'Activate' : 'Deactivate'}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Toggle account status</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => setDeleteTarget(user)}
                                >
                                  Delete
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete user and all data</TooltipContent>
                            </Tooltip>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.email || 'this user'} and all related habits/logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
