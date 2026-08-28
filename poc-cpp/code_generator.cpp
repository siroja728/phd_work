// Thin CLI wrapper over core.hpp — text (stdin) → generated C++ source (stdout).
// Parity target: src/services/codeGenerator.ts  (generateStructuredCpp)
// Runs the FULL chain: parse → detect → generate.
#include "core.hpp"
#include <iostream>
#include <sstream>
int main() {
  std::stringstream buf; buf << std::cin.rdbuf();
  core::Model model = core::parsePredicates(buf.str());
  auto ir = core::detectPatterns(model);
  std::cout << core::generateStructuredCpp(model, ir);
  return 0;
}
