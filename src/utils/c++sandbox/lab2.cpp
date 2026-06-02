#include <iostream>
#include <string>
#include <climits> // Для перевірки smax (INT_MAX)

using namespace std;

void processInteger() {
    string buff;
    cout << "Введіть число (INTEGER) у символьному вигляді: ";
    cin >> buff;

    // Стан П: Ініціалізація
    long long sum = 0; // Використовуємо long long для перевірки переповнення
    int i = 0;
    int fsign = 0; // 0 - позитивне, 1 - негативне
    int max_len = buff.length();

    // Перевірка на порожній рядок
    if (max_len == 0) {
        cout << "Помилка: Порожній ввід" << endl;
        return;
    }

    // Стан 1 та 2: Обробка знаку
    if (buff[i] == '+') {
        i++; // Просто переходимо до наступного символу
    } else if (buff[i] == '-') {
        fsign = 1;
        i++;
    }

    // Перевірка, чи є цифри після знаку
    if (i >= max_len) {
        cout << "Стан 4 (Error): Очікувалася цифра після знаку." << endl;
        return;
    }

    // Стан 3: Обробка цифр
    while (i < max_len) {
        char current = buff[i];

        // Перевірка, чи є символ цифрою (cyf)
        if (current >= '0' && current <= '9') {
            int dig = current - '0'; // cstod - перетворення символу в цифру
            
            sum = sum * 10 + dig;

            // Перевірка на переповнення {sum > smax}
            if ((fsign == 0 && sum > INT_MAX) || (fsign == 1 && (-sum) < INT_MIN)) {
                cout << "Стан 4 (Error): Перевищення максимального значення (smax)!" << endl;
                return;
            }
        } else {
            // Стан 4: Недопустимий символ
            cout << "Стан 4 (Error): Неприпустимий символ '" << current << "'." << endl;
            return;
        }
        i++;
    }

    // Стан Е: Кінцева обробка
    int finalResult = (int)sum;
    if (fsign == 1) {
        finalResult = -finalResult;
    }

    cout << "Результат у внутрішньому форматі: " << finalResult << endl;
}

int main() {
    processInteger();
    return 0;
}