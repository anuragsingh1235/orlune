package com.orlune;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║    ORLUNE TRIVIA — Java OOP Microservice                ║
 * ║    Subject: Object-Oriented Programming using Java      ║
 * ║    Concepts demonstrated:                               ║
 * ║      • Abstract Classes & Inheritance                   ║
 * ║      • Interfaces & Polymorphism                        ║
 * ║      • Collections (ArrayList, HashMap, LinkedList)     ║
 * ║      • File I/O (BufferedReader, FileReader)            ║
 * ║      • Exception Handling (try-catch-finally)           ║
 * ║      • Multithreading (ExecutorService, Runnable)       ║
 * ║      • REST API (Spring Boot)                           ║
 * ╚══════════════════════════════════════════════════════════╝
 */
@SpringBootApplication
public class OrluneTriviaApp {
    public static void main(String[] args) {
        System.out.println("🎬 Orlune Trivia Java Service starting on port 8080...");
        SpringApplication.run(OrluneTriviaApp.class, args);
    }
}
