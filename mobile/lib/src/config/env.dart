/// Build-time configuration, mirroring the React app's `.env.capacitor` /
/// `.env.production` split. Override per flavor with `--dart-define`, e.g.
///   flutter run --dart-define=API_BASE=http://10.0.2.2:5001
///   flutter build apk --dart-define=API_BASE=https://api.byteyourfork.com
///
/// Default targets the Android emulator: 10.0.2.2 is the host machine's
/// localhost as seen from inside the emulator (a plain `localhost` would point
/// at the emulated device itself). The backend listens on 5001.
class Env {
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://10.0.2.2:5001',
  );

  /// REST root. The backend mounts every router under `/api`.
  static String get apiUrl => '$apiBase/api';
}
