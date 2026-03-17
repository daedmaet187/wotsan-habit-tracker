import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://habit-api.stuff187.com',
  );

  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {'email': email, 'password': password});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> register(String email, String password, String fullName) async {
    final res = await _dio.post(
      '/api/auth/register',
      data: {'email': email, 'password': password, 'full_name': fullName},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> getHabits() async {
    final res = await _dio.get('/api/habits');
    return List<dynamic>.from(res.data as List);
  }

  Future<Map<String, dynamic>> createHabit(Map<String, dynamic> payload) async {
    final res = await _dio.post('/api/habits', data: payload);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> updateHabit(String id, Map<String, dynamic> payload) async {
    final res = await _dio.put('/api/habits/$id', data: payload);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> deleteHabit(String id) async {
    await _dio.delete('/api/habits/$id');
  }

  Future<void> logHabit(String habitId, String date) async {
    await _dio.post('/api/logs', data: {'habit_id': habitId, 'logged_date': date});
  }

  Future<List<dynamic>> getLogsByDate(String date) async {
    final res = await _dio.get('/api/logs', queryParameters: {'date': date});
    return List<dynamic>.from(res.data as List);
  }
}
