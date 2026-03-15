import package:dio/dio.dart;
import package:shared_preferences/shared_preferences.dart;

class ApiService {
  static const baseUrl = String.fromEnvironment(API_URL, defaultValue: https://habit-api.stuff187.com);
  final Dio _dio = Dio(BaseOptions(baseUrl: baseUrl));

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(token);
      if (token != null) options.headers[Authorization] = Bearer
