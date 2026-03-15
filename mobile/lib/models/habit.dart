class Habit {
  final String id;
  final String name;
  final String? description;
  final String color;
  final String? icon;
  final String frequency;
  final int targetDays;
  final DateTime createdAt;

  Habit({required this.id, required this.name, this.description, required this.color, this.icon, required this.frequency, required this.targetDays, required this.createdAt});

  factory Habit.fromJson(Map<String, dynamic> json) => Habit(
    id: json['id'], name: json['name'], description: json['description'], color: json['color'] ?? '#6366f1', icon: json['icon'],
    frequency: json['frequency'], targetDays: json['target_days'] as int, createdAt: DateTime.parse(json['created_at']),
  );
}