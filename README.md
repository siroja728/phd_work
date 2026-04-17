# Automata Demo

Перетворення опису програми у вигляді предикатів на автоматну модель та генерація C++ коду.

## Запуск

```bash
npm install
npm run dev
```

Відкрити http://localhost:5173

## Структура проекту

```
src/
├── types/index.ts              # всі типи проекту
├── utils/
│   ├── escapeHtml.ts           # екранування HTML
│   ├── highlightCpp.ts         # підсвічування C++
│   └── examples.ts             # готові приклади
├── services/
│   ├── stackParser.ts          # стековий алгоритм (пари лексем + пріоритети)
│   ├── predicateParser.ts      # { умова } [ дії ] → AutomatonModel
│   └── codeGenerator.ts        # AutomatonModel → C++ код
└── components/
    ├── InputPanel.tsx           # введення предикатів
    ├── InfoPanel.tsx            # підказки формату
    ├── MainTable.tsx            # таблиця MAIN
    ├── ConnectTable.tsx         # таблиця CONNECT
    ├── StackTracePanel.tsx      # трасування стекового алгоритму
    ├── AutomatonDiagram.tsx     # SVG граф НСА
    └── CodeOutputPanel.tsx      # згенерований C++ код
```

## Формат введення

```
{ умова } [ дії ]
{ умова } [ дії ]
```

Перший рядок — початковий стан. Наступні — кінцеві стани.
Умови переходів з початкового стану беруться з умов кінцевих станів.
