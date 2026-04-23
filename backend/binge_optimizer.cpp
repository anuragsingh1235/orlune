#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

// DAA Topic: Dynamic Programming (0/1 Knapsack Problem)
// Time Complexity: O(N * W) where N = number of movies, W = total time limit
// Space Complexity: O(N * W) for the DP table

struct Movie {
    int _id;           // Identifier mapped to database ID
    int runtimeMinutes; // Weight in Knapsack
    int ratingScore;    // Value in Knapsack (e.g., rating out of 100)
};

void optimizeBingeWatch(int totalTimeLimit, const vector<Movie>& movies) {
    int n = movies.size();
    
    // DP table initialization
    // dp[i][w] means the maximum total rating achievable using a subset of the 
    // first 'i' movies with a total runtime constraint of 'w'.
    vector<vector<int>> dp(n + 1, vector<int>(totalTimeLimit + 1, 0));

    // Build the DP table in bottom-up manner
    for (int i = 1; i <= n; i++) {
        for (int w = 1; w <= totalTimeLimit; w++) {
            if (movies[i - 1].runtimeMinutes <= w) {
                // Choice 1: Include the current movie
                int includeRating = movies[i - 1].ratingScore + dp[i - 1][w - movies[i - 1].runtimeMinutes];
                // Choice 2: Exclude the current movie
                int excludeRating = dp[i - 1][w];
                
                dp[i][w] = max(includeRating, excludeRating);
            } else {
                // Movie runtime exceeds current time limit 'w', must exclude
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Backtracking to find exactly which movies were selected by the DP algorithm
    vector<int> selectedMovieIds;
    int w = totalTimeLimit;
    for (int i = n; i > 0 && dp[i][w] > 0; i--) {
        // If the max rating is different from the row above it, it means this item was included.
        if (dp[i][w] != dp[i - 1][w]) {
            selectedMovieIds.push_back(movies[i - 1]._id);
            // Deduct the runtime from our remaining capacity
            w -= movies[i - 1].runtimeMinutes;
        }
    }

    // Output strictly configured for the NodeJS backend to parse (JSON-like or comma separated)
    // We print comma separated IDs, e.g., "3,1,5"
    for (size_t i = 0; i < selectedMovieIds.size(); i++) {
        if (i > 0) cout << ",";
        cout << selectedMovieIds[i];
    }
    cout << endl;
}

int main(int argc, char* argv[]) {
    // Expected arguments flow from NodeJS backend:
    // argv[1]: total time limit available (in mins)
    // argv[2+]: Sequence of pairs -> movie_id, movie_runtime, movie_rating...
    
    if (argc < 2) {
        cerr << "Error: No time limit provided." << endl;
        return 1;
    }

    int totalTimeLimit = stoi(argv[1]);
    vector<Movie> candidates;

    // Parse items into our abstract Data Structure
    for (int i = 2; i < argc; i += 3) {
        if (i + 2 < argc) {
            Movie m;
            m._id = stoi(argv[i]);
            m.runtimeMinutes = stoi(argv[i+1]);
            m.ratingScore = stoi(argv[i+2]);
            candidates.push_back(m);
        }
    }

    optimizeBingeWatch(totalTimeLimit, candidates);
    return 0;
}
