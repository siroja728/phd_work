const PRECEDENCE = {
  '||': 1,
  '&&': 2,
  '==': 2,
  '!=': 2,
  '<': 3,
  '>': 3,
  '>=': 3,
  '<=': 3,
  '+': 4,
  '-': 4,
  '*': 5,
  '/': 5,
};

export const evaluateExpression = (expr, context) => {
  // 1. Lexer: Split expression into an array of tokens
  const tokens = expr
    .match(
      /\s*(>=|<=|==|!=|&&|\|\||[+\-*/()<>]|Math\.sqrt|Math\.abs|[a-zA-Z_]\w*|\d+(?:\.\d+)?)\s*/g,
    )
    .map((t) => t.trim())
    .filter(Boolean);

  // 2. Parser: Convert Tokens to Reverse Polish Notation (Shunting-yard algorithm)
  const rpn = [],
    ops = [];

  for (let t of tokens) {
    if (!isNaN(t)) rpn.push(parseFloat(t));
    else if (t === 'true') rpn.push(true);
    else if (t === 'false') rpn.push(false);
    else if (t === '(') ops.push(t);
    else if (t === 'Math.sqrt' || t === 'Math.abs') ops.push(t);
    else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') rpn.push(ops.pop());
      ops.pop();
      if (
        ops.length &&
        (ops[ops.length - 1] === 'Math.sqrt' ||
          ops[ops.length - 1] === 'Math.abs')
      ) {
        rpn.push(ops.pop());
      }
    } else if (PRECEDENCE[t]) {
      while (ops.length && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[t])
        rpn.push(ops.pop());
      ops.push(t);
    } else rpn.push({ var: t }); // Treat as variable
  }
  while (ops.length) rpn.push(ops.pop());

  // 3. Execution: Evaluate RPN via Stack Machine
  const stack = [];
  for (let t of rpn) {
    if (typeof t === 'number' || typeof t === 'boolean') stack.push(t);
    else if (t.var) {
      if (context[t.var] === undefined)
        throw new Error(`Undefined variable: "${t.var}"`);
      stack.push(context[t.var]);
    } else {
      if (t === 'Math.sqrt') {
        const a = stack.pop();
        stack.push(Math.sqrt(a));
      } else if (t === 'Math.abs') {
        const a = stack.pop();
        stack.push(Math.abs(a));
      } else {
        const b = stack.pop(),
          a = stack.pop();
        switch (t) {
          // Mathematical operators
          case '+':
            stack.push(a + b);
            break;
          case '-':
            stack.push(a - b);
            break;
          case '*':
            stack.push(a * b);
            break;
          case '/':
            stack.push(a / b);
            break;

          // Comparison operators
          case '>':
            stack.push(a > b);
            break;
          case '<':
            stack.push(a < b);
            break;
          case '>=':
            stack.push(a >= b);
            break;
          case '<=':
            stack.push(a <= b);
            break;
          case '==':
            stack.push(a == b);
            break;
          case '!=':
            stack.push(a != b);
            break;

          // Logical operators
          case '&&':
            stack.push(a && b);
            break;
          case '||':
            stack.push(a || b);
            break;
        }
      }
    }
  }
  return stack[0];
};
