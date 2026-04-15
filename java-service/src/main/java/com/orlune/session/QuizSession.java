package com.orlune.session;

import com.orlune.models.Question;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ─── COLLECTIONS & SESSION STATE ─────────
 */
public class QuizSession {
    private String sessionId;
    private List<Question> questions; // ArrayList
    private Map<String, Boolean> answers; // HashMap
    private int score;
    private int maxScore;
    private int streak;
    private int bestStreak;
    private long startedAt;
    private boolean completed;
    private String category;
    private String difficulty;

    public QuizSession(String sessionId, String category, String difficulty, List<Question> questions) {
        this.sessionId = sessionId;
        this.category = category;
        this.difficulty = difficulty;
        this.questions = questions;
        this.answers = new HashMap<>();
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.startedAt = System.currentTimeMillis();
        this.completed = false;

        this.maxScore = questions.stream().mapToInt(Question::getPoints).sum();
    }

    public boolean submitAnswer(String questionId, String answer) throws IllegalArgumentException {
        if (completed) throw new IllegalStateException("Quiz is already completed.");
        if (answers.containsKey(questionId)) throw new IllegalArgumentException("Question already answered.");

        Question q = questions.stream()
                .filter(x -> x.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        boolean correct = q.checkAnswer(answer);
        answers.put(questionId, correct);

        if (correct) {
            score += q.getPoints();
            streak++;
            bestStreak = Math.max(bestStreak, streak);
        } else {
            streak = 0;
        }

        return correct;
    }

    // Getters
    public String getSessionId() { return sessionId; }
    public List<Question> getQuestions() { return questions; }
    public int getScore() { return score; }
    public int getMaxScore() { return maxScore; }
    public int getStreak() { return streak; }
    public int getBestStreak() { return bestStreak; }
    public String getCategory() { return category; }
    public String getDifficulty() { return difficulty; }
    public long getStartedAt() { return startedAt; }
    public boolean isCompleted() { return completed; }

    public void setCompleted(boolean completed) { this.completed = completed; }
    public Map<String, Boolean> getAnswers() { return answers; }
}
