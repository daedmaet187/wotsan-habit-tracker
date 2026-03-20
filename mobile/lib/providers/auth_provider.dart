import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/auth_service.dart';
import 'api_provider.dart';

/// Provides a singleton [AuthService] instance (re-uses the shared ApiService).
final authServiceProvider = Provider<AuthService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return AuthService(apiService: apiService);
});

/// Tracks whether the user is currently authenticated.
/// Exposed as an [AsyncNotifierProvider] so callers can await the first check.
final authStateProvider =
    AsyncNotifierProvider<AuthNotifier, bool>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<bool> {
  @override
  Future<bool> build() async {
    final auth = ref.read(authServiceProvider);
    return auth.isLoggedIn();
  }

  Future<void> refresh() async {
    final auth = ref.read(authServiceProvider);
    state = AsyncData(await auth.isLoggedIn());
  }
}
