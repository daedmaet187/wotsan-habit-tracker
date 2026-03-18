import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/habit.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/habit_metrics.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _auth = AuthService();
  final _api = ApiService();
  bool _loading = true;
  Map<String, dynamic> _claims = {};
  int _totalHabits = 0;
  int _bestStreak = 0;
  int _completionRate = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final token = await _auth.getToken();
      final claims = _decodeJwt(token ?? '');
      final habitsRes = await _api.getHabits();
      final habits = habitsRes
          .map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((h) => h.isActive)
          .toList();
      final recentLogs = await _api.getRecentLogs(30);
      final logsByHabit = HabitMetrics.logsByDateByHabit(recentLogs);
      final streaks = HabitMetrics.streaksForHabits(habits, logsByHabit, 30);

      setState(() {
        _claims = claims;
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

  Map<String, dynamic> _decodeJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return {};
      final payload = parts[1];
      final normalized = base64.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return Map<String, dynamic>.from(jsonDecode(decoded) as Map);
    } catch (_) {
      return {};
    }
  }

  Future<void> _logout() async {
    try {
      await _auth.logout();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
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

  @override
  Widget build(BuildContext context) {
    final issuedAt = (_claims['iat'] is int)
        ? DateTime.fromMillisecondsSinceEpoch((_claims['iat'] as int) * 1000)
        : null;
    final appVersion = const String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0+1');

    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  Text('Profile', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),

                  // Account info
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.account_circle_outlined),
                          title: Text('User ID: ${_claims['id'] ?? 'Unknown'}'),
                          subtitle: Text('Role: ${_claims['role'] ?? 'user'}'),
                        ),
                        ListTile(
                          leading: const Icon(Icons.calendar_month_outlined),
                          title: const Text('Member Since'),
                          subtitle: Text(
                            issuedAt == null
                                ? 'Unknown'
                                : '${issuedAt.year}-${issuedAt.month.toString().padLeft(2, '0')}-${issuedAt.day.toString().padLeft(2, '0')}',
                          ),
                        ),
                        ListTile(
                          leading: const Icon(Icons.verified_outlined),
                          title: const Text('App Version'),
                          subtitle: Text(appVersion),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Stats row
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

                  // Appearance section
                  Text(
                    'Appearance',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ValueListenableBuilder<ThemeMode>(
                    valueListenable: themeNotifier,
                    builder: (context, currentMode, _) {
                      return Card(
                        child: Column(
                          children: [
                            RadioListTile<ThemeMode>(
                              value: ThemeMode.light,
                              groupValue: currentMode,
                              onChanged: (v) => _setTheme(v!),
                              title: const Text('Light'),
                              secondary: const Icon(Icons.light_mode_outlined),
                            ),
                            RadioListTile<ThemeMode>(
                              value: ThemeMode.dark,
                              groupValue: currentMode,
                              onChanged: (v) => _setTheme(v!),
                              title: const Text('Dark'),
                              secondary: const Icon(Icons.dark_mode_outlined),
                            ),
                            RadioListTile<ThemeMode>(
                              value: ThemeMode.system,
                              groupValue: currentMode,
                              onChanged: (v) => _setTheme(v!),
                              title: const Text('System default'),
                              secondary: const Icon(Icons.brightness_auto_outlined),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 20),

                  // Logout
                  FilledButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout),
                    label: const Text('Logout'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                      foregroundColor: Theme.of(context).colorScheme.onError,
                    ),
                  ),
                ],
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
            Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
