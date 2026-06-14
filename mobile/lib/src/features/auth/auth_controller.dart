import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/dio_client.dart';
import '../../core/secure_storage.dart';
import '../../models/user.dart';
import 'auth_repository.dart';

/// App-wide auth state. `null` data = signed out; non-null = signed in.
/// `loading` covers the initial token-restore on launch and login round-trips.
class AuthController extends AsyncNotifier<User?> {
  TokenStorage get _storage => ref.read(tokenStorageProvider);
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<User?> build() async {
    // A 401 anywhere in the app forces a logout.
    ref.listen(unauthorizedProvider, (_, _) => logout());

    final token = await _storage.read();
    if (token == null) return null;
    try {
      return await _repo.me();
    } catch (_) {
      // Stored token is stale/invalid — drop it and start signed out.
      await _storage.clear();
      return null;
    }
  }

  /// Email + password login, then hydrate the user from /me.
  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final token = await _repo.login(email, password);
      await _storage.write(token);
      return _repo.me();
    });
  }

  /// Phase-0 exit-criteria path: persist a pasted token and hit /me with it.
  Future<void> loginWithToken(String token) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _storage.write(token);
      return _repo.me();
    });
  }

  Future<void> logout() async {
    await _storage.clear();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, User?>(AuthController.new);
