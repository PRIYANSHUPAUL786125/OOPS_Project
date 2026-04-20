#include <iostream>
#include <vector>
#include <fstream>
#include <cmath>
#include "LinearRegression.h"
#include "Dataset.h"
#include "KNN.h"

using namespace std;

// ---------- percentile ----------
double getPercentile(double val, vector<double>& dist) {
    int count = 0;
    for (double x : dist)
        if (x <= val) count++;

    return (double)count / dist.size();
}

// ---------- category ----------
int getCategory(double val) {
    if (val >= 9.5) return 5;
    else if (val >= 8.5) return 4;
    else if (val >= 7.0) return 3;
    else if (val >= 6.0) return 2;
    else if (val >= 5.0) return 1;
    else return 0;
}

string getLabel(int c) {
    if (c == 5) return "Topper";
    if (c == 4) return "Excellent";
    if (c == 3) return "Above Average";
    if (c == 2) return "Average";
    if (c == 1) return "Below Average";
    return "Critical";
}

// ---------- feature ----------
vector<double> computeFeatures(const vector<double>& sems, const vector<double>& credits) {

    int n = sems.size();

    double avg = 0;
    double total_credits = 0;
    
    for (int i = 0; i < n; i++) {
        avg += sems[i] * credits[i];
        total_credits += credits[i];
    }
    
    if (total_credits > 0) avg /= total_credits;
    else avg = 0;

    double last = sems[n - 1];

    double trend = (sems[n - 1] - sems[0]) / n;

    double var = 0;
    for (double x : sems)
        var += pow(x - avg, 2);
    var /= n;

    return {avg, last, trend, var};  // ALWAYS 4 FEATURES
}

// ---------- distribution ----------
vector<double> loadDistribution() {
    vector<double> dist;
    ifstream file("distribution.txt");

    double x;
    while (file >> x)
        dist.push_back(x);

    return dist;
}

// ---------- main ----------
int main() {

    int choice;
    cout << "1. Train\n2. Predict\nChoice: ";
    cin >> choice;

    if (choice == 1) {

        Dataset data;
        data.loadCSV("data.csv");

        // ----- LR -----
        LinearRegression lr;
        lr.fit(data.X, data.y);
        lr.save("model.txt");

        // ----- KNN -----
        KNN knn(5);
        knn.fit(data.X, data.y);
        knn.save("knn.txt");

        // ----- Distribution -----
        ofstream out("distribution.txt");
        for (double y : data.y)
            out << y << endl;

        cout << "Training Done\n";
    }

    else if (choice == 2) {

    LinearRegression lr;
    lr.load("model.txt");

    KNN knn;
    knn.load("knn.txt");

    vector<double> dist = loadDistribution();

    int n;
    cout << "Sem count: ";
    cin >> n;

    vector<double> sems(n);
    vector<double> credits(n);
    vector<double> predefined_credits = {24, 28, 25, 29, 24, 26, 18, 19};
    
    for (int i = 0; i < n; i++) {
        cout << "Enter Sem " << i+1 << " GPA: ";
        double val;
        cin >> val;
        
        if (val > 10.0) {
            cout << "Warning: Value " << val << " exceeds maximum GPA scale. Clamping to 10.0\n";
            val = 10.0;
        } else if (val < 0.0) {
            cout << "Warning: Value " << val << " drops below minimum GPA scale. Clamping to 0.0\n";
            val = 0.0;
        }
        sems[i] = val;
        
        if (i < predefined_credits.size()) {
            credits[i] = predefined_credits[i];
        } else {
            credits[i] = 20.0; // Default fallback
        }
    }

    vector<double> features = computeFeatures(sems, credits);

    // ----- LR prediction -----
    double pred_cg = lr.predict(features);

    double p = getPercentile(pred_cg, dist);
    int cat_lr = getCategory(pred_cg);

    // ----- KNN prediction -----
    int cat_knn = (int)knn.predict(features);

    // ----- Confidence -----
    string confidence;

    if (cat_lr == cat_knn)
        confidence = "High";
    else if (abs(cat_lr - cat_knn) == 1)
        confidence = "Medium";
    else
        confidence = "Low";

    double sem_conf = min(1.0, (double)n / 6.0);

    // ----- OUTPUT -----
    cout << "\nPredicted CG (LR): " << pred_cg << endl;

    cout << "\n[LR Category]\n";
    cout << "Percentile: " << p * 100 << "%\n";
    cout << "Category: " << getLabel(cat_lr) << endl;

    cout << "\n[KNN Category]\n";
    cout << "Category: " << getLabel(cat_knn) << endl;

    cout << "\nAgreement Confidence: " << confidence << endl;
    cout << "Data Confidence: " << sem_conf * 100 << "%\n";
    }

    return 0;
}