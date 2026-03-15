import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const baseUrl = String.fromEnvironment('API_URL', defaultValue: 'https://habit-api.stuff187.com');
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  // ... other methods omitted for brevity ...
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {'email': email, 'password': password});
    return res.data;
  }

  Future<List<dynamic>> getHabits() async {
    final res = await _dio.get('/api/habits');
    return res.data;
  }

  Future<void> logHabit(String habitId, String date) async {
    await _dio.post('/api/logs', data: {'habit_id': habitId, 'logged_date': date});
  }
}
