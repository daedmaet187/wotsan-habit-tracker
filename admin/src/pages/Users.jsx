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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const colorClassFromHabit = (colorValue = '') => {
  const c = colorValue.toLowerCase();
  if (c.includes('red') || c.includes('f87171') || c.includes('ef4444')) return 'bg-red-500';
  if (c.includes('green') || c.includes('22c55e') || c.includes('10b981')) return 'bg-emerald-500';
  if (c.includes('yellow') || c.includes('eab308') || c.includes('f59e0b')) return 'bg-amber-500';
  if (c.includes('purple') || c.includes('a855f7') || c.includes('9333ea')) return 'bg-purple-500';
  if (c.includes('pink') || c.includes('ec4899')) return 'bg-pink-500';
  if (c.includes('orange') || c.includes('f97316')) return 'bg-orange-500';
  return 'bg-sky-500';
};

function UserDetailModal({ userId, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => api.get(`/api/admin/users/${userId}`).then((r) => r.data),
    enabled: !!userId,
  });

  if (!userId) return null;

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">Failed to load user details.</p>
        )}

        {data && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {(data.user.full_name || data.user.email || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{data.user.full_name || 'No name'}</h3>
                <p className="text-sm text-muted-foreground">{data.user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={data.user.role === 'admin' ? 'default' : 'secondary'}>
                    {data.user.role || 'user'}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={data.user.is_active === false ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700'}
                  >
                    {data.user.is_active === false ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Joined {formatRelativeTime(data.user.created_at)}
                </p>
              </div>
            </div>

            {/* User's Habits */}
            <div>
              <h4 className="font-medium mb-3">Habits ({data.habits.length})</h4>
              {data.habits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No habits yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${colorClassFromHabit(habit.color)}`} />
                        <div>
                          <p className="font-medium">{habit.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {habit.frequency} • {habit.log_count} logs
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={habit.is_active === false ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700'}
                      >
                        {habit.is_active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-medium mb-3">Recent Activity (Last 30 days)</h4>
              {data.recent_activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.recent_activity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2 rounded border text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${colorClassFromHabit(log.habit_color)}`} />
                        <span>{log.habit_name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(log.logged_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
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
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedUserId(user.id)}
                      >
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
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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

      <UserDetailModal 
        userId={selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
      />

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
