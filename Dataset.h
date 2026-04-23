#ifndef DATASET_H
#define DATASET_H

#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iostream>
#include <string>
#include <cmath>


using namespace std;

class Dataset {
public:
    vector<vector<double>> X;
    vector<double> y;

    void loadCSV(const string& path);
};

#endif
