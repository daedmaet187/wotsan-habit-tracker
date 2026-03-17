class HabitLog {
  final String id;
  final String habitId;
  final String userId;
  final DateTime loggedDate;
  final String? note;

  HabitLog({
    required this.id,
    required this.habitId,
    required this.userId,
    required this.loggedDate,
    this.note,
  });

  factory HabitLog.fromJson(Map<String, dynamic> json) {
    return HabitLog(
      id: json['id'] as String,
      habitId: json['habit_id'] as String,
      userId: json['user_id'] as String,
      loggedDate: DateTime.parse(json['logged_date'] as String),
      note: json['note'] as String?,
    );
  }
}
