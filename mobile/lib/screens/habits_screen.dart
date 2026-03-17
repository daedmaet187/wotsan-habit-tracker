import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';

import '../models/habit.dart';
import '../services/api_service.dart';

class HabitsScreen extends StatefulWidget {
  const HabitsScreen({super.key});

  @override
  State<HabitsScreen> createState() => _HabitsScreenState();
}

class _HabitsScreenState extends State<HabitsScreen> {
  final _apiService = ApiService();
  final List<String> _presetColors = const [
    '#6366f1',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#a855f7',
  ];

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
    final descriptionController = TextEditingController(text: habit?.description ?? '');
    final targetDaysController = TextEditingController(text: (habit?.targetDays ?? 1).toString());
    String frequency = habit?.frequency ?? 'daily';
    String selectedColor = habit?.color ?? _presetColors.first;

    final saved = await showModalBottomSheet<bool>(
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
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      habit == null ? 'Add Habit' : 'Edit Habit',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: descriptionController,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Description (optional)'),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _presetColors.map((hex) {
                        final isSelected = selectedColor == hex;
                        return InkWell(
                          onTap: () => setModalState(() => selectedColor = hex),
                          borderRadius: BorderRadius.circular(999),
                          child: CircleAvatar(
                            radius: isSelected ? 16 : 14,
                            backgroundColor: _parseColor(hex),
                            child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: frequency,
                      decoration: const InputDecoration(labelText: 'Frequency'),
                      items: const [
                        DropdownMenuItem(value: 'daily', child: Text('Daily')),
                        DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                        DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                      ],
                      onChanged: (value) {
                        if (value != null) setModalState(() => frequency = value);
                      },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: targetDaysController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Target days'),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        if (nameController.text.trim().isEmpty) return;
                        Navigator.pop(context, true);
                      },
                      child: const Text('Save'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (saved != true) return;

    final payload = {
      'name': nameController.text.trim(),
      'description': descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
      'frequency': frequency,
      'target_days': int.tryParse(targetDaysController.text.trim()) ?? 1,
      'color': selectedColor,
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

  Color _parseColor(String hex) {
    final normalized = hex.replaceAll('#', '');
    final buffer = StringBuffer();
    if (normalized.length == 6) buffer.write('ff');
    buffer.write(normalized);
    return Color(int.tryParse(buffer.toString(), radix: 16) ?? 0xff6366f1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('All Habits')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHabits,
              child: _habits.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 180),
                        Center(child: Text('No habits yet. Add one to get started.')),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _habits.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final habit = _habits[index];
                        return Slidable(
                          key: ValueKey(habit.id),
                          endActionPane: ActionPane(
                            motion: const DrawerMotion(),
                            children: [
                              SlidableAction(
                                onPressed: (_) => _deleteHabit(habit),
                                icon: Icons.delete_outline,
                                label: 'Delete',
                                backgroundColor: Theme.of(context).colorScheme.error,
                                foregroundColor: Theme.of(context).colorScheme.onError,
                              ),
                            ],
                          ),
                          child: Card(
                            child: ListTile(
                              onTap: () => _upsertHabit(habit: habit),
                              leading: CircleAvatar(backgroundColor: _parseColor(habit.color), radius: 8),
                              title: Text(habit.name),
                              subtitle: Text(
                                '${habit.frequency} • target ${habit.targetDays} • ${habit.isActive ? 'active' : 'inactive'}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
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
