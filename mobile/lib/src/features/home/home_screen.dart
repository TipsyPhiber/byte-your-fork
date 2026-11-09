import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';

/// Phase-0 landing screen: proves the round trip by rendering the user fetched
/// from /api/auth/me. Real dashboard feed arrives in Phase 2.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Byte Your Fork'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: Center(
        child: user == null
            ? const CircularProgressIndicator()
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Signed in ✓',
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Text('id: ${user.id}'),
                  Text('email: ${user.email}'),
                  Text('username: ${user.username ?? "—"}'),
                  Text('role: ${user.role}'),
                  Text('preferences: ${user.preferences.join(", ")}'),
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: () => context.go('/voice'),
                    icon: const Icon(Icons.mic),
                    label: const Text('Voice prototype'),
                  ),
                ],
              ),
      ),
    );
  }
}
