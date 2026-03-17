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

  String get _today => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _todayPretty => DateFormat('EEE, MMM d').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final habitsRes = await _apiService.getHabits();
      final logsRes = await _apiService.getLogsByDate(_today);

      setState(() {
        _habits = habitsRes
            .map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map)))
            .where((h) => h.isActive)
            .toList();
        _loggedToday = logsRes
            .map((e) => Map<String, dynamic>.from(e as Map)['habit_id'].toString())
            .toSet();
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
    if (!checked) {
      setState(() => _loggedToday.remove(habit.id));
      return;
    }

    try {
      await _apiService.logHabit(habit.id, _today);
      if (!mounted) return;
      setState(() => _loggedToday.add(habit.id));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update habit log.')),
      );
    }
  }

  Future<void> _quickAddHabit() async {
    final nameController = TextEditingController();
    String frequency = 'daily';

    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Quick Add Habit', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Habit name'),
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'daily', label: Text('Daily')),
                      ButtonSegment(value: 'weekly', label: Text('Weekly')),
                    ],
                    selected: {frequency},
                    onSelectionChanged: (selection) {
                      setModalState(() => frequency = selection.first);
                    },
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      if (nameController.text.trim().isEmpty) {
                        return;
                      }
                      Navigator.pop(context, true);
                    },
                    child: const Text('Save'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (created != true || nameController.text.trim().isEmpty) return;

    try {
      await _apiService.createHabit({
        'name': nameController.text.trim(),
        'frequency': frequency,
        'target_days': frequency == 'weekly' ? 3 : 1,
      });
      await _loadData();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to create habit.')),
      );
    }
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  Color _parseColor(String hex, Color fallback) {
    final normalized = hex.replaceAll('#', '');
    final buffer = StringBuffer();
    if (normalized.length == 6) {
      buffer.write('ff');
    }
    buffer.write(normalized);
    return Color(int.tryParse(buffer.toString(), radix: 16) ?? fallback.value);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Today'),
            Text(
              _todayPretty,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: _habits.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 180),
                        Center(child: Text('No habits yet. Tap + to create your first one.')),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _habits.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final habit = _habits[index];
                        final checked = _loggedToday.contains(habit.id);
                        final dotColor = _parseColor(habit.color, colorScheme.primary);

                        return Card(
                          child: ListTile(
                            onTap: () => _toggleHabit(habit, !checked),
                            leading: CircleAvatar(
                              radius: 8,
                              backgroundColor: dotColor,
                            ),
                            title: Text(habit.name),
                            subtitle: Wrap(
                              spacing: 8,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(habit.frequency),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: colorScheme.secondaryContainer,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    habit.frequency,
                                    style: Theme.of(context).textTheme.labelSmall,
                                  ),
                                ),
                              ],
                            ),
                            trailing: Checkbox(
                              value: checked,
                              onChanged: (value) => _toggleHabit(habit, value ?? false),
                            ),
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _quickAddHabit,
        icon: const Icon(Icons.add),
        label: const Text('Quick Add'),
      ),
    );
  }
}
