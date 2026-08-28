#include <iostream>
#include <string>
#include <cmath>
using namespace std;

// fract: виділення дробової частини числа
long double fract(long double x) {
    return x - floorl(x);
}

// cntos: ціла цифра (0-9) → символ
char cntos(long double d) {
    int digit = (int)floorl(d);
    if (digit < 0) digit = 0;
    if (digit > 9) digit = 9;
    return '0' + (char)digit;
}

void floatPointOutput() {
    double input;
    cout << "Введіть число (FLOAT POINT) у внутрішньому форматі: ";
    cin >> input;

    // Стан П: Ініціалізація
    long double result = (long double)input;
    string buff;
    int count    = 0;  // десятковий порядок (кількість множень/ділень)
    int fneg     = 0;  // прапорець від'ємного знаку
    const int PRECISION = 7; // кількість значущих цифр мантиси

    // Спеціальний випадок: нуль
    if (result == 0.0L) {
        cout << "Символьне подання: 0.0E+0" << endl;
        return;
    }

    // Стан 1: Обробка знаку
    if (result < 0.0L) {
        fneg = 1;
        result = -result;
    }

    // Стан 2: const < 1 → множимо на 10 (зменшуємо десятковий порядок)
    while (result < 1.0L) {
        result *= 10.0L;
        count--;
    }

    // Стан 4: const >= 10 → ділимо на 10 (збільшуємо десятковий порядок)
    while (result >= 10.0L) {
        result /= 10.0L;
        count++;
    }

    // Знак мантиси
    if (fneg) buff += '-';

    // Стан 5 (m1) + Стан 6: Виділення цифр мантиси
    // Перша цифра — ціла частина нормалізованого числа, далі — дробові
    for (int k = 0; k < PRECISION; k++) {
        // dop = fract(result) — дробова частина
        long double dop = fract(result);
        // ccn = cntos(result - dop) — ціла частина як символ
        char ccn = cntos(result - dop);
        buff += ccn;
        if (k == 0) buff += '.'; // крапка після першої (старшої) цифри
        // result = dop * 10 — виділяємо наступну цифру
        result = dop * 10.0L;
    }

    // Показник ступеня
    buff += 'E';
    if (count >= 0) buff += '+';
    buff += to_string(count);

    // Стан Е: виведення результату
    cout << "Символьне подання у буфері: " << buff << endl;
}

int main() {
    floatPointOutput();
    return 0;
}
