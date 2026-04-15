package com.orlune.models;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * ─── SUBCLASS 1 (Inheritance) ─────────────────────────────────
 */
public class MCQQuestion extends Question {
    private List<String> options;
    private int correctIndex;

    public MCQQuestion(String id, String text, String category, String difficulty, int points, List<String> options, int correctIndex) {
        super(id, text, category, difficulty, points);
        this.options = options;
        this.correctIndex = correctIndex;
    }

    @Override
    public boolean checkAnswer(String userAnswer) {
        try {
            // Parses the string to an integer, throws a NumberFormatException if it fails.
            int answerIdx = Integer.parseInt(userAnswer);
            return answerIdx == correctIndex;
        } catch (NumberFormatException e) {
            // Exception Handling
            return false;
        }
    }

    @Override
    public String getType() {
        return "mcq";
    }

    @Override
    public Object getSafeRepresentation() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("type", getType());
        map.put("category", category);
        map.put("difficulty", difficulty);
        map.put("text", text);
        map.put("options", options);
        map.put("points", points);
        return map;
    }

    public int getCorrectIndex() { return correctIndex; }
}
