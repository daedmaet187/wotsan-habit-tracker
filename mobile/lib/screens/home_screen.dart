import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../models/habit.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/habit_metrics.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _apiService = ApiService();
  final _authService = AuthService();
  late final ConfettiController _confettiController;

  bool _isLoading = true;
  List<Habit> _habits = [];
  Set<String> _loggedToday = <String>{};
  Map<String, String> _logIdsByHabit = <String, String>{};
  Map<String, int> _streaks = <String, int>{};
  String _filter = 'all';
  String _userName = '';
  bool _allDoneConfettiFired = false;

  String get _today => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _todayPretty => DateFormat('EEEE, MMMM d').format(DateTime.now());

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));
    _loadData();
    _loadUserName();
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _loadUserName() async {
    final name = await _authService.getFullName();
    if (mounted) setState(() => _userName = name.isNotEmpty ? name.split(' ').first : 'there');
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
        _allDoneConfettiFired = false;
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
    HapticFeedback.mediumImpact();

    // Optimistic update — reflect change immediately without a loading spinner
    final previousLogged = Set<String>.from(_loggedToday);
    final previousLogIds = Map<String, String>.from(_logIdsByHabit);

    setState(() {
      if (checked) {
        _loggedToday.add(habit.id);
        // Placeholder id — replaced after API response
        _logIdsByHabit[habit.id] = '__pending__';
      } else {
        _loggedToday.remove(habit.id);
        _logIdsByHabit.remove(habit.id);
      }
    });

    try {
      if (!checked) {
        final logId = previousLogIds[habit.id];
        if (logId == null || logId == '__pending__') return;
        await _apiService.deleteLog(logId);
      } else {
        final result = await _apiService.logHabit(habit.id, _today);
        final logId = result['id']?.toString();
        if (mounted && logId != null) {
          setState(() => _logIdsByHabit[habit.id] = logId);
        }
      }

      // Fire confetti if all habits done
      if (mounted) {
        final allDone = _habits.isNotEmpty && _habits.every((h) => _loggedToday.contains(h.id));
        if (allDone && !_allDoneConfettiFired) {
          _allDoneConfettiFired = true;
          _confettiController.play();
        }
      }
    } catch (_) {
      // Roll back optimistic update on failure
      if (!mounted) return;
      setState(() {
        _loggedToday
          ..clear()
          ..addAll(previousLogged);
        _logIdsByHabit
          ..clear()
          ..addAll(previousLogIds);
      });
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
    final parsed = int.tryParse(buffer.toString(), radix: 16);
    return parsed != null ? Color(parsed) : fallback;
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

  String _motivationalText(double progress) {
    if (progress == 0.0) return 'Let\'s get started! 💪';
    if (progress < 0.33) return 'You\'re on your way!';
    if (progress < 0.66) return 'Halfway there, keep going! 🚀';
    if (progress < 1.0) return 'Almost done, you\'re crushing it!';
    return 'Perfect day! All habits complete! 🎉';
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
      body: Stack(
        children: [
          _isLoading
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
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$_greeting, $_userName! 👋',
                                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                              ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0),
                              const SizedBox(height: 20),
                              // Circular progress
                              Center(
                                child: SizedBox(
                                  width: 120,
                                  height: 120,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      CircularProgressIndicator(
                                        value: progress,
                                        strokeWidth: 10,
                                        backgroundColor: colorScheme.surfaceContainerHighest,
                                        valueColor: AlwaysStoppedAnimation<Color>(
                                          progress == 1.0 ? Colors.green : colorScheme.primary,
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 14),
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            FittedBox(
                                              fit: BoxFit.scaleDown,
                                              child: Text(
                                                '$doneCount/${visibleHabits.length}',
                                                style: theme.textTheme.titleLarge?.copyWith(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                                maxLines: 1,
                                              ),
                                            ),
                                            Text(
                                              'done',
                                              style: theme.textTheme.bodySmall?.copyWith(
                                                color: colorScheme.onSurfaceVariant,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ).animate().fadeIn(duration: 500.ms, delay: 100.ms).scale(begin: const Offset(0.8, 0.8)),
                              const SizedBox(height: 12),
                              Center(
                                child: Text(
                                  _motivationalText(progress),
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ).animate().fadeIn(duration: 400.ms, delay: 200.ms),
                              ),
                              const SizedBox(height: 16),
                              // Filter chips
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    ('all', 'All'),
                                    ('daily', 'Daily'),
                                    ('weekly', 'Weekly'),
                                    ('monthly', 'Monthly'),
                                  ]
                                      .map(
                                        (item) => Padding(
                                          padding: const EdgeInsets.only(right: 8),
                                          child: FilterChip(
                                            label: Text(item.$2),
                                            selected: _filter == item.$1,
                                            onSelected: (_) => setState(() => _filter = item.$1),
                                          ),
                                        ),
                                      )
                                      .toList(),
                                ),
                              ).animate().fadeIn(duration: 400.ms, delay: 300.ms),
                              const SizedBox(height: 8),
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
                            animationDelay: Duration(milliseconds: 50 * index),
                          ),
                        ),
                        if (completed.isNotEmpty) ...[
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
                                animationDelay: Duration(milliseconds: 50 * index + 100),
                              ),
                            ),
                          ),
                        ],
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],
                    ],
                  ),
                ),
          // Confetti widget anchored at top center
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              numberOfParticles: 30,
              colors: const [
                Colors.green,
                Colors.blue,
                Colors.pink,
                Colors.orange,
                Colors.purple,
              ],
            ),
          ),
        ],
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
    this.animationDelay = Duration.zero,
  });

  final Habit habit;
  final bool checked;
  final int streak;
  final ValueChanged<bool> onToggle;
  final VoidCallback onLongPress;
  final Color dotColor;
  final Duration animationDelay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        elevation: 0,
        color: colorScheme.surfaceContainerLow,
        clipBehavior: Clip.hardEdge,
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Colored left border strip (4px)
              Container(width: 4, color: dotColor),
              // Tile content
              Expanded(
                child: ListTile(
                  onTap: () => onToggle(!checked),
                  onLongPress: onLongPress,
                  title: Text(
                    habit.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      decoration: checked ? TextDecoration.lineThrough : null,
                      color: checked ? colorScheme.onSurface.withValues(alpha: 0.5) : null,
                    ),
                  ),
                  subtitle: Row(
                    children: [
                      Text(
                        '🔥 $streak',
                        style: theme.textTheme.bodySmall,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: colorScheme.secondaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          habit.frequency.toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSecondaryContainer,
                          ),
                        ),
                      ),
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
                      child: checked
                          ? Icon(Icons.check, color: colorScheme.onPrimary, size: 18)
                          : null,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 350.ms, delay: animationDelay)
        .slideX(begin: -0.1, end: 0, duration: 350.ms, delay: animationDelay);
  }
}
