// ─────────────────────────────────────────────────────────────────────────────
// PoC #3: the ONE regex feature std::regex cannot do — LOOKBEHIND
//
// codeGenerator.translateCondition() converts a single '=' to '==' but leaves
// ==, !=, <=, >= alone, via a JS regex with lookbehind + lookahead:
//     /(?<![=!<>])=(?!=)/g
//
// std::regex uses the (older) ECMAScript grammar and supports lookAHEAD (?=)/(?!)
// but NOT lookBEHIND (?<=)/(?<!) — constructing such a pattern throws
// std::regex_error. This file demonstrates the failure, then the hand-written
// replacement that matches the TS output exactly.
//
// Build: clang++ -std=c++17 -O2 lookbehind_demo.cpp -o lookbehind_demo
// ─────────────────────────────────────────────────────────────────────────────
#include <string>
#include <regex>
#include <iostream>
#include <sstream>

using std::string;

// (1) Prove std::regex rejects lookbehind at construction time.
void demoStdRegexFails() {
  try {
    std::regex bad(R"((?<![=!<>])=(?!=))");   // lookbehind — unsupported
    (void)bad;
    std::cerr << "  [unexpected] std::regex accepted lookbehind\n";
  } catch (const std::regex_error& e) {
    std::cerr << "  std::regex_error (as expected): lookbehind not supported\n";
  }
}

// (2) Hand-written equivalent of /(?<![=!<>])=(?!=)/g → '=='
//     Replace a lone '=' (not part of ==, !=, <=, >=) with '=='.
string singleEqToDoubleEq(const string& s) {
  string out;
  for (size_t i = 0; i < s.size(); i++) {
    char c = s[i];
    if (c == '=') {
      char prev = i > 0 ? s[i - 1] : '\0';
      char next = i + 1 < s.size() ? s[i + 1] : '\0';
      bool prevBlocks = (prev == '=' || prev == '!' || prev == '<' || prev == '>');
      bool nextBlocks = (next == '=');
      if (!prevBlocks && !nextBlocks) { out += "=="; continue; }
    }
    out += c;
  }
  return out;
}

// Full port of translateCondition: the and/or/not parts DO port to std::regex
// (word-boundary \b is supported); only the '=' part needs the hand scan.
string translateCondition(const string& cond) {
  if (cond == "true") return "true";
  string s = cond;
  s = std::regex_replace(s, std::regex(R"(\band\b)", std::regex::icase), "&&");
  s = std::regex_replace(s, std::regex(R"(\bor\b)",  std::regex::icase), "||");
  s = std::regex_replace(s, std::regex(R"(\bnot\b)", std::regex::icase), "!");
  s = singleEqToDoubleEq(s);
  return s;
}

int main() {
  std::cerr << "std::regex lookbehind check:\n";
  demoStdRegexFails();
  std::cerr << "\n";

  std::stringstream buf; buf << std::cin.rdbuf();
  string input = buf.str();
  // strip a single trailing newline if present
  if (!input.empty() && input.back() == '\n') input.pop_back();

  std::cout << translateCondition(input);
  return 0;
}
