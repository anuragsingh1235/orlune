package com.orlune.controllers;

import com.orlune.data.QuestionBank;
import com.orlune.models.Question;
import com.orlune.session.QuizSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * ─── REST CONTROLLER (Spring Boot) ───────────────────────
 */
@RestController
@RequestMapping("/trivia")
@CrossOrigin(origins = "*") // Allows React/Node frontend to consume this API
public class TriviaController {

    @Autowired
    private QuestionBank questionBank;

    // Concurrency control for active sessions
    private final Map<String, QuizSession> activeSessions = new ConcurrentHashMap<>();

    @PostMapping("/start")
    public ResponseEntity<?> startQuiz(@RequestBody StartRequest req) {
        String sessionId = UUID.randomUUID().toString();
        String cat = req.getCategory() == null ? "all" : req.getCategory();
        String diff = req.getDifficulty() == null ? "all" : req.getDifficulty();
        int count = req.getCount() <= 0 ? 10 : req.getCount();

        List<Question> questions = questionBank.getRandomQuiz(cat, diff, count);
        QuizSession session = new QuizSession(sessionId, cat, diff, questions);

        activeSessions.put(sessionId, session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("maxScore", session.getMaxScore());
        response.put("totalQuestions", questions.size());
        response.put("timePerQuestion", 30);
        response.put("questions", questions.stream().map(Question::getSafeRepresentation).collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/answer")
    public ResponseEntity<?> submitAnswer(@RequestBody AnswerRequest req) {
        QuizSession session = activeSessions.get(req.getSessionId());
        if (session == null) {
            return ResponseEntity.status(404).body(Collections.singletonMap("error", "Session not found"));
        }

        try {
            boolean correct = session.submitAnswer(req.getQuestionId(), req.getAnswer());
            Question q = session.getQuestions().stream().filter(x -> x.getId().equals(req.getQuestionId())).findFirst().orElse(null);

            Map<String, Object> response = new HashMap<>();
            response.put("correct", correct);
            response.put("score", session.getScore());
            response.put("streak", session.getStreak());
            response.put("bestStreak", session.getBestStreak());
            response.put("pointsEarned", correct && q != null ? q.getPoints() : 0);

            // Optional: return correct answer for display
            if (q != null) {
                if (q.getType().equals("mcq")) {
                    response.put("correctAnswer", ((com.orlune.models.MCQQuestion) q).getCorrectIndex());
                } else if (q.getType().equals("truefalse")) {
                    response.put("correctAnswer", ((com.orlune.models.TrueFalseQuestion) q).isCorrectAnswer());
                }
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @GetMapping("/result/{sessionId}")
    public ResponseEntity<?> getResult(@PathVariable String sessionId) {
        QuizSession session = activeSessions.get(sessionId);
        if (session == null) {
            return ResponseEntity.status(404).body(Collections.singletonMap("error", "Session not found"));
        }

        session.setCompleted(true);
        long correct = session.getAnswers().values().stream().filter(v -> v).count();
        int pct = (int) Math.round(((double) session.getScore() / session.getMaxScore()) * 100);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("score", session.getScore());
        response.put("maxScore", session.getMaxScore());
        response.put("percentage", pct);
        response.put("correct", correct);
        response.put("total", session.getQuestions().size());
        response.put("bestStreak", session.getBestStreak());
        response.put("category", session.getCategory());
        response.put("difficulty", session.getDifficulty());
        response.put("timeTaken", Math.round((System.currentTimeMillis() - session.getStartedAt()) / 1000.0));
        
        String grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "D";
        response.put("grade", grade);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        // Expose total questions to verify it loaded
        Map<String, Object> res = new HashMap<>();
        res.put("totalQuestions", questionBank.getTotalQuestions());
        res.put("status", "live");
        return ResponseEntity.ok(res);
    }
}

class StartRequest {
    private String category;
    private String difficulty;
    private int count;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}

class AnswerRequest {
    private String sessionId;
    private String questionId;
    private String answer;

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }
    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
}
