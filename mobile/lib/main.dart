import 'package:flutter/material.dart';

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
      home: const Scaffold(body: Center(child: Text('Flutter Bootstrap Complete (MD3 Enabled)'))),
    );
  }
}