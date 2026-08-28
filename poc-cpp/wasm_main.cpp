// Emscripten entry — the whole pipeline behind one exported function.
// process(text) → JSON string { model, ir, code }.
// Same core.hpp as the native CLIs — one source, two targets.
#include "core.hpp"
#include <string>

// Under em++ the macro comes from <emscripten.h>; under a plain compiler (clangd,
// native syntax check) fall back to a no-op so the file parses cleanly everywhere.
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {

EMSCRIPTEN_KEEPALIVE
const char* process(const char* text) {
  static std::string out;
  core::Model model = core::parsePredicates(text ? text : "");
  auto ir = core::detectPatterns(model);
  std::string code = core::generateStructuredCpp(model, ir);
  out = "{\"model\":" + core::emitModel(model) + ",\"ir\":" + core::emitIR(ir) +
        ",\"code\":" + core::jstr(code) + "}";
  return out.c_str();
}

} // extern "C"
