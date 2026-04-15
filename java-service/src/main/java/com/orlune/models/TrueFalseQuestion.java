package com.orlune.models;

import java.util.Map;
import java.util.HashMap;

/**
 * ─── SUBCLASS 2 (Inheritance) ─────────────────────────────────
 */
public class TrueFalseQuestion extends Question {
    private boolean correctAnswer;

    public TrueFalseQuestion(String id, String text, String category, String difficulty, int points, boolean correctAnswer) {
        super(id, text, category, difficulty, points);
        this.correctAnswer = correctAnswer;
    }

    @Override
    public boolean checkAnswer(String userAnswer) {
        return Boolean.parseBoolean(userAnswer) == correctAnswer;
    }

    @Override
    public String getType() {
        return "truefalse";
    }

    @Override
    public Object getSafeRepresentation() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("type", getType());
        map.put("category", category);
        map.put("difficulty", difficulty);
        map.put("text", text);
        map.put("points", points);
        return map;
    }

    public boolean isCorrectAnswer() { return correctAnswer; }
}
