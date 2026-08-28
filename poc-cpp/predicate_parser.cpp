// Thin CLI wrapper over core.hpp — text (stdin) → model JSON (stdout).
// Parity target: src/services/predicateParser.ts  (parsePredicates → model)
#include "core.hpp"
#include <iostream>
#include <sstream>
int main() {
  std::stringstream buf;
  buf << std::cin.rdbuf();
  std::cout << core::emitModel(core::parsePredicates(buf.str()));
  return 0;
}
