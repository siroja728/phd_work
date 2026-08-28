// ─────────────────────────────────────────────────────────────────────────────
// PoC: C++ port of src/services/stackParser.ts
//
// Faithful port of the stack algorithm (analyzeExpressions / runStackAlgorithm).
// Goal: prove the core logic ports to C++ with byte-identical output.
//
// Deliberately dependency-free: no std::regex (the TS source only used simple
// character classes), no external JSON library (tiny hand-written emitter).
//
// Native build:  clang++ -std=c++17 -O2 stack_parser.cpp -o stack_parser
// Later (WASM):   emcc   -std=c++17 -O2 stack_parser.cpp ... (same source)
// ─────────────────────────────────────────────────────────────────────────────
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

// ── Priority tables (mirror STACK_PRIORITY / ENTRY_PRIORITY) ──────────────────
int stackPriority(const std::string& op) {
  if (op == "+" || op == "-")
    return 1;
  if (op == "*" || op == "/")
    return 2;
  if (op == "(")
    return 0;
  if (op == "u+" || op == "u-")
    return 3;
  return -1;
}
int entryPriority(const std::string& op) {
  if (op == "+" || op == "-")
    return 1;
  if (op == "*" || op == "/")
    return 2;
  if (op == "(")
    return 3;
  if (op == "u+" || op == "u-")
    return 4;
  return -1;
}
bool isStackOpChar(char c) {
  return c == '+' || c == '-' || c == '*' || c == '/' || c == '(';
}
bool isAlphaU(char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_';
}
bool isAlnumU(char c) {
  return isAlphaU(c) || (c >= '0' && c <= '9');
}
bool isDigit(char c) {
  return c >= '0' && c <= '9';
}
bool isSpace(char c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v';
}

// ── Tokens ────────────────────────────────────────────────────────────────────
enum class Kind { Data, Action, Unary, RParen };
struct Token {
  std::string val;
  Kind kind;
};

std::vector<Token> tokenize(const std::string& expr) {
  std::vector<Token> tokens;
  size_t i = 0, n = expr.size();
  while (i < n) {
    char c = expr[i];
    if (isSpace(c)) {
      i++;
      continue;
    }

    if (isAlphaU(c)) {
      size_t j = i;
      while (j < n && isAlnumU(expr[j]))
        j++;
      tokens.push_back({expr.substr(i, j - i), Kind::Data});
      i = j;
      continue;
    }
    if (isDigit(c)) {
      size_t j = i;
      while (j < n && (isDigit(expr[j]) || expr[j] == '.'))
        j++;
      tokens.push_back({expr.substr(i, j - i), Kind::Data});
      i = j;
      continue;
    }
    if (isStackOpChar(c)) {
      bool hasPrev = !tokens.empty();
      const Token* prev = hasPrev ? &tokens.back() : nullptr;
      bool isUnary = (c == '-' || c == '+') &&
                     (!prev || prev->kind == Kind::Action || prev->kind == Kind::Unary);
      tokens.push_back({std::string(1, c), isUnary ? Kind::Unary : Kind::Action});
      i++;
      continue;
    }
    if (c == ')') {
      tokens.push_back({")", Kind::RParen});
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

// ── Pair stack ────────────────────────────────────────────────────────────────
struct Pair {
  bool hasData;
  std::string data;
  std::string op;
};

struct Result {
  std::vector<std::string> intermediateCode;
  int tempCount = 0;
  int stepCount = 0; // number of trace steps (full step strings omitted in PoC)
};

std::string displayOp(const std::string& op) {
  return (op.size() == 2 && op[0] == 'u') ? std::string(1, op[1]) : op;
}

Result runStackAlgorithm(const std::string& expr, int startTemp = 0) {
  std::vector<Token> tokens = tokenize(expr);
  Result res;
  std::vector<Pair> stack;
  bool hasPending = false;
  std::string pendingData;
  int tempCount = startTemp;

  auto newTemp = [&]() { return "t" + std::to_string(++tempCount); };
  auto step = [&]() { res.stepCount++; };

  auto popAndGenerate = [&](const std::string& rightData) -> std::string {
    Pair top = stack.back();
    stack.pop_back();
    bool isUnary = (top.op == "u-" || top.op == "u+");
    std::string dop = isUnary ? std::string(1, top.op[1]) : top.op;
    std::string t = newTemp();
    std::string line = isUnary ? (dop + rightData + " = " + t)
                               : (top.data + " " + dop + " " + rightData + " = " + t);
    res.intermediateCode.push_back(line);
    return t;
  };

  auto pushOp = [&](const std::string& op) {
    int prIn = entryPriority(op);
    if (op == "(") {
      stack.push_back({false, "", "("});
      step();
      hasPending = false;
      pendingData.clear();
      return;
    }
    while (!stack.empty() && stack.back().op != "(" && stackPriority(stack.back().op) >= prIn) {
      std::string t = popAndGenerate(pendingData);
      step();
      hasPending = true;
      pendingData = t;
    }
    bool isUnary = (op == "u-" || op == "u+");
    if (isUnary) {
      stack.push_back({false, "", op});
      step();
    } else {
      stack.push_back({hasPending, pendingData, op});
      step();
      hasPending = false;
      pendingData.clear();
    }
  };

  size_t i = 0;
  while (i < tokens.size()) {
    const Token& tok = tokens[i];
    const Token* nextTok = (i + 1 < tokens.size()) ? &tokens[i + 1] : nullptr;

    if (tok.kind == Kind::Data) {
      hasPending = true;
      pendingData = tok.val;
      if (!nextTok || nextTok->kind == Kind::RParen) {
        step();
        i++;
      } else if (nextTok->kind == Kind::Action) {
        pushOp(nextTok->val);
        i += 2;
      } else if (nextTok->kind == Kind::Unary) {
        step();
        i++;
      } else {
        i++;
      }
    } else if (tok.kind == Kind::Unary) {
      pushOp("u" + tok.val);
      i++;
    } else if (tok.kind == Kind::Action) {
      if (tok.val == "(")
        pushOp("(");
      else
        pushOp(tok.val);
      i++;
    } else if (tok.kind == Kind::RParen) {
      while (!stack.empty() && stack.back().op != "(") {
        std::string t = popAndGenerate(pendingData);
        step();
        hasPending = true;
        pendingData = t;
      }
      if (!stack.empty()) {
        stack.pop_back();
        step();
      }
      i++;
    } else {
      i++;
    }
  }

  while (!stack.empty()) {
    if (stack.back().op == "(") {
      stack.pop_back();
      break;
    }
    std::string t = popAndGenerate(pendingData);
    step();
    hasPending = true;
    pendingData = t;
  }

  res.tempCount = tempCount;
  return res;
}

// ── Minimal JSON emit ─────────────────────────────────────────────────────────
std::string jsonEscape(const std::string& s) {
  std::string out;
  for (char c : s) {
    switch (c) {
    case '"':
      out += "\\\"";
      break;
    case '\\':
      out += "\\\\";
      break;
    case '\n':
      out += "\\n";
      break;
    case '\t':
      out += "\\t";
      break;
    default:
      out += c;
    }
  }
  return out;
}

struct Analysis {
  std::string expr;
  Result r;
};

// Mirror of analyzeExpressions(actionsStr): split on ';', pull lhs = rhs,
// run the stack algorithm on any rhs containing an arithmetic operator.
std::vector<Analysis> analyzeExpressions(const std::string& actionsStr, int startTemp = 0) {
  std::vector<Analysis> out;
  int runningTemp = startTemp;

  std::stringstream ss(actionsStr);
  std::string assign;
  while (std::getline(ss, assign, ';')) {
    // trim
    size_t a = assign.find_first_not_of(" \t\r\n");
    if (a == std::string::npos)
      continue;
    size_t b = assign.find_last_not_of(" \t\r\n");
    assign = assign.substr(a, b - a + 1);

    size_t eq = assign.find('=');
    if (eq == std::string::npos)
      continue;
    std::string lhs = assign.substr(0, eq);
    std::string rhs = assign.substr(eq + 1);
    auto trim = [](std::string s) {
      size_t x = s.find_first_not_of(" \t\r\n");
      if (x == std::string::npos)
        return std::string();
      size_t y = s.find_last_not_of(" \t\r\n");
      return s.substr(x, y - x + 1);
    };
    lhs = trim(lhs);
    rhs = trim(rhs);

    bool hasOp = false;
    for (char c : rhs)
      if (c == '+' || c == '-' || c == '*' || c == '/' || c == '(' || c == ')') {
        hasOp = true;
        break;
      }
    if (!hasOp)
      continue;

    Result r = runStackAlgorithm(rhs, runningTemp);
    if (r.stepCount > 0) {
      out.push_back({lhs + " = " + rhs, r});
      runningTemp = r.tempCount;
    }
  }
  return out;
}

} // namespace

int main() {
  // Read the whole expression/actions string from stdin.
  std::stringstream buf;
  buf << std::cin.rdbuf();
  std::string input = buf.str();

  std::vector<Analysis> results = analyzeExpressions(input);

  std::string out = "[";
  for (size_t k = 0; k < results.size(); k++) {
    if (k)
      out += ",";
    const Analysis& a = results[k];
    out += "{\"expr\":\"" + jsonEscape(a.expr) + "\",\"intermediateCode\":[";
    for (size_t j = 0; j < a.r.intermediateCode.size(); j++) {
      if (j)
        out += ",";
      out += "\"" + jsonEscape(a.r.intermediateCode[j]) + "\"";
    }
    out += "],\"tempCount\":" + std::to_string(a.r.tempCount) + "}";
  }
  out += "]";
  std::cout << out << std::endl;
  return 0;
}
