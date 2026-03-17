import 'package:flutter/material.dart';

import '../models/habit.dart';
import '../services/api_service.dart';

class HabitsScreen extends StatefulWidget {
  const HabitsScreen({super.key});

  @override
  State<HabitsScreen> createState() => _HabitsScreenState();
}

class _HabitsScreenState extends State<HabitsScreen> {
  final _apiService = ApiService();

  bool _isLoading = true;
  List<Habit> _habits = [];

  @override
  void initState() {
    super.initState();
    _loadHabits();
  }

  Future<void> _loadHabits() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.getHabits();
      setState(() {
        _habits = response.map((e) => Habit.fromJson(Map<String, dynamic>.from(e as Map))).toList();
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
    final frequencyController = TextEditingController(text: habit?.frequency ?? 'daily');

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(habit == null ? 'Add Habit' : 'Edit Habit'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: frequencyController,
                decoration: const InputDecoration(labelText: 'Frequency'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
          ],
        );
      },
    );

    if (saved != true) return;

    final payload = {
      'name': nameController.text.trim(),
      'frequency': frequencyController.text.trim().isEmpty ? 'daily' : frequencyController.text.trim(),
      'target_days': 1,
      'color': habit?.color ?? '#6366f1',
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save habit.')),
      );
    }
  }

  Future<void> _deleteHabit(Habit habit) async {
    try {
      await _apiService.deleteHabit(habit.id);
      await _loadHabits();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to delete habit.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('All Habits')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHabits,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _habits.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final habit = _habits[index];
                  return Card(
                    child: ListTile(
                      title: Text(habit.name),
                      subtitle: Text('Frequency: ${habit.frequency}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => _upsertHabit(habit: habit),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => _deleteHabit(habit),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _upsertHabit(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
