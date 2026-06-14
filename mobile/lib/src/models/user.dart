/// Mirrors the JSON returned by `GET /api/auth/me`. Only the fields Phase 0
/// needs are mapped; expand as later phases consume more of the payload.
class User {
  const User({
    required this.id,
    required this.email,
    required this.username,
    required this.firstName,
    required this.role,
    required this.preferences,
  });

  final int id;
  final String email;
  final String? username;
  final String? firstName;
  final String role; // 'admin' | 'user'
  final List<String> preferences;

  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        email: json['email'] as String? ?? '',
        username: json['username'] as String?,
        firstName: json['first_name'] as String?,
        role: json['role'] as String? ?? 'user',
        preferences:
            (json['preferences'] as List?)?.cast<String>() ?? const [],
      );
}
