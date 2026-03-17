import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/habit.dart';
import '../services/api_service.dart';
import '../utils/habit_metrics.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _apiService = ApiService();

  bool _isLoading = true;
  List<Habit> _habits = [];
  Set<String> _loggedToday = <String>{};
  Map<String, String> _logIdsByHabit = <String, String>{};
  Map<String, int> _streaks = <String, int>{};
  String _filter = 'all';

  String get _today => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _todayPretty => DateFormat('EEEE, MMMM d').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final habitsRes = await _apiService.getHabits();
      final recentLogs = await _apiService.getRecentLogs(30);
      final logsByHabit = <String, String>{};
      for (final item in (recentLogs[_today] ?? <dynamic>[])) {
        final log = Map<String, dynamic>.from(item as Map);
        final habitId = log['habit_id']?.toString();
        final logId = log['id']?.toString();
        if (habitId != null && logId != null) {
          logsByHabit[habitId] = logId;
        }
      }

      final habits = habitsRes
          .map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((h) => h.isActive)
          .toList();
      final logsByDateByHabit = HabitMetrics.logsByDateByHabit(recentLogs);
      final streaks = HabitMetrics.streaksForHabits(habits, logsByDateByHabit, 30);

      setState(() {
        _habits = habits;
        _loggedToday = logsByHabit.keys.toSet();
        _logIdsByHabit = logsByHabit;
        _streaks = streaks;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load today\'s habits.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleHabit(Habit habit, bool checked) async {
    try {
      if (!checked) {
        final logId = _logIdsByHabit[habit.id];
        if (logId == null) return;
        await _apiService.deleteLog(logId);
      } else {
        await _apiService.logHabit(habit.id, _today);
      }
      await _loadData();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update habit log.')),
      );
    }
  }

  Color _parseColor(String hex, Color fallback) {
    final normalized = hex.replaceAll('#', '');
    final buffer = StringBuffer();
    if (normalized.length == 6) buffer.write('ff');
    buffer.write(normalized);
    return Color(int.tryParse(buffer.toString(), radix: 16) ?? fallback.value);
  }

  List<Habit> get _filteredHabits {
    if (_filter == 'all') return _habits;
    return _habits.where((h) => h.frequency == _filter).toList();
  }

  void _showActions(Habit habit) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Edit'),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    const SnackBar(content: Text('Edit from Habits tab.')),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Delete'),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    const SnackBar(content: Text('Delete from Habits tab.')),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.history),
                title: const Text('View History'),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    const SnackBar(content: Text('History view coming soon.')),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final visibleHabits = _filteredHabits;
    final pending = visibleHabits.where((h) => !_loggedToday.contains(h.id)).toList();
    final completed = visibleHabits.where((h) => _loggedToday.contains(h.id)).toList();
    final doneCount = visibleHabits.where((h) => _loggedToday.contains(h.id)).length;
    final progress = visibleHabits.isEmpty ? 0.0 : doneCount / visibleHabits.length;

    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: CustomScrollView(
                slivers: [
                  SliverAppBar.large(
                    pinned: true,
                    title: const Text('Today'),
                    bottom: PreferredSize(
                      preferredSize: const Size.fromHeight(52),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(_todayPretty, style: theme.textTheme.bodyMedium),
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Card(
                            elevation: 0,
                            color: colorScheme.surfaceVariant,
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$doneCount / ${visibleHabits.length} habits done today',
                                    style: theme.textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 12),
                                  LinearProgressIndicator(value: progress),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            children: [
                              ('all', 'All'),
                              ('daily', 'Daily'),
                              ('weekly', 'Weekly'),
                              ('monthly', 'Monthly'),
                            ]
                                .map(
                                  (item) => FilterChip(
                                    label: Text(item.$2),
                                    selected: _filter == item.$1,
                                    onSelected: (_) => setState(() => _filter = item.$1),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (visibleHabits.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.checklist_rounded, size: 54, color: colorScheme.outline),
                            const SizedBox(height: 10),
                            const Text('No habits found for this filter.'),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    SliverList.builder(
                      itemCount: pending.length,
                      itemBuilder: (context, index) => _HabitTile(
                        habit: pending[index],
                        checked: false,
                        streak: _streaks[pending[index].id] ?? 0,
                        onToggle: (value) => _toggleHabit(pending[index], value),
                        onLongPress: () => _showActions(pending[index]),
                        dotColor: _parseColor(pending[index].color, colorScheme.primary),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Text(
                          'Completed (${completed.length})',
                          style: theme.textTheme.titleMedium?.copyWith(color: colorScheme.outline),
                        ),
                      ),
                    ),
                    SliverList.builder(
                      itemCount: completed.length,
                      itemBuilder: (context, index) => Opacity(
                        opacity: 0.7,
                        child: _HabitTile(
                          habit: completed[index],
                          checked: true,
                          streak: _streaks[completed[index].id] ?? 0,
                          onToggle: (value) => _toggleHabit(completed[index], value),
                          onLongPress: () => _showActions(completed[index]),
                          dotColor: _parseColor(completed[index].color, colorScheme.primary),
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 24)),
                  ],
                ],
              ),
            ),
    );
  }
}

class _HabitTile extends StatelessWidget {
  const _HabitTile({
    required this.habit,
    required this.checked,
    required this.streak,
    required this.onToggle,
    required this.onLongPress,
    required this.dotColor,
  });

  final Habit habit;
  final bool checked;
  final int streak;
  final ValueChanged<bool> onToggle;
  final VoidCallback onLongPress;
  final Color dotColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        elevation: 0,
        color: colorScheme.surfaceVariant,
        child: ListTile(
          onTap: () => onToggle(!checked),
          onLongPress: onLongPress,
          leading: Icon(Icons.circle, color: dotColor, size: 24),
          title: Text(habit.name, style: theme.textTheme.titleMedium),
          subtitle: Wrap(
            spacing: 8,
            children: [
              Chip(label: Text(habit.frequency.toUpperCase())),
              Chip(label: Text('🔥 $streak day streak')),
            ],
          ),
          trailing: GestureDetector(
            onTap: () => onToggle(!checked),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: checked ? dotColor : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: checked ? dotColor : colorScheme.outline),
              ),
              child: checked ? Icon(Icons.check, color: colorScheme.onPrimary) : null,
            ),
          ),
        ),
      ),
    );
  }
}
