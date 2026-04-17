export default {
  app: {
    name: 'Automata Studio',
    subtitle: 'Метод перетворення опису програми у код',
    file: 'predicates.auto',
  },

  editor: {
    examples: 'приклади\u2026',
    run: 'Виконати',
    lines_one: '{{count}} рядок',
    lines_few: '{{count}} рядки',
    lines_many: '{{count}} рядків',
    language: 'предикати',
    encoding: 'UTF-8',
    placeholder: '{ true } [ read(x) ]\n{ x > 0 } [ print("positive") ]\n{ x < 0 } [ print("negative") ]',
  },

  examples: {
    sign:   'знак числа',
    minmax: 'мін/макс',
    grade:  'оцінка',
    expr:   'A*(B+C/D)\u2212E',
  },

  tabs: {
    main:    'MAIN',
    connect: 'CONNECT',
    stack:   'Stack Trace',
    graph:   'Граф',
    output:  'C++ Код',
  },

  empty: {
    icon: '\u25c8',
    title: 'Модель ще не побудована',
    hint: 'Введіть предикати в редакторі та натисніть',
    run: 'Виконати',
  },

  status: {
    ready: 'Готово',
    parsing: 'парсинг\u2026',
    no_model: 'Немає моделі',
    model: '{{states}} станів · {{transitions}} переходів',
  },

  table: {
    main: {
      id: 'Id_state',
      type: 'Type',
      actions: 'List_of_actions',
      mark: 'Mark',
    },
    connect: {
      from: 'Id_state (current)',
      condition: 'Condition',
      to: 'Next_Id_state',
    },
  },

  state_type: {
    initial: 'initial',
    final: 'final',
    normal: 'normal',
  },

  stack: {
    expr_label: 'вираз',
    temp_label: 'тимч. змінних',
    steps_title: 'Кроки розбору',
    code_title: 'Проміжний код',
    col_step: '#',
    col_pair: 'Поточна пара',
    col_action: 'Дія',
    col_action_stack: 'Стек операторів',
    col_operand_stack: 'Стек операндів',
    col_code: 'Проміжний код',
    no_expr: 'У діях не знайдено арифметичних виразів для стекового розбору',
  },

  code: {
    copy: 'копіювати',
    copied: '\u2713 скопійовано',
    placeholder: '// виконайте модель для генерації коду',
  },

  lang: {
    label: 'Мова',
    uk: 'Українська',
    en: 'English',
  },

  diagram: {
    empty: "Граф з\u2019явиться після побудови моделі",
    initial: 'початковий',
    final: 'кінцевий',
    mark_hint: 'Mark = false для всіх станів · при повторному відвідуванні \u2192 повернення до S1',
  },
} as const
