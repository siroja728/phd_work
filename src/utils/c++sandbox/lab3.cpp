#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

void integerToString() {
    int input_int;
    const int N = 20; // Розмір буфера
    char buff[N + 1];
    
    // Ініціалізація: заповнюємо буфер пробілами
    for(int j = 0; j <= N; j++) buff[j] = ' ';
    buff[N] = '\0'; // Кінець рядка для коректного виводу

    cout << "Введіть ціле число (внутрішній формат): ";
    cin >> input_int;

    // Стан П та Стан 1: Підготовка та аналіз знака
    int i = N - 1; 
    int fsign = 0;
    long long temp_int = input_int; // Використовуємо long long для обробки INT_MIN

    if (temp_int < 0) {
        fsign = 1;
        temp_int = -temp_int;
    }

    // Стан 2: Цикл виділення цифр (аналог int != 0)
    // Використовуємо do-while, щоб обробити випадок, коли число дорівнює 0
    do {
        int int1 = temp_int % 10;   // int1 = int mod 10
        temp_int = temp_int / 10;   // int = int div 10
        
        // buff(i) = intos(int1)
        buff[i] = (char)(int1 + '0'); 
        i--;
    } while (temp_int > 0 && i >= 0);

    // Стан Е: Додавання знака
    if (fsign == 1 && i >= 0) {
        buff[i] = '-';
        i--;
    }

    // Виведення результату (починаючи з останньої заповненої позиції)
    cout << "Символьне подання у буфері: [" << (buff + i + 1) << "]" << endl;
}

int main() {
    integerToString();
    return 0;
}