class Habit {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final String color;
  final String? icon;
  final String frequency;
  final int targetDays;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Habit({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.color,
    this.icon,
    required this.frequency,
    required this.targetDays,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Habit.fromJson(Map<String, dynamic> json) => Habit(
        id: (json['id'] ?? '').toString(),
        userId: (json['user_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        description: json['description'] as String?,
        color: (json['color'] ?? '#6366f1').toString(),
        icon: json['icon'] as String?,
        frequency: (json['frequency'] ?? 'daily').toString(),
        targetDays: (json['target_days'] as num?)?.toInt() ?? 1,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: DateTime.tryParse((json['created_at'] ?? '').toString()) ?? DateTime.now(),
        updatedAt: DateTime.tryParse((json['updated_at'] ?? '').toString()) ??
            DateTime.tryParse((json['created_at'] ?? '').toString()) ??
            DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'description': description,
        'color': color,
        'icon': icon,
        'frequency': frequency,
        'target_days': targetDays,
        'is_active': isActive,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
