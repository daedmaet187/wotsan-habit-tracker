import 'package:flutter/material.dart';
// NOTE: LoginScreen import is a placeholder, this file is just for theme setup
// We will fix the import path in the next screen task.

void main() {
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
      home: const Scaffold(body: Center(child: Text('Flutter Bootstrap Success: MD3 Enabled'))), // Placeholder
    );
  }
}
