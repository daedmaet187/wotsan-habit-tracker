class HabitLog {
  final String id;
  final String habitId;
  final String userId;
  final DateTime loggedDate;
  final String? note;
  final DateTime createdAt;
  final String? name;
  final String? color;
  final String? icon;

  const HabitLog({
    required this.id,
    required this.habitId,
    required this.userId,
    required this.loggedDate,
    this.note,
    required this.createdAt,
    this.name,
    this.color,
    this.icon,
  });

  factory HabitLog.fromJson(Map<String, dynamic> json) {
    return HabitLog(
      id: (json['id'] ?? '').toString(),
      habitId: (json['habit_id'] ?? '').toString(),
      userId: (json['user_id'] ?? '').toString(),
      loggedDate: DateTime.tryParse((json['logged_date'] ?? '').toString()) ?? DateTime.now(),
      note: json['note'] as String?,
      createdAt: DateTime.tryParse((json['created_at'] ?? '').toString()) ?? DateTime.now(),
      name: json['name'] as String?,
      color: json['color'] as String?,
      icon: json['icon'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'habit_id': habitId,
      'user_id': userId,
      'logged_date': loggedDate.toIso8601String(),
      'note': note,
      'created_at': createdAt.toIso8601String(),
      'name': name,
      'color': color,
      'icon': icon,
    };
  }
}
