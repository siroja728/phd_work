/**
 * Лабораторна робота №2
 * Побудова програми обробки константи типу INTEGER згідно автоматної моделі.
 */
function parseIntegerAutomaton(buff) {
  console.log(`\n======================================`);
  console.log(`Вхідний буфер: "${buff}"`);
  console.log(`======================================`);

  // --- Початковий стан b ---
  let sum = 0; // нульова початкова сума
  let i = 0; // позиція в буфері (в JS індексація з 0)
  let fsign = 0; // прапорець знаку
  let isError = false;

  const max = buff.length;
  const smax = 2147483647; // максимальне значення для 32-бітного цілого числа

  if (max === 0) {
    console.log('-> Стан 4: error (Порожній рядок)');
    return null;
  }

  // --- Стан 1 та 2: Розпізнавання знаку ---
  // Предикат {buff(i)='+'}
  if (buff[i] === '+') {
    console.log("-> Стан 1: {buff(i)='+'} -> перехід до m1");
    i++;
  }
  // Предикат {buff(i)='-'}
  else if (buff[i] === '-') {
    console.log("-> Стан 2: {buff(i)='-'} -> fsign=1, перехід до m1");
    fsign = 1;
    i++;
  }

  // Перевірка, чи залишились символи після знаку
  if (i >= max) {
    console.log('-> Стан 4: error (Відсутні цифри після знаку)');
    return null;
  }

  // --- Цикл розпізнавання (мітка m1) ---
  while (i < max) {
    const char = buff[i];

    // Предикат {buff(i)=cyf} - перевірка на належність до цифр
    if (char >= '0' && char <= '9') {
      // Функція cstod(buff(i)) - перетворення символу в число через ASCII-коди
      const dig = char.charCodeAt(0) - '0'.charCodeAt(0);

      // Формування числа зі старших розрядів
      sum = sum * 10 + dig;
      console.log(`-> Стан 3: Обробка цифри '${char}', поточна sum = ${sum}`);

      // Вкладений предикат {sum > smax}
      if (sum > smax) {
        console.log(`-> Стан 4: error (Перевищення smax = ${smax})`);
        isError = true;
        break; // Вихід згідно моделі обробки помилок
      }
    } else {
      // Предикат {otherwise} у стані розпізнавання цифр
      console.log(`-> Стан 4: error (Неприпустимий символ '${char}')`);
      isError = true;
      break;
    }

    i++; // Перехід на наступну ітерацію (i++)
  }

  // --- Кінцевий стан e ---
  if (!isError) {
    // Предикат {fsign=1}[sum= - sum, stop]
    if (fsign === 1) {
      sum = -sum;
    }
    console.log(`-> Стан e (stop): Успішно! Кінцевий результат = ${sum}`);
    return sum;
  } else {
    console.log('-> Стан e (stop): Роботу припинено через помилку (error).');
    return null;
  }
}

// ==========================================
// Тестування (Перевірка на різних даних)
// ==========================================
parseIntegerAutomaton('2641'); // 1. Нормальне додатне число
parseIntegerAutomaton('-4096'); // 2. Від'ємне число
parseIntegerAutomaton('+128'); // 3. Число з явним плюсом
parseIntegerAutomaton('26A1'); // 4. Помилка: недопустимий символ 'A'
parseIntegerAutomaton('3000000000'); // 5. Помилка: перевищення smax
