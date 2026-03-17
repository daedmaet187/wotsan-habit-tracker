import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/habit.dart';
import '../services/api_service.dart';
import '../utils/habit_metrics.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  final _api = ApiService();
  bool _loading = true;
  List<Habit> _habits = [];
  Map<String, Set<String>> _logsByHabit = {};
  Map<String, int> _streaks = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final habitsRes = await _api.getHabits();
      final habits = habitsRes
          .map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((h) => h.isActive)
          .toList();
      final recentLogs = await _api.getRecentLogs(30);
      final logsByHabit = HabitMetrics.logsByDateByHabit(recentLogs);
      setState(() {
        _habits = habits;
        _logsByHabit = logsByHabit;
        _streaks = HabitMetrics.streaksForHabits(habits, logsByHabit, 30);
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load stats.')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final best = _streaks.values.isEmpty ? 0 : _streaks.values.reduce((a, b) => a > b ? a : b);
    final completionRate = HabitMetrics.weeklyCompletionRate(habits: _habits, logsByDateByHabit: _logsByHabit);
    final top3 = _streaks.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Stats', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _StatCard(label: 'Total Habits', value: '${_habits.length}')),
                      const SizedBox(width: 8),
                      Expanded(child: _StatCard(label: 'Best Streak', value: '$best')),
                      const SizedBox(width: 8),
                      Expanded(child: _StatCard(label: 'Week Rate', value: '$completionRate%')),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text('Weekly Heatmap', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  _WeeklyHeatmap(habits: _habits, logsByHabit: _logsByHabit),
                  const SizedBox(height: 18),
                  Text('30-day Completion', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (_habits.isEmpty)
                    const ListTile(
                      leading: Icon(Icons.insights_outlined),
                      title: Text('No habits yet. Create one to see analytics.'),
                    )
                  else
                    ..._habits.map((habit) {
                      final daysDone = (_logsByHabit[habit.id] ?? <String>{}).length;
                      final percent = (daysDone / 30).clamp(0.0, 1.0);
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${habit.name} ${(percent * 100).round()}%'),
                            const SizedBox(height: 4),
                            LinearProgressIndicator(value: percent),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 18),
                  Text('Best Streak Habits', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  ...top3.take(3).map((entry) {
                    final matching = _habits.where((h) => h.id == entry.key);
                    final habitName = matching.isEmpty ? 'Unknown' : matching.first.name;
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.local_fire_department_outlined),
                      title: Text(habitName),
                      trailing: Text('${entry.value} days'),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _WeeklyHeatmap extends StatelessWidget {
  const _WeeklyHeatmap({required this.habits, required this.logsByHabit});

  final List<Habit> habits;
  final Map<String, Set<String>> logsByHabit;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('yyyy-MM-dd');
    final today = DateTime.now();
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: List.generate(7, (i) {
        final date = today.subtract(Duration(days: 6 - i));
        final key = formatter.format(date);
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              SizedBox(width: 44, child: Text(DateFormat('E').format(date))),
              Expanded(
                child: Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: habits.map((habit) {
                    final done = (logsByHabit[habit.id] ?? <String>{}).contains(key);
                    return Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: done ? colorScheme.primary : colorScheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}
