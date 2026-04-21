# Automata Studio

Academic demo for a PhD dissertation:
**"Method of transforming program description into code using an instrumental programming language"**
Черкаський державний технологічний університет — Ємелянов С.А.

## Запуск

```bash
npm install
npm run dev
```

Відкрити http://localhost:5173

---

## Формат введення

Програма описується як послідовність предикатів:

```
{ умова } [ дії ]
{ умова } [ дії ]
...
```

### Типи станів

| Позиція | Тип стану |
|---------|-----------|
| Перший рядок | `initial` |
| Проміжні рядки | `normal` |
| Останній рядок (без `goto`) | `final` |

### Мітки та переходи `goto`

Стан можна іменувати префіксом `:назва`. У діях можна вказати `goto назва` для явного переходу до позначеного стану.

```
:start   { true }     [ read(n); result = 1 ]
:compute { n > 1 }    [ result = result * n; n = n - 1; goto compute ]
         { n <= 1 }   [ print(result) ]
```

- `goto` створює ребро в таблиці CONNECT з умовою, що відповідає умові поточного предиката
- `goto` не скасовує послідовний перехід — обидва ребра додаються (умови мають бути взаємовиключними)
- Якщо цільова мітка не знайдена — перехід ігнорується

### Вбудовані функції дій

| Функція | Генерований C++ |
|---------|-----------------|
| `read(x)` | `cin >> x` |
| `print(expr)` | `cout << expr << endl` |
| Присвоєння | без змін |

### Стековий алгоритм

Арифметичні вирази в діях автоматично розбираються стековим алгоритмом.
Підтримуються: `+`, `-`, `*`, `/`, `(`, `)`, унарний `+`/`-`.

Пріоритети операторів:

| Оператор | Вхідний | Порівняння |
|----------|---------|------------|
| `+`, `-` (бінарні) | 1 | 1 |
| `*`, `/` | 2 | 2 |
| `(` | 3 | 0 |
| `+`, `-` (унарні) | 4 | 3 |

---

## Структура проекту

```
src/
├── types/index.ts                # AutomatonState, AutomatonTransition, AutomatonModel,
│                                 # StackStep, ExpressionAnalysis, ParseResult
├── i18n/
│   ├── index.ts                  # i18next + LanguageDetector (uk/en)
│   └── locales/uk.ts, en.ts     # переклади
├── utils/
│   ├── examples.ts               # готові приклади (sign, minmax, grade, expr)
│   ├── escapeHtml.ts
│   ├── highlightCpp.ts           # підсвічування синтаксису C++
│   └── graphLayout.ts            # Dagre layout для React Flow
├── services/
│   ├── predicateParser.ts        # { умова } [ дії ] + :мітка/goto → AutomatonModel
│   ├── stackParser.ts            # стековий алгоритм з парами лексем і пріоритетами
│   └── codeGenerator.ts          # AutomatonModel → C++ код
└── components/
    ├── Editor.tsx                # редактор з номерами рядків, Ctrl+Enter
    ├── TabPanel.tsx              # IDE-панель вкладок (завжди змонтовані)
    ├── AutomatonNode.tsx         # кастомний вузол React Flow
    ├── AutomatonDiagram.tsx      # граф React Flow + Dagre
    ├── MainTable.tsx             # таблиця MAIN (id, type, label, actions, mark)
    ├── ConnectTable.tsx          # таблиця CONNECT (from, condition, to)
    ├── StackTracePanel.tsx       # покроковий трейс стекового алгоритму
    ├── CodeOutputPanel.tsx       # підсвічений C++ з кнопкою копіювання
    └── LanguageSwitcher.tsx      # перемикач UK/EN у заголовку
```

---

## Модель даних

### Таблиця MAIN

| Поле | Тип | Опис |
|------|-----|------|
| `Id_state` | number | ідентифікатор стану |
| `Type` | `initial \| normal \| final` | тип стану |
| `Label` | string \| null | мітка `:назва` для `goto` |
| `List_of_actions` | string | список дій (`;`-розділених) |
| `Mark` | boolean | прапорець відвідування (runtime) |

### Таблиця CONNECT

| Поле | Тип | Опис |
|------|-----|------|
| `Id_state (current)` | number | стан-джерело |
| `Condition` | string | умова переходу |
| `Next_Id_state` | number | стан-ціль |

`Mark = true` означає, що стан вже відвідувався; автомат повертається до початкового стану.

---

## Залежності

| Пакет | Призначення |
|-------|-------------|
| `react`, `react-dom` | UI |
| `@xyflow/react` | граф автомата |
| `dagre` | автоматичний layout графа |
| `i18next`, `react-i18next` | інтернаціоналізація |
| `i18next-browser-languagedetector` | збереження мови в localStorage |
