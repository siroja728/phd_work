// Опис одного кроку обчислення: пара лексем (операнд дія операнд) → тимчасова змінна
export interface OperationStep {
  data1: string;   // ліва лексема даних
  op: string;      // лексема дії (оператор)
  data2: string;   // права лексема даних
  temp: string;    // ім'я тимчасової змінної для результату
  val1: number;    // числове значення data1
  val2: number;    // числове значення data2
  result: number;  // результат операції val1 op val2
}

// Пара лексем: (лексема даних, лексема дії).
// Це одна одиниця стеку — лівий операнд та оператор, що чекає правого операнда.
export interface PairItem {
  data1: string;  // лексема даних (лівий операнд)
  op: string;     // лексема дії (оператор після data1)
}

// Знімок стану ОДНОГО стеку у певний момент розбору.
// На відміну від двохстекового алгоритму, тут один стек зберігає пари (data1, op),
// а поточний стан відображає пару, що формується, та найсвіжіші дані.
export interface StackSnapshot {
  tokenIndex: number;             // індекс поточного токена (-1 = початок)
  action: string;                 // опис дії (українською)
  stack: (PairItem | '(')[];      // вміст стеку: пари лексем + маркери «(»
  currentPair: PairItem | null;   // поточна пара, що формується
  latestData: string | null;      // остання прочитана / обчислена лексема даних
}

// Стековий аналізатор арифметичних виразів.
//
// Реалізує алгоритм розбиття на пари лексем (data, op) з ОДНИМ стеком:
//   - стек зберігає пари (data1, op) — ліві операнди з операторами, що чекають
//     свого правого операнда після розгортання вищого пріоритету
//   - «(» зберігається у стеку як маркер початку підвиразу
//   - currentPair — пара, що зараз формується
//   - latestData  — найсвіжіша лексема даних (майбутній правий операнд)
//
// Правило обробки оператора OP:
//   1. Якщо currentPair.op має пріоритет ≥ OP → обробити currentPair,
//      використовуючи latestData як правий операнд (data2).
//   2. Інакше → поточну пару до стеку, OP стає оператором нової поточної пари.
//   3. Далі виштовхувати зі стеку пари з пріоритетом ≥ OP, поки стек не дасть «(» або нижчий пріоритет.
export class StackParser {
  private tempCounter: number;
  private context: Record<string, number>;
  public steps: OperationStep[];
  public snapshots: StackSnapshot[];  // покроковий журнал станів стеку
  public tokens: string[];            // масив токенів після токенізації

  constructor(context: Record<string, number> = {}) {
    this.tempCounter = 1;
    this.context = { ...context };
    this.steps = [];
    this.snapshots = [];
    this.tokens = [];
  }

  // Генерує унікальне ім'я тимчасової змінної: t1, t2, t3, …
  private getTemp(): string {
    return `t${this.tempCounter++}`;
  }

  // Повертає пріоритет оператора: * і / → 2, + і - → 1.
  private priority(op: string): number {
    if (op === '*' || op === '/') return 2;
    if (op === '+' || op === '-') return 1;
    return 0;
  }

  // Перевіряє, чи є токен оператором або дужкою (лексемою дії).
  private isOperator(token: string): boolean {
    return ['+', '-', '*', '/', '(', ')'].includes(token);
  }

  // Розбиває рядок виразу на масив токенів.
  private tokenize(expr: string): string[] {
    const matches = expr.match(/[A-Za-z]+|\d+(\.\d+)?|[()+\-*/]/g);
    if (!matches) throw new Error('Не вдалося розібрати вираз');
    return matches;
  }

  // Повертає числове значення токена з таблиці символів або як число.
  private getValue(token: string): number {
    if (!isNaN(Number(token))) return Number(token);
    if (this.context[token] !== undefined) return this.context[token];
    throw new Error(`Невідомий ідентифікатор: ${token}`);
  }

  // Виконує арифметичну операцію над двома числами.
  private compute(a: number, op: string, b: number): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) throw new Error('Ділення на нуль');
        return a / b;
      default: throw new Error(`Невідомий оператор: ${op}`);
    }
  }

  // Обробляє пару лексем: обчислює data1 op data2, записує крок і результат у контекст.
  // data2 завжди надходить ЗЗОВНІ (latestData на момент обробки) —
  // це ключова відмінність одностекового алгоритму від двохстекового.
  private applyOp(data1: string, op: string, data2: string): string {
    const val1 = this.getValue(data1);
    const val2 = this.getValue(data2);
    const result = this.compute(val1, op, val2);
    const temp = this.getTemp();
    this.steps.push({ data1, op, data2, temp, val1, val2, result });
    this.context[temp] = result;
    return temp;
  }

  // Головний метод: розбирає вираз і повертає числовий результат.
  //
  // Стан алгоритму в будь-який момент:
  //   stack       — стек пар (data1, op), що чекають свого data2
  //   currentPair — пара, що зараз формується (знаємо data1 та op, data2 ще попереду)
  //   latestData  — остання прочитана або обчислена лексема даних
  parse(expression: string): number {
    this.tokens = this.tokenize(expression);

    let currentPair: PairItem | null = null;
    let latestData: string | null = null;
    const stack: (PairItem | '(')[] = [];

    // Зберігає поточний стан у журнал знімків
    const snap = (tokenIndex: number, action: string) => {
      this.snapshots.push({
        tokenIndex,
        action,
        stack: stack.map(item => (item === '(' ? '(' : { ...item })),
        currentPair: currentPair ? { ...currentPair } : null,
        latestData,
      });
    };

    const lastStep = () => this.steps[this.steps.length - 1];

    snap(-1, 'Початок: стек порожній, поточних пар немає');

    this.tokens.forEach((token, i) => {

      // ── Лексема даних ─────────────────────────────────────────────────────
      if (!this.isOperator(token)) {
        // Просто зберігаємо як найсвіжішу лексему даних;
        // вона стане правим операндом (data2) для поточної або стекової пари
        latestData = token;
        snap(i, `Лексема даних «${token}» → поточні дані (майбутній правий операнд)`);
        return;
      }

      // ── Ліва дужка ────────────────────────────────────────────────────────
      if (token === '(') {
        // Якщо є незавершена поточна пара — кладемо до стеку: вона чекатиме
        // результату підвиразу як свого правого операнда
        if (currentPair) {
          stack.push(currentPair);
          currentPair = null;
          snap(i, `Поточну пару → стек (чекатиме результату підвиразу)`);
        }
        // Маркер «(» у стеку позначає межу підвиразу
        stack.push('(');
        snap(i, `Ліва дужка «(» → стек як маркер межі підвиразу`);
        return;
      }

      // ── Права дужка ───────────────────────────────────────────────────────
      if (token === ')') {
        snap(i, `Права дужка «)» → виштовхуємо пари до маркера «(»`);

        // Спочатку обробляємо поточну пару (якщо є), бо вона всередині дужок
        if (currentPair && latestData !== null) {
          const temp = this.applyOp(currentPair.data1, currentPair.op, latestData);
          latestData = temp;
          currentPair = null;
          const s = lastStep();
          snap(i, `Виконано пару: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
        }

        // Виштовхуємо зі стеку всі пари до маркера «(»
        while (stack.length && stack[stack.length - 1] !== '(') {
          const prevPair = stack.pop() as PairItem;
          const temp = this.applyOp(prevPair.data1, prevPair.op, latestData!);
          latestData = temp;
          const s = lastStep();
          snap(i, `Виконано пару зі стеку: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
        }

        stack.pop(); // видаляємо маркер «(» — дужки знищуються
        snap(i, `Маркер «(» видалено — дужки знищено`);
        return;
      }

      // ── Звичайна лексема дії (оператор) ───────────────────────────────────

      // Крок 1: визначаємо, що робити з поточною парою
      if (currentPair) {
        if (this.priority(currentPair.op) >= this.priority(token)) {
          // Поточна пара має вищий або рівний пріоритет → обробляємо її зараз,
          // latestData стає її правим операндом (data2)
          snap(i, `Оператор «${token}» (пріор. ${this.priority(token)}) ≤ «${currentPair.op}» (пріор. ${this.priority(currentPair.op)}) → обробляємо поточну пару`);
          const temp = this.applyOp(currentPair.data1, currentPair.op, latestData!);
          latestData = temp;
          currentPair = null;
          const s = lastStep();
          snap(i, `Виконано пару: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
        } else {
          // Новий оператор має вищий пріоритет → поточну пару до стеку,
          // результат підвиразу стане її data2 пізніше
          snap(i, `Оператор «${token}» (пріор. ${this.priority(token)}) > «${currentPair.op}» (пріор. ${this.priority(currentPair.op)}) → поточну пару до стеку`);
          stack.push(currentPair);
          currentPair = null;
          snap(i, `Пара (${(stack[stack.length - 1] as PairItem).data1}, ${(stack[stack.length - 1] as PairItem).op}) у стеку`);
        }
      } else {
        // currentPair порожня (після «)» або на початку)
        const topOp = stack.length && stack[stack.length - 1] !== '('
          ? (stack[stack.length - 1] as PairItem).op : null;
        if (topOp && this.priority(topOp) >= this.priority(token)) {
          snap(i, `Оператор «${token}» (пріор. ${this.priority(token)}) ≤ «${topOp}» у стеку → виштовхуємо стек`);
        } else {
          snap(i, `Оператор «${token}» → нова поточна пара з latestData`);
        }
      }

      // Крок 2: виштовхуємо зі стеку пари з вищим або рівним пріоритетом
      while (
        stack.length &&
        stack[stack.length - 1] !== '(' &&
        this.priority((stack[stack.length - 1] as PairItem).op) >= this.priority(token)
      ) {
        const prevPair = stack.pop() as PairItem;
        const temp = this.applyOp(prevPair.data1, prevPair.op, latestData!);
        latestData = temp;
        const s = lastStep();
        snap(i, `Виконано пару зі стеку: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
      }

      // Крок 3: latestData стає лівим операндом нової поточної пари
      currentPair = { data1: latestData!, op: token };
      latestData = null;
      snap(i, `Нова поточна пара: (${currentPair.data1},  ${currentPair.op})`);
    });

    // ── Кінець виразу: обробляємо залишок ─────────────────────────────────
    snap(this.tokens.length, 'Кінець виразу → обробляємо залишок');

    // Обробляємо поточну пару з latestData як правим операндом
    if (currentPair && latestData !== null) {
      const pair = currentPair as PairItem; // явне приведення: forEach ускладнює звуження типу
      const temp = this.applyOp(pair.data1, pair.op, latestData);
      latestData = temp;
      currentPair = null;
      const s = lastStep();
      snap(this.tokens.length, `Виконано поточну пару: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
    }

    // Виштовхуємо залишок стеку
    while (stack.length) {
      const item = stack.pop();
      if (item === '(') continue;
      const prevPair = item as PairItem;
      const temp = this.applyOp(prevPair.data1, prevPair.op, latestData!);
      latestData = temp;
      const s = lastStep();
      snap(this.tokens.length, `Виконано пару зі стеку: ${s.data1} ${s.op} ${s.data2} → ${s.temp} = ${s.result}`);
    }

    const finalResult = this.getValue(latestData!);
    snap(this.tokens.length, `Завершено. Результат у поточних даних: ${finalResult}`);

    return finalResult;
  }
}
