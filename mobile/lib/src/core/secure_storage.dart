import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// JWT persistence. Replaces the web app's `localStorage` token with the
/// platform keystore (Android Keystore / iOS Keychain) via flutter_secure_storage.
class TokenStorage {
  TokenStorage(this._storage);

  static const _key = 'jwt';
  final FlutterSecureStorage _storage;

  Future<String?> read() => _storage.read(key: _key);
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  Future<void> clear() => _storage.delete(key: _key);
}

final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => TokenStorage(const FlutterSecureStorage()),
);
