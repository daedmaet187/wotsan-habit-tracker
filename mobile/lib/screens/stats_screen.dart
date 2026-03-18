import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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
    final colorScheme = theme.colorScheme;
    final best = _streaks.values.isEmpty ? 0 : _streaks.values.reduce((a, b) => a > b ? a : b);
    final completionRate = HabitMetrics.weeklyCompletionRate(
      habits: _habits,
      logsByDateByHabit: _logsByHabit,
    );
    final top5 = (_streaks.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(5).toList();

    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    Text('Stats', style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 12),
                    // 3 stat cards
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            label: 'Total Habits',
                            value: '${_habits.length}',
                            icon: Icons.list_alt_rounded,
                            color: Colors.blue,
                          ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.3, end: 0),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatCard(
                            label: 'Best Streak',
                            value: '$best',
                            icon: Icons.local_fire_department_rounded,
                            color: Colors.orange,
                          ).animate().fadeIn(duration: 400.ms, delay: 100.ms).slideY(begin: 0.3, end: 0),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatCard(
                            label: 'Week Rate',
                            value: '$completionRate%',
                            icon: Icons.trending_up_rounded,
                            color: Colors.green,
                          ).animate().fadeIn(duration: 400.ms, delay: 200.ms).slideY(begin: 0.3, end: 0),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // 30-day heatmap
                    Text('30-Day Activity', style: theme.textTheme.titleMedium),
                    const SizedBox(height: 8),
                    _HeatmapGrid(
                      habits: _habits,
                      logsByHabit: _logsByHabit,
                      primaryColor: colorScheme.primary,
                    ).animate().fadeIn(duration: 500.ms, delay: 300.ms),
                    const SizedBox(height: 24),
                    // BarChart
                    if (_habits.isNotEmpty) ...[
                      Text('Habit Completion %', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 200,
                        child: _HabitBarChart(
                          habits: _habits,
                          logsByHabit: _logsByHabit,
                          primaryColor: colorScheme.primary,
                        ),
                      ).animate().fadeIn(duration: 500.ms, delay: 400.ms),
                      const SizedBox(height: 24),
                    ],
                    // Streak leaderboard
                    Text('Streak Leaders', style: theme.textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (top5.isEmpty)
                      const ListTile(
                        leading: Icon(Icons.insights_outlined),
                        title: Text('No habits yet.'),
                      )
                    else
                      ...top5.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final e = entry.value;
                        final matching = _habits.where((h) => h.id == e.key);
                        final name = matching.isEmpty ? 'Unknown' : matching.first.name;
                        final maxStreak = best > 0 ? best : 1;
                        final ratio = e.value / maxStreak;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text('${idx + 1}. ', style: theme.textTheme.bodySmall),
                                  Expanded(
                                    child: Text(
                                      name,
                                      style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    '🔥 ${e.value}d',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              TweenAnimationBuilder<double>(
                                tween: Tween(begin: 0.0, end: ratio),
                                duration: Duration(milliseconds: 600 + idx * 100),
                                builder: (context, val, _) => LinearProgressIndicator(
                                  value: val,
                                  backgroundColor: colorScheme.surfaceContainerHighest,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    colorScheme.primary,
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(duration: 400.ms, delay: Duration(milliseconds: 500 + idx * 80)),
                        );
                      }),
                  ],
                ),
              ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _HeatmapGrid extends StatelessWidget {
  const _HeatmapGrid({
    required this.habits,
    required this.logsByHabit,
    required this.primaryColor,
  });

  final List<Habit> habits;
  final Map<String, Set<String>> logsByHabit;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('yyyy-MM-dd');
    final today = DateTime.now();
    final days = List.generate(30, (i) => today.subtract(Duration(days: 29 - i)));

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: days.map((day) {
        final key = formatter.format(day);
        int doneCount = 0;
        for (final habit in habits) {
          if ((logsByHabit[habit.id] ?? <String>{}).contains(key)) {
            doneCount++;
          }
        }
        final ratio = habits.isEmpty ? 0.0 : (doneCount / habits.length).clamp(0.0, 1.0);
        final opacity = ratio == 0 ? 0.08 : (0.2 + ratio * 0.8).clamp(0.2, 1.0);

        return Tooltip(
          message: '${DateFormat('MMM d').format(day)}: $doneCount/${habits.length}',
          child: Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: opacity),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _HabitBarChart extends StatelessWidget {
  const _HabitBarChart({
    required this.habits,
    required this.logsByHabit,
    required this.primaryColor,
  });

  final List<Habit> habits;
  final Map<String, Set<String>> logsByHabit;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final barGroups = habits.asMap().entries.map((entry) {
      final idx = entry.key;
      final habit = entry.value;
      final daysDone = (logsByHabit[habit.id] ?? <String>{}).length;
      final pct = (daysDone / 30.0).clamp(0.0, 1.0) * 100;
      return BarChartGroupData(
        x: idx,
        barRods: [
          BarChartRodData(
            toY: pct,
            color: primaryColor,
            width: 16,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      );
    }).toList();

    return BarChart(
      BarChartData(
        maxY: 100,
        barGroups: barGroups,
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (val, meta) => Text(
                '${val.toInt()}%',
                style: const TextStyle(fontSize: 10),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (val, meta) {
                final idx = val.toInt();
                if (idx < 0 || idx >= habits.length) return const SizedBox.shrink();
                final name = habits[idx].name;
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    name.length > 6 ? name.substring(0, 6) : name,
                    style: const TextStyle(fontSize: 9),
                  ),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: const FlGridData(show: true),
        borderData: FlBorderData(show: false),
      ),
    );
  }
}
