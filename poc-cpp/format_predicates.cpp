// ─────────────────────────────────────────────────────────────────────────────
// PoC #2: C++ port of src/utils/formatPredicates.ts  (REGEX-HEAVY module)
//
// Purpose: measure the real cost of porting a regex-dense module. Unlike the
// stack parser (char-classes only), this file is ~15 regex replacements incl.
// lookahead (?![=]), negated classes [^<>!=], case-insensitive keywords, and
// the temporal U/X canonicalization.
//
// Finding: std::regex uses the ECMAScript grammar, so nearly every JS regex
// here ports 1:1 — lookahead, \b, \s, char classes, backreferences ($1) all
// work. The ONE JS feature std::regex lacks is *lookbehind* — this module does
// not use it (it uses a negated char class instead), so it ports cleanly.
// (See lookbehind_demo.cpp for the codeGenerator case that DOES need a rewrite.)
//
// Build: clang++ -std=c++17 -O2 format_predicates.cpp -o format_predicates
// ─────────────────────────────────────────────────────────────────────────────
#include <string>
#include <vector>
#include <regex>
#include <iostream>
#include <sstream>

namespace {
using std::string;
using std::regex;

string trim(const string& s) {
  size_t a = s.find_first_not_of(" \t\r\n\f\v");
  if (a == string::npos) return "";
  size_t b = s.find_last_not_of(" \t\r\n\f\v");
  return s.substr(a, b - a + 1);
}

// ── normalizeCondition — the regex-dense core ─────────────────────────────────
string normalizeCondition(const string& raw) {
  string s = trim(raw);
  // Each line mirrors one .replace() in the TS source, same order.
  s = std::regex_replace(s, regex(R"(\s*>=\s*)"), " >= ");
  s = std::regex_replace(s, regex(R"(\s*<=\s*)"), " <= ");
  s = std::regex_replace(s, regex(R"(\s*!=\s*)"), " != ");
  s = std::regex_replace(s, regex(R"(\s*==\s*)"), " == ");
  // single-char comparisons — negated class + lookahead, both supported
  s = std::regex_replace(s, regex(R"(([^<>!=])\s*>\s*(?![=]))"), "$1 > ");
  s = std::regex_replace(s, regex(R"(([^<>!=])\s*<\s*(?![=]))"), "$1 < ");
  // logical keywords — case-insensitive
  s = std::regex_replace(s, regex(R"(\s+and\s+)", std::regex::icase), " and ");
  s = std::regex_replace(s, regex(R"(\s+or\s+)",  std::regex::icase), " or ");
  s = std::regex_replace(s, regex(R"(\bnot\s+)",  std::regex::icase), "not ");
  // temporal operators — 'until' → 'U' (first only), leading 'next' → 'X'
  s = std::regex_replace(s, regex(R"(\s+(?:U|[Uu]ntil)\s+)"), " U ",
                         std::regex_constants::format_first_only);
  s = std::regex_replace(s, regex(R"(^(?:X|[Nn]ext)\b)"), "X");
  // collapse multiple spaces
  s = std::regex_replace(s, regex(R"(\s{2,})"), " ");
  return trim(s);
}

// ── normalizeSingleAction ─────────────────────────────────────────────────────
string normalizeSingleAction(const string& act) {
  string t = trim(act);
  if (t.empty()) return "";

  if (std::regex_search(t, regex(R"(^read\s*\()")))
    return std::regex_replace(t, regex(R"(^read\s*\()"), "read(");
  if (std::regex_search(t, regex(R"(^print\s*\()")))
    return std::regex_replace(t, regex(R"(^print\s*\()"), "print(");

  std::smatch m;
  if (std::regex_match(t, m, regex(R"(^goto\s+(\w+)$)")))
    return "goto " + m[1].str();

  size_t eq = t.find('=');
  if (eq != string::npos && eq > 0) {
    string lhs = trim(t.substr(0, eq));
    string rhs = trim(t.substr(eq + 1));
    if (std::regex_match(lhs, regex(R"(^[A-Za-z_][A-Za-z0-9_]*$)")))
      return lhs + " = " + rhs;
  }
  return t;
}

string normalizeActions(const string& raw) {
  std::vector<string> acts;
  std::stringstream ss(raw);
  string part;
  while (std::getline(ss, part, ';')) {
    string a = normalizeSingleAction(part);
    if (!a.empty()) acts.push_back(a);
  }
  if (acts.empty()) return "";
  string out;
  for (size_t i = 0; i < acts.size(); i++) { if (i) out += "; "; out += acts[i]; }
  return out + ";";
}

// ── formatLine ────────────────────────────────────────────────────────────────
string formatLine(const string& line) {
  string trimmed = trim(line);
  if (trimmed.empty()) return "";

  string rest = trimmed;
  std::vector<string> parts;
  std::smatch m;

  if (std::regex_match(rest, m, regex(R"(^@(\w+)\s*([\s\S]*)$)"))) {
    parts.push_back("@" + m[1].str());
    rest = trim(m[2].str());
  }
  if (std::regex_match(rest, m, regex(R"(^:(\w+)\s*([\s\S]*)$)"))) {
    parts.push_back(":" + m[1].str());
    rest = trim(m[2].str());
  }
  if (!std::regex_match(rest, m, regex(R"(^\{([^}]*)\}\s*([\s\S]*)$)")))
    return trimmed; // unparseable — unchanged
  parts.push_back("{ " + normalizeCondition(m[1].str()) + " }");
  rest = trim(m[2].str());

  if (!std::regex_match(rest, m, regex(R"(^\[([^\]]*)\]\s*([\s\S]*)$)")))
    return trimmed;
  parts.push_back("[ " + normalizeActions(m[1].str()) + " ]");
  rest = trim(m[2].str());

  if (std::regex_search(rest, m, regex(R"(<([^:>]+):([^>]+)>)")))
    parts.push_back("<" + trim(m[1].str()) + ": " + trim(m[2].str()) + ">");

  string out;
  for (size_t i = 0; i < parts.size(); i++) { if (i) out += " "; out += parts[i]; }
  return out;
}

// ── formatPredicates (public) ─────────────────────────────────────────────────
string formatPredicates(const string& text) {
  std::vector<string> lines;
  std::stringstream ss(text);
  string line;
  while (std::getline(ss, line, '\n')) lines.push_back(formatLine(line));

  std::vector<string> out;
  bool prevBlank = false;
  for (const string& l : lines) {
    bool blank = l.empty();
    if (blank && prevBlank) continue;
    out.push_back(l);
    prevBlank = blank;
  }
  string joined;
  for (size_t i = 0; i < out.size(); i++) { if (i) joined += "\n"; joined += out[i]; }
  return trim(joined);
}

} // namespace

int main() {
  std::stringstream buf; buf << std::cin.rdbuf();
  std::cout << formatPredicates(buf.str());
  return 0;
}
