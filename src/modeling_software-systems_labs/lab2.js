/**
 * Програма обробки константи типу INTEGER із символьного подання (buff)
 * згідно з автоматною моделлю та предикатним описом.
 */
function parseInteger(buff) {
  console.log(`\n--- Вхідний рядок: "${buff}" ---`);

  // Стан b (Початковий стан)
  let sum = 0;
  let i = 0; // В JavaScript індексація починається з 0, а не з 1
  let fsign = 0;
  const smax = 2147483647; // Максимальне значення (наприклад, для 32-бітного int)
  let isError = false;

  const max = buff.length;

  if (max === 0) {
    console.log('-> Стан 4: error (Порожній рядок)');
    return null;
  }

  // Аналіз першого символу на наявність знаку
  if (buff[i] === '+') {
    console.log("-> Стан 1: {buff(i)='+'} -> перехід на наступний символ");
    i++;
  } else if (buff[i] === '-') {
    console.log(
      "-> Стан 2: {buff(i)='-'} -> fsign=1, перехід на наступний символ",
    );
    fsign = 1;
    i++;
  }

  if (i >= max) {
    console.log('-> Стан 4: error (Відсутні цифри після знаку)');
    return null;
  }

  // Цикл замінює мітку m1 та перехід goto m1
  while (i < max) {
    const char = buff[i];

    // Предикат {buff(i)=cyf} - перевірка чи символ є цифрою
    if (char >= '0' && char <= '9') {
      // dig = cstod(buff(i))
      const dig = char.charCodeAt(0) - '0'.charCodeAt(0);
      // sum = sum * 10 + dig
      sum = sum * 10 + dig;

      console.log(`-> Стан 3: Обробка цифри '${char}', sum = ${sum}`);

      // Предикат {sum > smax}
      if (sum > smax) {
        console.log(
          `-> Стан 4: error (Перевищення максимального значення smax = ${smax})`,
        );
        isError = true;
        break;
      }
    } else {
      // Предикат {otherwise} -> error
      console.log(`-> Стан 4: error (Неприпустимий символ '${char}')`);
      isError = true;
      break;
    }

    i++; // i++
  }

  // Стан e (Кінцевий стан: {fsign=1}[sum= - sum, stop] U {otherwise}[stop])
  if (!isError) {
    if (fsign === 1) {
      sum = -sum;
    }
    console.log(`-> Стан e (stop): Успішно розпізнано. Результат = ${sum}`);
    return sum;
  } else {
    console.log('-> Стан e (stop): Завершення з помилкою розпізнавання.');
    return null;
  }
}

// Перевірка на різних сполученнях даних (Тести)
parseInteger('2641'); // Стандартне число без знаку
parseInteger('-4096'); // Від'ємне число
parseInteger('+128'); // Додатне число зі знаком
parseInteger('26A1'); // Помилка: неприпустимий символ
parseInteger('-3000000000'); // Помилка: переповнення (сума > smax)
