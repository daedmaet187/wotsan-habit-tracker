import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/habit.dart';
import '../providers/api_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/habit_metrics.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final AuthService _auth;
  late final ApiService _api;

  bool _loading = true;
  String _fullName = '';
  String _email = '';
  String _role = 'user';
  int _totalHabits = 0;
  int _bestStreak = 0;
  int _completionRate = 0;

  @override
  void initState() {
    super.initState();
    _auth = ref.read(authServiceProvider);
    _api = ref.read(apiServiceProvider);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final fullName = await _auth.getFullName();
      final email = await _auth.getEmail();
      final habitsRes = await _api.getHabits();
      final habits = habitsRes
          .map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((h) => h.isActive)
          .toList();
      final recentLogs = await _api.getRecentLogs(30);
      final logsByHabit = HabitMetrics.logsByDateByHabit(recentLogs);
      final streaks = HabitMetrics.streaksForHabits(habits, logsByHabit, 30);

      String role = 'user';
      try {
        final me = await _api.getMe();
        role = me['role']?.toString() ?? 'user';
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _fullName = fullName;
        _email = email;
        _role = role;
        _totalHabits = habits.length;
        _bestStreak = streaks.values.isEmpty ? 0 : streaks.values.reduce((a, b) => a > b ? a : b);
        _completionRate = HabitMetrics.weeklyCompletionRate(habits: habits, logsByDateByHabit: logsByHabit);
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load profile.')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    try {
      await _auth.logout();
      if (!mounted) return;
      await ref.read(authStateProvider.notifier).refresh();
      if (mounted) context.go('/login');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to logout.')),
      );
    }
  }

  Future<void> _setTheme(ThemeMode mode) async {
    themeNotifier.value = mode;
    final prefs = await SharedPreferences.getInstance();
    if (mode == ThemeMode.dark) {
      await prefs.setString('theme_mode', 'dark');
    } else if (mode == ThemeMode.light) {
      await prefs.setString('theme_mode', 'light');
    } else {
      await prefs.remove('theme_mode');
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || name.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0+1');

    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    Text(
                      'Profile',
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 36,
                            backgroundColor: colorScheme.primaryContainer,
                            child: Text(
                              _initials(_fullName.isNotEmpty ? _fullName : _email),
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: colorScheme.onPrimaryContainer,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _fullName.isNotEmpty ? _fullName : 'No name set',
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _email,
                            style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                          ),
                          const SizedBox(height: 8),
                          Chip(
                            label: Text(_role.toUpperCase()),
                            backgroundColor: _role == 'admin'
                                ? colorScheme.primaryContainer
                                : colorScheme.secondaryContainer,
                            labelStyle: TextStyle(
                              color: _role == 'admin'
                                  ? colorScheme.onPrimaryContainer
                                  : colorScheme.onSecondaryContainer,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(child: _MiniStat(label: 'Total Habits', value: '$_totalHabits')),
                        const SizedBox(width: 8),
                        Expanded(child: _MiniStat(label: 'Best Streak', value: '$_bestStreak')),
                        const SizedBox(width: 8),
                        Expanded(child: _MiniStat(label: 'Week Rate', value: '$_completionRate%')),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.info_outline_rounded),
                        title: const Text('App Version'),
                        subtitle: const Text(appVersion),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Appearance',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ValueListenableBuilder<ThemeMode>(
                      valueListenable: themeNotifier,
                      builder: (context, currentMode, _) {
                        return SegmentedButton<ThemeMode>(
                          segments: const [
                            ButtonSegment(
                              value: ThemeMode.light,
                              label: Text('Light'),
                              icon: Icon(Icons.light_mode_outlined),
                            ),
                            ButtonSegment(
                              value: ThemeMode.dark,
                              label: Text('Dark'),
                              icon: Icon(Icons.dark_mode_outlined),
                            ),
                            ButtonSegment(
                              value: ThemeMode.system,
                              label: Text('Auto'),
                              icon: Icon(Icons.brightness_auto_outlined),
                            ),
                          ],
                          selected: {currentMode},
                          onSelectionChanged: (s) => _setTheme(s.first),
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                      style: FilledButton.styleFrom(
                        backgroundColor: colorScheme.error,
                        foregroundColor: colorScheme.onError,
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(label, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
