#include <iostream>
#include <string>
#include <cmath>
using namespace std;

// cstod: символ цифри → числове значення
int cstod(char c) { return c - '0'; }

// fild: INTEGER → EXTENDED (long double)
long double fild(long long x) { return (long double)x; }

// proc(fin): коригування дробової частини — ділення на 10^count
void proc_fin(long double& val, int count) {
    while (count-- > 0) val /= 10.0L;
}

void floatPointInput() {
    string buff;
    cout << "Введіть число (FLOAT POINT) у символьному вигляді: ";
    cin >> buff;

    // Стан П: Ініціалізація
    int i        = 0;
    long long sum = 0;
    int count    = 0;    // лічильник дробових цифр
    long double result = 0.0L;
    int fsign    = 0;    // прапорець: знак вже зустрічався
    int fneg     = 0;    // прапорець: від'ємний знак
    int fexp     = 0;    // прапорець: обробляємо показник ступеня
    int fdot     = 0;    // прапорець: десяткова крапка вже зустрічалась
    int error_code = 0;
    int max_len  = (int)buff.length();

    if (max_len == 0) {
        cout << "Помилка: Порожній ввід" << endl;
        return;
    }

    // m4: Основний цикл розбору символів
    while (i < max_len) {
        char c = buff[i];

        if (c == '+' && !fsign) {
            // Стан 1: знак '+'
            fsign = 1;
        } else if (c == '-' && !fsign) {
            // Стан 2: знак '-'
            fsign = 1;
            fneg  = 1;
        } else if (c == '.') {
            // Стан 3: десяткова крапка
            if (fexp) {
                error_code = 1;
                cout << "Помилка (" << error_code << "): крапка в показнику ступеня" << endl;
            } else if (fdot) {
                error_code = 1;
                cout << "Помилка (" << error_code << "): повторна десяткова крапка" << endl;
            } else {
                fdot = 1;
            }
        } else if (c >= '0' && c <= '9') {
            // Стан 4 (m2): десяткова цифра
            int dig = cstod(c);
            sum = sum * 10 + dig;
            if (sum > (long long)9e15) {
                error_code = 2;
                cout << "Помилка (" << error_code << "): перевищення максимального значення" << endl;
                i++;
                continue;
            }
            // m3: підрахунок дробових цифр (якщо крапка є і ще не в показнику)
            if (fdot && !fexp) count++;
        } else if ((c == 'E' || c == 'e') && !fexp) {
            // Стан 5: початок показника ступеня
            fexp = 1;
            // Перетворення накопиченого цілого у формат EXTENDED
            result = fild(sum);
            // Застосування знаку мантиси
            if (fneg) { result = -result; fneg = 0; }
            // proc(fin): корекція дробової частини
            proc_fin(result, count);
            // Скидання для розбору показника ступеня
            sum = 0; fsign = 0; fdot = 0;
        } else {
            // Стан 7 (error): неприпустимий символ
            error_code = 3;
            cout << "Помилка (" << error_code << "): неприпустимий символ '" << c << "'" << endl;
        }

        // m1: перехід до наступного символу
        i++;
    }

    // m1: кінець буфера → call fin, stop
    if (!fexp) {
        // Показника ступеня не було — перетворюємо sum безпосередньо
        result = fild(sum);
        if (fneg) result = -result;
        proc_fin(result, count);
    } else {
        // Застосування показника ступеня: sum містить його абсолютне значення
        long long exp_val = fneg ? -sum : sum;
        if (exp_val > 0) {
            for (long long j = 0; j < exp_val; j++) result *= 10.0L;
        } else if (exp_val < 0) {
            for (long long j = 0; j < -exp_val; j++) result /= 10.0L;
        }
    }

    // Стан Е: виведення результату
    cout << "Результат у форматі EXTENDED: " << (double)result << endl;
}

int main() {
    floatPointInput();
    return 0;
}
