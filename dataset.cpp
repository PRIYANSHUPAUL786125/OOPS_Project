#include "Dataset.h"
#include <fstream>
#include <sstream>

void Dataset::loadCSV(const string& filename) {
    ifstream file(filename);
    string line;

    getline(file, line); // skip header

    while (getline(file, line)) {
        if (line.empty()) continue;

        stringstream ss(line);
        string value;
        vector<double> row;

        while (getline(ss, value, ',')) {
            row.push_back(stod(value));
        }

        data.push_back(row);
    }
}

vector<vector<double>> Dataset::getFeatures(int col) {
    vector<vector<double>> X;

    for (auto& row : data) {
        X.push_back({row[col]});
    }

    return X;
}

vector<double> Dataset::getColumn(int col) {
    vector<double> y;

    for (auto& row : data) {
        y.push_back(row[col]);
    }

    return y;
}