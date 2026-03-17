class User {
  final String id;
  final String email;
  final String? fullName;
  final String role;
  final DateTime? createdAt;

  User({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['full_name'] as String?,
      role: (json['role'] as String?) ?? 'user',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }
}
