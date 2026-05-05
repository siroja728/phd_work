#include <iostream>
#include <thread>
#include <mutex>
using namespace std;

// shared variables
int n = 0;
int sum = 0;
int m = 0;
int prod = 0;
int k = 0;
int cnt = 0;

mutex out_mtx;

void summer() {
    sum = 0;
    while (n > 0) {
        sum = sum + n;
        n = n - 1;
    }
    {
        lock_guard<mutex> _lock(out_mtx);
        cout << sum << endl;
    }
    return;
}

void factor() {
    prod = 1;
    while (m > 1) {
        prod = prod * m;
        m = m - 1;
    }
    {
        lock_guard<mutex> _lock(out_mtx);
        cout << prod << endl;
    }
    return;
}

void counter() {
    cnt = 0;
    do {
        cnt = cnt + 1;
        k = k - 1;
    } while (k > 0);
    {
        lock_guard<mutex> _lock(out_mtx);
        cout << cnt << endl;
    }
    return;
}

int main() {
    // read inputs before spawning threads
    cin >> n;
    cin >> m;
    cin >> k;

    thread t_summer(summer);
    thread t_factor(factor);
    thread t_counter(counter);

    t_summer.join();
    t_factor.join();
    t_counter.join();
    return 0;
}