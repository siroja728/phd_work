export default {
  // App / title bar
  app: {
    name: 'Automata Studio',
    subtitle: 'Program description to code transformation method',
    file: 'predicates.auto',
  },

  // Editor toolbar
  editor: {
    examples: 'examples…',
    run: 'Run',
    lines_one: '{{count}} line',
    lines_few: '{{count}} lines',
    lines_many: '{{count}} lines',
    language: 'predicates',
    encoding: 'UTF-8',
    placeholder: '{ true } [ read(x) ]\n{ x > 0 } [ print("positive") ]\n{ x < 0 } [ print("negative") ]',
  },

  // Examples
  examples: {
    sign:   'number sign',
    minmax: 'min/max',
    grade:  'grade',
    expr:   'A*(B+C/D)−E',
  },

  // Tab labels
  tabs: {
    main:    'MAIN',
    connect: 'CONNECT',
    stack:   'Stack Trace',
    graph:   'Graph',
    output:  'C++ Output',
  },

  // Empty state
  empty: {
    icon: '◈',
    title: 'No model built yet',
    hint: 'Write predicates in the editor and press',
    run: 'Run',
  },

  // Status bar
  status: {
    ready: 'Ready',
    parsing: 'parsing…',
    no_model: 'No model',
    model: '{{states}} states · {{transitions}} transitions',
  },

  // Tables
  table: {
    main: {
      id: 'Id_state',
      type: 'Type',
      label: 'Label',
      actions: 'List_of_actions',
      mark: 'Mark',
    },
    connect: {
      from: 'Id_state (current)',
      condition: 'Condition',
      to: 'Next_Id_state',
    },
  },

  // State types
  state_type: {
    initial: 'initial',
    final: 'final',
    normal: 'normal',
  },

  // Stack trace
  stack: {
    expr_label: 'expression',
    temp_label: 'temp vars',
    steps_title: 'Parse steps',
    code_title: 'Intermediate code',
    col_step: '#',
    col_pair: 'Current pair',
    col_action: 'Action',
    col_pair_stack: 'Pair stack',
    col_code: 'Intermediate code',
    no_expr: 'No arithmetic expressions found in actions',
  },

  // Code output
  code: {
    copy: 'copy',
    copied: '✓ copied',
    placeholder: '// run the model to generate code',
  },

  // Language switcher
  lang: {
    label: 'Language',
    uk: 'Українська',
    en: 'English',
  },

  // Automaton diagram
  diagram: {
    empty: 'Graph will appear after building the model',
    initial: 'initial',
    final: 'final',
    mark_hint: 'Mark = false for all states · on re-entry → return to S1',
  },
} as const
