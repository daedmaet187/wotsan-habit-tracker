import 'dart:convert';

import 'package:flutter/material.dart';

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
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Profile', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 12),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.account_circle_outlined),
                      title: Text('User ID: ${_claims['id'] ?? 'Unknown'}'),
                      subtitle: Text('Role: ${_claims['role'] ?? 'user'}'),
                    ),
                  ),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.calendar_month_outlined),
                      title: const Text('Member Since'),
                      subtitle: Text(issuedAt == null ? 'Unknown' : '${issuedAt.year}-${issuedAt.month}-${issuedAt.day}'),
                    ),
                  ),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.verified_outlined),
                      title: const Text('App Version'),
                      subtitle: Text(appVersion),
                    ),
                  ),
                  const SizedBox(height: 12),
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
                  FilledButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout),
                    label: const Text('Logout'),
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
            Text(value, style: Theme.of(context).textTheme.titleMedium),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
