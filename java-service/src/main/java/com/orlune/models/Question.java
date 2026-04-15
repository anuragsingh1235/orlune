package com.orlune.models;

import java.util.List;

/**
 * ─── ABSTRACT BASE CLASS ──────────────────────────────────────
 * Demonstrates Abstraction and Encapsulation.
 */
public abstract class Question {
    protected String id;
    protected String text;
    protected String category;
    protected String difficulty;
    protected int points;

    public Question(String id, String text, String category, String difficulty, int points) {
        this.id = id;
        this.text = text;
        this.category = category;
        this.difficulty = difficulty;
        this.points = points;
    }

    // Abstract method to be overridden by subclasses (Polymorphism)
    public abstract boolean checkAnswer(String userAnswer);
    public abstract String getType();
    public abstract Object getSafeRepresentation();

    // Getters
    public String getId() { return id; }
    public String getText() { return text; }
    public String getCategory() { return category; }
    public String getDifficulty() { return difficulty; }
    public int getPoints() { return points; }
}
