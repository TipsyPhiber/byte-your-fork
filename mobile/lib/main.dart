import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/router/app_router.dart';
import 'src/theme/app_theme.dart';

void main() => runApp(const ProviderScope(child: ByteYourForkApp()));

class ByteYourForkApp extends ConsumerWidget {
  const ByteYourForkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Byte Your Fork',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
