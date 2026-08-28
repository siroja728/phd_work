// Thin CLI wrapper over core.hpp — text (stdin) → IR JSON (stdout).
// Parity target: src/services/patternDetector.ts  (parse → detectPatterns → IR)
#include "core.hpp"
#include <iostream>
#include <sstream>
int main() {
  std::stringstream buf;
  buf << std::cin.rdbuf();
  core::Model model = core::parsePredicates(buf.str());
  std::cout << core::emitIR(core::detectPatterns(model));
  return 0;
}
