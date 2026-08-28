// Emscripten entry — the whole pipeline behind one exported function.
// process(text) → JSON string { model, ir, code }.
// Same core.hpp as the native CLIs — one source, two targets.
#include "core.hpp"
#include <string>
#include <emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
const char* process(const char* text) {
  static std::string out;
  core::Model model = core::parsePredicates(text ? text : "");
  auto ir = core::detectPatterns(model);
  std::string code = core::generateStructuredCpp(model, ir);
  out = "{\"model\":" + core::emitModel(model) +
        ",\"ir\":" + core::emitIR(ir) +
        ",\"code\":" + core::jstr(code) + "}";
  return out.c_str();
}

} // extern "C"
