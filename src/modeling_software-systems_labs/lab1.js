/**
 * Функція для розв'язання квадратного рівняння Ax^2 + Bx + C = 0
 * Реалізовано згідно з автоматною моделлю (Стани 1-10)
 */
function solveQuadratic(a, b, c) {
  console.log(`\nВхідні дані: A=${a}, B=${b}, C=${c}`);

  // Стан П: Введення та початковий аналіз
  // Стан 1: Аналіз коефіцієнта А
  if (a !== 0) {
    console.log('-> Стан 2: (A ≠ 0)');

    // Предикат {B ≠ 0}
    if (b !== 0) {
      console.log('-> Стан 3: (B ≠ 0)');
      const d = Math.pow(b, 2) - 4 * a * c;

      if (d >= 0) {
        // Стан 4: Дискримінант додатний або нуль
        console.log(`-> Стан 4: (D ≥ 0, D=${d})`);
        const x1 = (-b + Math.sqrt(d)) / (2 * a);
        const x2 = (-b - Math.sqrt(d)) / (2 * a);
        console.log(`Результат: X1 = ${x1}, X2 = ${x2}`);
      } else {
        // Стан 10: Дискримінант від'ємний (Комплексні корені)
        console.log(`-> Стан 10: (D < 0, D=${d})`);
        const realPart = (-b / (2 * a)).toFixed(2);
        const imagPart = (Math.sqrt(Math.abs(d)) / (2 * a)).toFixed(2);
        console.log(
          `Результат: X1 = ${realPart} + ${imagPart}i, X2 = ${realPart} - ${imagPart}i`,
        );
      }
    }
    // Предикат {B = 0}
    else {
      console.log('-> Стан 9: (B = 0)');
      if (c <= 0) {
        // Стан 7: Неповне квадратне (A≠0, B=0, C≤0)
        console.log('-> Стан 7: (C ≤ 0)');
        const x = Math.sqrt(Math.abs(c) / a);
        console.log(`Результат: X1 = ${x}, X2 = ${-x}`);
      } else {
        // Стан 8: Неповне квадратне (A≠0, B=0, C>0) -> Комплексні корені
        console.log('-> Стан 8: (C > 0)');
        const imagPart = Math.sqrt(c / a).toFixed(2);
        console.log(`Результат: X1 = ${imagPart}i, X2 = -${imagPart}i`);
      }
    }
  }
  // Шлях для A = 0
  else {
    if (b !== 0) {
      // Стан 6: Лінійне рівняння (A=0, B≠0)
      console.log('-> Стан 6: (A = 0, B ≠ 0)');
      const x = -c / b;
      console.log(`Результат (лінійне): X = ${x}`);
    } else {
      // Стан 5: Вироджене рівняння (A=0, B=0)
      console.log('-> Стан 5: (A = 0, B = 0)');
      if (c === 0) {
        console.log("Результат: Безліч розв'язків (0=0)");
      } else {
        console.log('Результат: Помилка/Протиріччя (C ≠ 0)');
      }
    }
  }
  console.log('[Stop] Перехід у кінцевий стан.');
}

// Тестування різних комбінацій (A B C)
solveQuadratic(1, 5, 4); // (D > 0)
solveQuadratic(1, 2, 5); // (D < 0 -> Стан 10)
solveQuadratic(0, 2, -4); // (Лінійне -> Стан 6)
solveQuadratic(1, 0, 4); // (B=0, C>0 -> Стан 8)
solveQuadratic(0, 0, 7); // (Помилка -> Стан 5)
