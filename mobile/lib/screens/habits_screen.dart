import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intl/intl.dart';

import '../models/habit.dart';
import '../services/api_service.dart';
import '../utils/habit_metrics.dart';

class HabitsScreen extends StatefulWidget {
  const HabitsScreen({super.key});

  @override
  State<HabitsScreen> createState() => _HabitsScreenState();
}

class _HabitsScreenState extends State<HabitsScreen> {
  final _apiService = ApiService();
  final List<String> _presetColors = const ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

  bool _isLoading = true;
  List<Habit> _habits = [];
  Map<String, int> _streaks = {};
  String _search = '';
  String _sort = 'name';

  @override
  void initState() {
    super.initState();
    _loadHabits();
  }

  Future<void> _loadHabits() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.getHabits();
      final habits = response.map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      final recentLogs = await _apiService.getRecentLogs(30);
      final streaks = HabitMetrics.streaksForHabits(habits, HabitMetrics.logsByDateByHabit(recentLogs), 30);
      setState(() {
        _habits = habits;
        _streaks = streaks;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load habits.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _upsertHabit({Habit? habit}) async {
    final nameController = TextEditingController(text: habit?.name ?? '');
    final descriptionController = TextEditingController(text: habit?.description ?? '');
    final targetDaysController = TextEditingController(text: (habit?.targetDays ?? 1).toString());
    String frequency = habit?.frequency ?? 'daily';
    String selectedColor = habit?.color ?? _presetColors.first;

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(habit == null ? 'Add Habit' : 'Edit Habit', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
                const SizedBox(height: 10),
                TextField(
                  controller: descriptionController,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _presetColors.map((hex) {
                    final isSelected = selectedColor == hex;
                    return InkWell(
                      onTap: () => setModalState(() => selectedColor = hex),
                      child: CircleAvatar(
                        radius: isSelected ? 16 : 14,
                        backgroundColor: _parseColor(hex),
                        child: isSelected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'daily', label: Text('Daily')),
                    ButtonSegment(value: 'weekly', label: Text('Weekly')),
                    ButtonSegment(value: 'monthly', label: Text('Monthly')),
                  ],
                  selected: {frequency},
                  onSelectionChanged: (selection) => setModalState(() => frequency = selection.first),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: targetDaysController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Target days'),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context, nameController.text.trim().isNotEmpty),
                  child: const Text('Save'),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (saved != true) return;

    final payload = {
      'name': nameController.text.trim(),
      'description': descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
      'frequency': frequency,
      'target_days': int.tryParse(targetDaysController.text.trim()) ?? 1,
      'color': selectedColor,
      'is_active': habit?.isActive ?? true,
    };

    try {
      if (habit == null) {
        await _apiService.createHabit(payload);
      } else {
        await _apiService.updateHabit(habit.id, payload);
      }
      await _loadHabits();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save habit.')));
    }
  }

  Future<void> _confirmDelete(Habit habit) async {
    final mode = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete habit?'),
        content: const Text('Archive keeps your history. Hard delete removes everything permanently.'),
        actions: [
          OutlinedButton(onPressed: () => Navigator.pop(context, 'cancel'), child: const Text('Cancel')),
          FilledButton.tonal(onPressed: () => Navigator.pop(context, 'archive'), child: const Text('Archive')),
          FilledButton(onPressed: () => Navigator.pop(context, 'delete'), child: const Text('Delete')),
        ],
      ),
    );

    if (mode == 'cancel' || mode == null) return;

    try {
      if (mode == 'archive') {
        await _apiService.updateHabit(habit.id, {'is_active': false});
      } else {
        await _apiService.deleteHabit(habit.id);
      }
      await _loadHabits();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete habit.')));
    }
  }

  void _showDetail(Habit habit) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        final streak = _streaks[habit.id] ?? 0;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(habit.name, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(habit.description ?? 'No description'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(label: Text('Frequency: ${habit.frequency}')),
                    Chip(label: Text('Streak: $streak')),
                    Chip(label: Text('Created: ${DateFormat('yMMMd').format(habit.createdAt)}')),
                    Chip(label: Text(habit.isActive ? 'Active' : 'Inactive')),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _parseColor(String hex) {
    final normalized = hex.replaceAll('#', '');
    final buffer = StringBuffer();
    if (normalized.length == 6) buffer.write('ff');
    buffer.write(normalized);
    return Color(int.tryParse(buffer.toString(), radix: 16) ?? 0xff6366f1);
  }

  Map<String, List<Habit>> get _grouped {
    final filtered = _habits.where((h) => h.name.toLowerCase().contains(_search.toLowerCase())).toList();
    filtered.sort((a, b) {
      if (_sort == 'streak') return (_streaks[b.id] ?? 0).compareTo(_streaks[a.id] ?? 0);
      if (_sort == 'created') return b.createdAt.compareTo(a.createdAt);
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });

    return {
      'daily': filtered.where((h) => h.frequency == 'daily').toList(),
      'weekly': filtered.where((h) => h.frequency == 'weekly').toList(),
      'monthly': filtered.where((h) => h.frequency == 'monthly').toList(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final grouped = _grouped;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHabits,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Habits', style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 12),
                          SearchBar(
                            hintText: 'Search habits',
                            onChanged: (value) => setState(() => _search = value),
                            trailing: const [Icon(Icons.search)],
                          ),
                          const SizedBox(height: 12),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(value: 'name', label: Text('Name')),
                              ButtonSegment(value: 'streak', label: Text('Streak')),
                              ButtonSegment(value: 'created', label: Text('Created')),
                            ],
                            selected: {_sort},
                            onSelectionChanged: (value) => setState(() => _sort = value.first),
                          ),
                        ],
                      ),
                    ),
                  ),
                  ...['daily', 'weekly', 'monthly'].expand((frequency) {
                    final items = grouped[frequency] ?? [];
                    if (items.isEmpty) return <Widget>[];
                    return [
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _HeaderDelegate(
                          title: '${frequency[0].toUpperCase()}${frequency.substring(1)}',
                          color: colorScheme.surface,
                        ),
                      ),
                      SliverList.builder(
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final habit = items[index];
                          return Slidable(
                            key: ValueKey(habit.id),
                            startActionPane: ActionPane(
                              motion: const DrawerMotion(),
                              children: [
                                SlidableAction(
                                  onPressed: (_) => _upsertHabit(habit: habit),
                                  icon: Icons.edit_outlined,
                                  label: 'Edit',
                                  backgroundColor: colorScheme.tertiaryContainer,
                                  foregroundColor: colorScheme.onTertiaryContainer,
                                ),
                              ],
                            ),
                            endActionPane: ActionPane(
                              motion: const DrawerMotion(),
                              children: [
                                SlidableAction(
                                  onPressed: (_) => _confirmDelete(habit),
                                  icon: Icons.delete_outline,
                                  label: 'Delete',
                                  backgroundColor: colorScheme.error,
                                  foregroundColor: colorScheme.onError,
                                ),
                              ],
                            ),
                            child: Card(
                              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                              child: ListTile(
                                onTap: () => _showDetail(habit),
                                leading: Icon(Icons.circle, color: _parseColor(habit.color), size: 16),
                                title: Text(habit.name),
                                subtitle: Wrap(
                                  spacing: 8,
                                  children: [
                                    Chip(label: Text('🔥 ${_streaks[habit.id] ?? 0}')),
                                    Chip(label: Text(habit.isActive ? 'Active' : 'Inactive')),
                                  ],
                                ),
                                trailing: const Icon(Icons.chevron_right),
                              ),
                            ),
                          );
                        },
                      ),
                    ];
                  }),
                  if (grouped.values.every((list) => list.isEmpty))
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.inbox_outlined, size: 48, color: colorScheme.outline),
                            const SizedBox(height: 8),
                            const Text('No habits match your search.'),
                          ],
                        ),
                      ),
                    ),
                  const SliverToBoxAdapter(child: SizedBox(height: 88)),
                ],
              ),
            ),
        ),
      floatingActionButton: FloatingActionButton(onPressed: () => _upsertHabit(), child: const Icon(Icons.add)),
    );
  }
}

class _HeaderDelegate extends SliverPersistentHeaderDelegate {
  const _HeaderDelegate({required this.title, required this.color});

  final String title;
  final Color color;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      alignment: Alignment.centerLeft,
      color: color,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(title, style: Theme.of(context).textTheme.titleMedium),
    );
  }

  @override
  double get maxExtent => 44;

  @override
  double get minExtent => 44;

  @override
  bool shouldRebuild(covariant _HeaderDelegate oldDelegate) => oldDelegate.title != title || oldDelegate.color != color;
}
