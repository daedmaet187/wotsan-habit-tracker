import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/habit.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _apiService = ApiService();
  final _authService = AuthService();

  bool _isLoading = true;
  List<Habit> _habits = [];
  Set<String> _loggedToday = <String>{};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  String get _today => DateFormat('yyyy-MM-dd').format(DateTime.now());

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final habitsRes = await _apiService.getHabits();
      final logsRes = await _apiService.getLogsByDate(_today);

      setState(() {
        _habits = habitsRes.map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map))).toList();
        _loggedToday = logsRes
            .map((e) => Map<String, dynamic>.from(e as Map)['habit_id'] as String)
            .toSet();
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

  Future<void> _toggleHabit(Habit habit, bool checked) async {
    if (!checked) {
      setState(() => _loggedToday.remove(habit.id));
      return;
    }

    try {
      await _apiService.logHabit(habit.id, _today);
      setState(() => _loggedToday.add(habit.id));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update habit log.')),
      );
    }
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Today's Habits"),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: _habits.isEmpty
                  ? const ListView(
                      children: [
                        SizedBox(height: 180),
                        Center(child: Text('No habits yet. Add your first one.')),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _habits.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final habit = _habits[index];
                        final checked = _loggedToday.contains(habit.id);
                        return Card(
                          child: CheckboxListTile(
                            value: checked,
                            onChanged: (value) => _toggleHabit(habit, value ?? false),
                            title: Text(habit.name),
                            subtitle: Text(habit.frequency),
                            controlAffinity: ListTileControlAffinity.trailing,
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/habits').then((_) => _loadData()),
        icon: const Icon(Icons.add),
        label: const Text('Add Habit'),
      ),
    );
  }
}
