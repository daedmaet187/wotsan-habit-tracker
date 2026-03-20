import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';

/// Provides a singleton [ApiService] instance for the whole app.
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
