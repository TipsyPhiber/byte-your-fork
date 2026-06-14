import 'package:flutter/material.dart';

/// Shared theme. Seed colour matches the voice spike's deep-orange so the app
/// keeps a consistent identity; dark mode toggle lands in Phase 6 (Settings).
class AppTheme {
  static ThemeData get light => ThemeData(
        colorSchemeSeed: Colors.deepOrange,
        useMaterial3: true,
        brightness: Brightness.light,
      );

  static ThemeData get dark => ThemeData(
        colorSchemeSeed: Colors.deepOrange,
        useMaterial3: true,
        brightness: Brightness.dark,
      );
}
