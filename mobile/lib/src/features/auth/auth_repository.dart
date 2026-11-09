import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/dio_client.dart';
import '../../models/user.dart';

/// Thin REST client for the auth endpoints. Token storage is handled by the
/// Dio interceptor + AuthController, not here.
class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  /// POST /api/auth/login -> { token }
  Future<String> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return res.data['token'] as String;
  }

  /// GET /api/auth/me -> user object. Token is attached by the interceptor.
  Future<User> me() async {
    final res = await _dio.get('/auth/me');
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(dioProvider)),
);
