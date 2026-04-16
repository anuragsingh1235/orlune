package com.orlune.data;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.orlune.models.MCQQuestion;
import com.orlune.models.Question;
import com.orlune.models.TrueFalseQuestion;
import org.springframework.stereotype.Service;

i;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ─── FILE I/O & COLLECTIONS ──────────────────────────────────
 */
@Service
public class QuestionBank {
    private List<Question> allQuestions = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            loadFromFile();
        } catch (IOException e) {
            System.err.println("❌ Failed to load questions.json: " + e.getMessage());
        }
    }

    public void loadFromFile() throws IOException {
        // Path needs to navigate out of the java-service directory to the backend
        // directory
        Path currentRelativePath = Paths.get("");
        String s = currentRelativePath.toAbsolutePath().toString();
        String filePath = s + "/../backend/src/data/questions.json";

        System.out.println("Loading questions from: " + filePath);

        BufferedReader reader = new BufferedReader(new FileReader(filePath));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();

        parseQuestions(sb.toString());
        System.out.println("✅ Loaded " + allQuestions.size() + " questions into Java service.");
    }

    private void parseQuestions(String jsonStr) {
        Gson gson = new Gson();
        JsonArray jsonArray = gson.fromJson(jsonStr, JsonArray.class);

        allQuestions.clear();
        for (JsonElement el : jsonArray) {
            JsonObject obj = el.getAsJsonObject();
            String id = obj.get("id").getAsString();
            String type = obj.get("type").getAsString();
            String category = obj.get("category").getAsString();
            String difficulty = obj.get("difficulty").getAsString();
            String text = obj.get("text").getAsString();
            int points = obj.get("points").getAsInt();

            if (type.equals("mcq")) {
                List<String> options = new ArrayList<>();
                obj.getAsJsonArray("options").forEach(opt -> options.add(opt.getAsString()));
                int correct = obj.get("correct").getAsInt();
                allQuestions.add(new MCQQuestion(id, text, category, difficulty, points, options, correct));
            } else if (type.equals("truefalse")) {
                boolean correct = obj.get("correct").getAsBoolean();
                allQuestions.add(new TrueFalseQuestion(id, text, category, difficulty, points, correct));
            }
        }
    }

    public List<Question> getRandomQuiz(String category, String difficulty, int count) {
        return allQuestions.stream()
                .filter(q -> category.equals("all") || q.getCategory().equals(category))
                .filter(q -> difficulty.equals("all") || q.getDifficulty().equals(difficulty))
                .collect(Collectors.collectingAndThen(Collectors.toList(), collected -> {
                    Collections.shuffle(collected);
                    return collected.stream().limit(Math.min(count, collected.size())).collect(Collectors.toList());
                }));
    }

    public int getTotalQuestions() {
        return allQuestions.size();
    }
}
