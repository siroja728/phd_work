// Symbol table of action lexemes with priorities — lexeme pair model
// ( has implicit highest priority (barrier in the stack)
// ) has implicit lowest priority (triggers evaluation until matching ()
const ACTION_LEXEMES = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '>': 4,
  '>=': 4,
  '<=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
};

// Built-in function table — extend or override via context for user-defined functions
export const BUILTIN_FUNCTIONS = {
  'Math.sqrt': (x) => Math.sqrt(x),
  'Math.abs': (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  cstod: (c) => parseInt(String(c), 10), // char/string → digit
  isDigit: (c) => /^\d$/.test(String(c)), // cyf predicate: is decimal digit?
};

// Apply one action lexeme: pops its operands from vals and pushes the result
const apply = (op, vals, context) => {
  if (op.startsWith('CALL:')) {
    const name = op.slice(5);
    const arg = vals.pop();
    if (BUILTIN_FUNCTIONS[name]) {
      vals.push(BUILTIN_FUNCTIONS[name](arg));
    } else if (typeof context[name] === 'function') {
      vals.push(context[name](arg));
    } else if (Array.isArray(context[name])) {
      vals.push(context[name][arg]); // array indexing: buff(i) → buff[i]
    } else {
      throw new Error(`Unknown function: "${name}"`);
    }
    return;
  }
  const b = vals.pop(),
    a = vals.pop();
  switch (op) {
    case '+':
      vals.push(a + b);
      break;
    case '-':
      vals.push(a - b);
      break;
    case '*':
      vals.push(a * b);
      break;
    case '/':
      vals.push(a / b);
      break;
    case '>':
      vals.push(a > b);
      break;
    case '<':
      vals.push(a < b);
      break;
    case '>=':
      vals.push(a >= b);
      break;
    case '<=':
      vals.push(a <= b);
      break;
    case '==':
      vals.push(a == b);
      break;
    case '!=':
      vals.push(a != b);
      break;
    case '&&':
      vals.push(a && b);
      break;
    case '||':
      vals.push(a || b);
      break;
  }
};

export const evaluateExpression = (expr, context) => {
  // 1. Lexer: tokenize into data lexemes and action lexemes
  const tokens =
    expr
      .match(
        /'[^']*'|>=|<=|==|!=|&&|\|\||[+\-*/()<>]|Math\.sqrt|Math\.abs|\d+(?:\.\d+)?|true|false|[a-zA-Z_]\w*/g,
      )
      ?.map((t) => t.trim())
      .filter(Boolean) ?? [];

  // 2. Single-pass evaluation using two stacks:
  //    vals — data lexeme stack (operands and intermediate results)
  //    ops  — action lexeme stack (operators and function calls)
  const vals = [];
  const ops = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    if (t.startsWith("'")) {
      // String literal — data lexeme
      vals.push(t.slice(1, -1));
    } else if (!isNaN(t)) {
      vals.push(parseFloat(t));
    } else if (t === 'true') {
      vals.push(true);
    } else if (t === 'false') {
      vals.push(false);
    } else if (t === '(') {
      // Left paren: highest priority barrier on ops stack
      ops.push('(');
    } else if (t === ')') {
      // Right paren: lowest priority — apply everything until matching (
      while (ops.length && ops[ops.length - 1] !== '(')
        apply(ops.pop(), vals, context);
      ops.pop(); // discard (
      // Apply pending function call if one is waiting
      if (ops.length && ops[ops.length - 1].startsWith('CALL:'))
        apply(ops.pop(), vals, context);
    } else if (ACTION_LEXEMES[t] !== undefined) {
      // Action lexeme: compare priority with top of ops stack
      // Pop and apply all ops with higher or equal priority before pushing current
      while (
        ops.length &&
        ACTION_LEXEMES[ops[ops.length - 1]] >= ACTION_LEXEMES[t]
      )
        apply(ops.pop(), vals, context);
      ops.push(t);
    } else if (tokens[idx + 1] === '(') {
      // Identifier followed by ( — function call action lexeme
      ops.push('CALL:' + t);
    } else {
      // Plain identifier — data lexeme (variable)
      if (context[t] === undefined)
        throw new Error(`Undefined variable: "${t}"`);
      vals.push(context[t]);
    }
  }

  // Apply any remaining action lexemes
  while (ops.length) apply(ops.pop(), vals, context);

  return vals[0];
};
