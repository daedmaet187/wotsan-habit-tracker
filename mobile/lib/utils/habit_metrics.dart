import 'package:intl/intl.dart';

import '../models/habit.dart';

class HabitMetrics {
  static Map<String, Set<String>> logsByDateByHabit(Map<String, List<dynamic>> recentLogs) {
    final map = <String, Set<String>>{};
    for (final entry in recentLogs.entries) {
      for (final item in entry.value) {
        final row = Map<String, dynamic>.from(item as Map);
        final habitId = row['habit_id']?.toString();
        if (habitId == null) continue;
        map.putIfAbsent(habitId, () => <String>{}).add(entry.key);
      }
    }
    return map;
  }

  static Map<String, int> streaksForHabits(
    List<Habit> habits,
    Map<String, Set<String>> logsByDateByHabit,
    int lookbackDays,
  ) {
    final formatter = DateFormat('yyyy-MM-dd');
    final today = DateTime.now();
    final result = <String, int>{};

    for (final habit in habits) {
      final habitLogs = logsByDateByHabit[habit.id] ?? <String>{};
      var streak = 0;
      for (var i = 0; i < lookbackDays; i++) {
        final date = formatter.format(today.subtract(Duration(days: i)));
        if (!habitLogs.contains(date)) break;
        streak++;
      }
      result[habit.id] = streak;
    }

    return result;
  }

  static int weeklyCompletionRate({
    required List<Habit> habits,
    required Map<String, Set<String>> logsByDateByHabit,
  }) {
    if (habits.isEmpty) return 0;
    final formatter = DateFormat('yyyy-MM-dd');
    final today = DateTime.now();
    var done = 0;
    for (var i = 0; i < 7; i++) {
      final date = formatter.format(today.subtract(Duration(days: i)));
      for (final habit in habits) {
        if ((logsByDateByHabit[habit.id] ?? <String>{}).contains(date)) {
          done++;
        }
      }
    }
    final total = habits.length * 7;
    return total == 0 ? 0 : ((done / total) * 100).round();
  }
}
