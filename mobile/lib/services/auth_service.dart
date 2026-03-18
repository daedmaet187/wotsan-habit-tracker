import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';

class AuthService {
  static const _tokenKey = 'token';
  static const _fullNameKey = 'full_name';
  static const _emailKey = 'user_email';

  final ApiService _apiService;

  AuthService({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  Future<void> login(String email, String password) async {
    final response = await _apiService.login(email, password);
    final token = response['token'] as String?;

    if (token == null || token.isEmpty) {
      throw Exception('Login did not return a token');
    }

    final user = response['user'] as Map?;
    final fullName = user?['full_name']?.toString() ?? '';
    final userEmail = user?['email']?.toString() ?? email;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_fullNameKey, fullName);
    await prefs.setString(_emailKey, userEmail);
  }

  Future<void> register(String email, String password, String fullName) async {
    final response = await _apiService.register(email, password, fullName);
    final token = response['token'] as String?;
    if (token == null || token.isEmpty) {
      throw Exception('Registration failed');
    }

    final user = response['user'] as Map?;
    final storedName = user?['full_name']?.toString() ?? fullName;
    final storedEmail = user?['email']?.toString() ?? email;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_fullNameKey, storedName);
    await prefs.setString(_emailKey, storedEmail);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_fullNameKey);
    await prefs.remove(_emailKey);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<String> getFullName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_fullNameKey) ?? '';
  }

  Future<String> getEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_emailKey) ?? '';
  }
}
