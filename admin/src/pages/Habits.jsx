import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import api from '@/lib/api';

const sortOptions = {
  log_count: 'log_count',
  name: 'name',
  created_at: 'created_at',
};

const barWidthClass = (value, max) => {
  const ratio = max === 0 ? 0 : value / max;
  if (ratio >= 0.9) return 'w-full';
  if (ratio >= 0.8) return 'w-5/6';
  if (ratio >= 0.65) return 'w-4/5';
  if (ratio >= 0.5) return 'w-2/3';
  if (ratio >= 0.35) return 'w-1/2';
  if (ratio >= 0.2) return 'w-1/3';
  if (ratio > 0) return 'w-1/4';
  return 'w-0';
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

const colorOptions = [
  { value: '#6366f1', label: 'Indigo', class: 'bg-indigo-500' },
  { value: '#ef4444', label: 'Red', class: 'bg-red-500' },
  { value: '#22c55e', label: 'Green', class: 'bg-emerald-500' },
  { value: '#eab308', label: 'Yellow', class: 'bg-amber-500' },
  { value: '#a855f7', label: 'Purple', class: 'bg-purple-500' },
  { value: '#ec4899', label: 'Pink', class: 'bg-pink-500' },
  { value: '#f97316', label: 'Orange', class: 'bg-orange-500' },
  { value: '#0ea5e9', label: 'Sky', class: 'bg-sky-500' },
];

function EditHabitModal({ habit, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: habit?.name || '',
    description: habit?.description || '',
    color: habit?.color || '#6366f1',
    icon: habit?.icon || '',
    frequency: habit?.frequency || 'daily',
    is_active: habit?.is_active ?? true,
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/api/admin/habits/${habit.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-habits'] });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (!habit) return null;

  return (
    <Dialog open={!!habit} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-8 w-8 rounded-full ${color.class} ${
                    form.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  onClick={() => setForm((f) => ({ ...f, color: color.value }))}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon (emoji or text)</Label>
            <Input
              id="icon"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="e.g. 🏃 or running"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(value) => setForm((f) => ({ ...f, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.is_active ? 'active' : 'inactive'}
              onValueChange={(value) => setForm((f) => ({ ...f, is_active: value === 'active' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {updateMutation.isError && (
            <p className="text-sm text-destructive">Failed to update habit. Please try again.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Habits() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(sortOptions.log_count);
  const [direction, setDirection] = useState('desc');
  const [editingHabit, setEditingHabit] = useState(null);

  const { data: habits = [], isLoading, isError } = useQuery({
    queryKey: ['admin-habits'],
    queryFn: () => api.get('/api/admin/habits').then((r) => r.data),
  });

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = habits.filter((habit) => {
      const name = (habit.name || '').toLowerCase();
      const email = (habit.user_email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    return [...filtered].sort((a, b) => {
      let left = a[sortBy];
      let right = b[sortBy];

      if (sortBy === sortOptions.created_at) {
        left = left ? new Date(left).getTime() : 0;
        right = right ? new Date(right).getTime() : 0;
      }

      if (sortBy === sortOptions.name) {
        left = (left || '').toLowerCase();
        right = (right || '').toLowerCase();
      }

      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'asc' ? result : -result;
    });
  }, [habits, search, sortBy, direction]);

  const maxLogs = Math.max(...filteredAndSorted.map((h) => h.log_count || 0), 0);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(key);
    setDirection(key === sortOptions.name ? 'asc' : 'desc');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Habits</h2>
        <p className="text-muted-foreground">View and manage all user habits across the platform.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Habits ({habits.length})</CardTitle>
          <Input
            placeholder="Search by habit or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading habits...</p> : null}
          {isError ? <p className="text-sm text-destructive">Failed to load habits.</p> : null}

          {!isLoading && !isError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort(sortOptions.name)}>
                      Habit <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort(sortOptions.log_count)}>
                      Log Count <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort(sortOptions.created_at)}>
                      Created <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No habits match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSorted.map((habit) => (
                    <TableRow key={habit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${colorClassFromHabit(habit.color)}`} />
                          <span className="font-medium">{habit.name || 'Untitled Habit'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{habit.user_email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {habit.frequency || 'custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={habit.is_active === false ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700'}
                        >
                          {habit.is_active === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{habit.log_count || 0}</p>
                          <div className="h-2 w-24 rounded bg-muted">
                            <div className={`h-full rounded bg-primary ${barWidthClass(habit.log_count || 0, maxLogs)}`} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {habit.created_at ? new Date(habit.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingHabit(habit)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit habit details</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <EditHabitModal
        habit={editingHabit}
        onClose={() => setEditingHabit(null)}
      />
    </div>
  );
}
