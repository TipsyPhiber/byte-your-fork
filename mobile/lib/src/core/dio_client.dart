import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart'; // StateProvider (Riverpod 3.x legacy)

import '../config/env.dart';
import 'secure_storage.dart';

/// Signalled by the JWT interceptor when the backend returns 401 (expired/invalid
/// token — the API uses a 30m expiry). The auth controller listens and logs out.
final unauthorizedProvider = StateProvider<int>((ref) => 0);

/// Shared Dio instance: base URL from [Env], plus an interceptor that attaches
/// the stored JWT as `Authorization: Bearer <token>` and traps 401s.
final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);

  final dio = Dio(BaseOptions(
    baseUrl: Env.apiUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await storage.read();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (e, handler) {
      if (e.response?.statusCode == 401) {
        // Bump the counter; AuthController watches it and tears down the session.
        ref.read(unauthorizedProvider.notifier).state++;
      }
      handler.next(e);
    },
  ));

  return dio;
});
