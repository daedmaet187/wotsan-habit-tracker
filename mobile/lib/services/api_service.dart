import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
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

  Future<Map<String, dynamic>> getMe() async {
    final res = await _dio.get('/api/users/me');
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

  Future<Map<String, dynamic>> logHabit(String habitId, String date) async {
    final res = await _dio.post('/api/logs', data: {'habit_id': habitId, 'logged_date': date});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> getLogsByDate(String date) async {
    final res = await _dio.get('/api/logs', queryParameters: {'date': date});
    return List<dynamic>.from(res.data as List);
  }

  Future<void> deleteLog(String logId) async {
    await _dio.delete('/api/logs/$logId');
  }

  /// Fetches logs for a date range from the bulk endpoint.
  /// Returns a map keyed by date string (yyyy-MM-dd) -> list of log objects.
  Future<Map<String, List<dynamic>>> getRecentLogs(int days) async {
    final today = DateTime.now();
    final formatter = DateFormat('yyyy-MM-dd');
    final from = formatter.format(today.subtract(Duration(days: days - 1)));
    final to = formatter.format(today);
    final res = await _dio.get('/api/logs/range', queryParameters: {'from': from, 'to': to});
    final rows = List<dynamic>.from(res.data as List);
    final result = <String, List<dynamic>>{};
    for (final item in rows) {
      final row = Map<String, dynamic>.from(item as Map);
      final date = row['logged_date']?.toString();
      if (date != null) {
        result.putIfAbsent(date, () => []).add(item);
      }
    }
    return result;
  }
}
