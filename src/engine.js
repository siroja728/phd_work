import { evaluateExpression } from './stackMachine.js';

export const AST_TYPES = {
  BLOCK: 'BLOCK',
  STATEMENT: 'STATEMENT',
};

// 1. PREPROCESSOR: Translates human-readable DSL into an interpretable format
export const preprocessDSL = (text) => {
  return (
    text
      // 1.1 Protect against Cyrillic characters used by mistake
      .replace(/А/g, 'A')
      .replace(/а/g, 'a')
      .replace(/В/g, 'B')
      .replace(/в/g, 'b')
      .replace(/С/g, 'C')
      .replace(/с/g, 'c')
      .replace(/Х/g, 'X')
      .replace(/х/g, 'x')
      .replace(/і/g, 'i')
      .replace(/І/g, 'I')

      // 1.2 Replace logical and mathematical operators
      .replace(/≠/g, '!=')
      .replace(/≥/g, '>=')
      .replace(/≤/g, '<=')
      .replace(/\bAND\b/g, '&&')
      .replace(/\bOR\b/g, '||')

      // 1.3 Unary minus fix. Appends '0-' to negative numbers starting an expression.
      .replace(/([=([{,]|&&|\|\|)\s*-/g, '$1 0-')
      .replace(/^\s*-/g, '0-')

      // 1.4 Native Mathematical functions
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\|([^|]+)\|/g, 'Math.abs($1)')

      // 1.5 Handle squared variables (e.g., 'B^2' becomes '(B*B)')
      .replace(/([a-zA-Z_]\w*|\d+(?:\.\d+)?)\^2/g, '($1*$1)')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')

      // Fix potential double Math object replacements
      .replace(/Math\.Math\.sqrt/g, 'Math.sqrt')
  );
};

// 2. RECURSIVE PARSER: Converts preprocessed code into an AST
export const parseDSL = (input) => {
  const cleanInput = preprocessDSL(input);

  const parseStream = (str) => {
    const nodes = [];
    let i = 0;

    while (i < str.length) {
      if (/\s/.test(str[i])) {
        i++;
        continue;
      }

      // Parse CONDITION block: { ... }
      if (str[i] === '{') {
        let condStart = i + 1;
        let condBalance = 1;
        i++;
        while (i < str.length && condBalance > 0) {
          if (str[i] === '{') condBalance++;
          else if (str[i] === '}') condBalance--;
          i++;
        }
        let condition = str.substring(condStart, i - 1).trim();

        while (i < str.length && /\s/.test(str[i])) i++;

        // Next, look for the BODY block immediately after: [ ... ]
        if (i < str.length && str[i] === '[') {
          let blockStart = i + 1;
          let blockBalance = 1;
          i++;
          while (i < str.length && blockBalance > 0) {
            if (str[i] === '[') blockBalance++;
            else if (str[i] === ']') blockBalance--;
            i++;
          }
          let bodyStr = str.substring(blockStart, i - 1).trim();

          // Recursively parse the body content
          let bodyNodes = parseStream(bodyStr);
          if (bodyNodes.length === 0 && bodyStr.length > 0) {
            bodyNodes = [{ type: AST_TYPES.STATEMENT, expression: bodyStr }];
          }
          nodes.push({ type: AST_TYPES.BLOCK, condition, body: bodyNodes });
        }
      }
      // Parse an unconditional BODY block: [ ... ]
      else if (str[i] === '[') {
        let blockStart = i + 1;
        let blockBalance = 1;
        i++;
        while (i < str.length && blockBalance > 0) {
          if (str[i] === '[') blockBalance++;
          else if (str[i] === ']') blockBalance--;
          i++;
        }
        let contentStr = str.substring(blockStart, i - 1).trim();

        // Recursively parse the body content
        let contentNodes = parseStream(contentStr);
        if (contentNodes.length === 0 && contentStr.length > 0) {
          nodes.push({ type: AST_TYPES.STATEMENT, expression: contentStr });
        } else {
          nodes.push(...contentNodes);
        }
      } // Skip 'OR' keyword. Array structure implies independent sequential block execution.
      else if (str.substring(i, i + 2).toUpperCase() === 'OR') {
        i += 2;
      } else {
        i++;
      }
    }
    return nodes;
  };

  return parseStream(cleanInput);
};

// 3. RECURSIVE INTERPRETER: Evaluates the AST against the given context
// Returns true if a 'stop' was hit, false otherwise.
const executeASTInner = (nodes, context) => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type === AST_TYPES.BLOCK) {
      const isTrue = evaluateExpression(node.condition, context);

      if (isTrue) {
        // If condition is true, execute block body recursively
        const stopped = executeASTInner(node.body, context);
        if (stopped) return true; // Propagate halt signal
      }
    } else if (node.type === AST_TYPES.STATEMENT) {
      const acts = node.expression
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (let act of acts) {
        if (act === 'stop') return true; // Halt signal

        if (act.includes('=')) {
          const parts = act.split('=');
          const varName = parts[0].trim();
          const expr = parts.slice(1).join('=').trim();
          context[varName] = evaluateExpression(expr, context);
        }
      }
    }
  }
  return false; // No stop hit
};

export const executeAST = (nodes, context) => {
  executeASTInner(nodes, context);
  return context;
};

const prefixVars = (str) => {
  return str.replace(/[a-zA-Z_]\w*/g, (match) => {
    if (['Math', 'sqrt', 'abs', 'true', 'false'].includes(match)) {
      return match;
    }
    return `context.${match}`;
  });
};

// 4. RECURSIVE CODE GENERATOR: Converts AST into JS execution string
export const generateCode = (nodes, level = 1, isRoot = true) => {
  const indent = '  '.repeat(level);
  let code = '';

  if (isRoot) {
    code += `function executeDSL(context) {\n`;
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type === AST_TYPES.BLOCK) {
      code += `${indent}if (${prefixVars(node.condition)}) {\n`;
      code += generateCode(node.body, level + 1, false); // Recursive code generation
      code += `${indent}}\n`;
    } else if (node.type === AST_TYPES.STATEMENT) {
      const acts = node.expression
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (let act of acts) {
        if (act === 'stop') {
          code += `${indent}return context;\n`;
        } else if (act.includes('=')) {
          const parts = act.split('=');
          const varName = parts[0].trim();
          const expr = parts.slice(1).join('=').trim();
          code += `${indent}context.${varName} = ${prefixVars(expr)};\n`;
        }
      }
    }
  }

  if (isRoot) {
    code += `  return context;\n`;
    code += `}\n`;
  }
  return code;
};
