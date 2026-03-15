import 'package:flutter/material.dart';
import 'package:habit_tracker/screens/login_screen.dart'; // Will exist in next step

void main() {
  // For now, just run the login screen stub
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Habit Tracker',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6366F1)),
        useMaterial3: true, // <-- MD3 Enabled
      ),
      home: const LoginScreen(), // Placeholder
    );
  }
}