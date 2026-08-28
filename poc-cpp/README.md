# PoC: перенесення core-логіки у C++ (+ WebAssembly)

Мета — довести, що **все алгоритмічне ядро** можна реалізувати на **C++** і
використати у наявному React/TS веб-додатку через **WebAssembly**, зберігши UI.

**Результат: доведено. Увесь core портовано, вивід побайтово тотожний TS,
і той самий C++ працює у браузері через WASM.**

## Архітектура

```
core.hpp  ── єдине джерело правди (parser + detector + generator + stack) ──┐
   │                                                                         │
   ├─ нативні CLI (clang++): predicate_parser / pattern_detector /           │
   │                          code_generator  — для паритетних тестів        │
   │                                                                         │
   └─ wasm_main.cpp (em++) → core_wasm.wasm + core_wasm.mjs ─────────────────┤
                                                                             │
   core.ts (тонка обгортка, той самий API) ← React app (App.tsx/Editor.tsx) ─┘
```

Один `core.hpp` компілюється і нативно (`clang++`), і в WASM (`em++`).

## Паритет із TS — усі стадії побайтово

| Стадія | Джерело TS | Тест | Результат |
|--------|-----------|------|-----------|
| Стековий алгоритм | `stackParser.ts` | 9 виразів | **9/9** |
| Форматування (regex) | `formatPredicates.ts` | 10 предикатів | **10/10** |
| lookbehind → ручний скан | `codeGenerator.translateCondition` | 8 умов | **8/8** |
| Парсер → модель | `predicateParser.ts` | 9 прикладів + 7 крайових | **16/16** |
| Повний конвеєр (model+IR+C++) | усі 3 сервіси | 9 прикладів × 3 стадії | **27/27** |
| **WASM** vs TS (model+IR+C++) | вся система у браузері | 9 прикладів | **9/9** |

**Разом: 79/79 паритетних перевірок побайтово ідентичні.**

## Оцінка ризику regex

З ~59 regex-викликів у core лише **1** (lookbehind у `translateCondition`) не
портується в `std::regex` — замінено ручним скан-циклом (`singleEqToDoubleEq`,
12 рядків). Решта regex переносяться в `std::regex` (ECMAScript-граматика) 1:1.
Загальний ризик міграції — **низький**.

## Збірка та запуск

```bash
# ── нативні CLI (паритетні тести) ──
clang++ -std=c++17 -O2 predicate_parser.cpp -o predicate_parser
clang++ -std=c++17 -O2 pattern_detector.cpp -o pattern_detector
clang++ -std=c++17 -O2 code_generator.cpp   -o code_generator

printf '{ true } [ read(n); ]\n{ n > 0 U n <= 0 } [ n = n-1; ]\n{ X true } [ print(n); ]' \
  | ./code_generator            # → згенерований C++

# ── WASM (браузерний конвеєр) ──
source <emsdk>/emsdk_env.sh
em++ -std=c++17 -O2 wasm_main.cpp -o core_wasm.mjs \
  -s MODULARIZE=1 -s EXPORT_ES6=1 \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']" \
  -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web,node

# перевірка WASM == TS
npx vite-node wasm_test.mjs
```

## npm-команди (перезбірка ядра)

Ядро (`core.hpp`) використовується і нативними CLI, і WASM. Після зміни
`core.hpp` або `wasm_main.cpp` перезберіть WASM:

| Команда | Що робить | Потрібен |
|---------|-----------|----------|
| `npm run build:wasm` | Перезбирає WASM → `src/core-wasm/core_wasm.mjs` + `public/core_wasm.wasm` | Emscripten |
| `npm run test:wasm` | Перевіряє паритет WASM ↔ TS на всіх прикладах | — |
| `npm run build:native` | Перезбирає нативні CLI-інструменти (паритетні тести) | clang++ |

`build:wasm` шукає `em++` на `PATH`, інакше сорсить `$EMSDK/emsdk_env.sh`
(за замовчуванням `~/emsdk`). Встановлення Emscripten:

```bash
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
```

Якщо emsdk в іншому місці: `EMSDK=/шлях/до/emsdk npm run build:wasm`.

## Інтеграція в додаток

`core.ts` — тонка обгортка з тим самим API (`initCore()` + `runCore(text)`).
App.tsx імпортує її замість трьох TS-сервісів; UI не змінюється (див. коментар
у кінці `core.ts`). Vite віддає `.wasm` як asset. Розмір `.wasm` ≈ 308 КБ.

## Як вносити зміни в ядро

Уся логіка живе в **`core.hpp`**. `build:wasm` компілює лише `wasm_main.cpp`,
який підключає `core.hpp` — тобто змінювати треба саме `core.hpp`.

| Файл | Зміни потраплять у WASM? |
|------|--------------------------|
| **`core.hpp`** | ✅ так — тут ВСЯ логіка (parser + detector + generator + stack) |
| `wasm_main.cpp` | ✅ так — точка входу |
| `predicate_parser.cpp` / `pattern_detector.cpp` / `code_generator.cpp` | ❌ ні — тонкі обгортки (~10 рядків), лише викликають `core::…` |
| `stack_parser.cpp` / `format_predicates.cpp` / `lookbehind_demo.cpp` | ❌ ні — ранні окремі PoC із власною копією логіки, історичні демо |

**Порядок дій після зміни `core.hpp`:**

```bash
npm run build:wasm     # перезібрати .wasm (це закомічений артефакт — сам не оновлюється)
npm run test:wasm      # переконатись, що WASM == TS на всіх прикладах
```

> ⚠️ **`.wasm` не перебудовується автоматично.** Звичайні `npm run build` /
> `npm run dev` беруть уже зібраний `.wasm`. Після правок `core.hpp` запускайте
> `build:wasm` вручну, інакше додаток працюватиме зі старою логікою.

> ⚠️ **Тримайте TS-фолбек у синхроні.** Логіка існує у двох місцях: `core.hpp`
> (C++→WASM, основний рушій) і `src/services/*.ts` (TS-фолбек на випадок, якщо
> WASM не завантажився). Якщо змінити одне й не змінити інше — рушії розійдуться.
> `npm run test:wasm` проганяє обидва й **впаде**, якщо вивід C++ ≠ TS — це ваша
> страховка. Це відома ціна підходу «C++ ядро + TS-фолбек» (дубльована логіка);
> альтернатива — прибрати фолбек, тоді джерело правди одне, але додаток не
> працюватиме без успішного завантаження WASM.

## Файли

| Файл | Призначення |
|------|-------------|
| `core.hpp` | **єдине ядро** — parser + detector + generator + stack |
| `predicate_parser.cpp` / `pattern_detector.cpp` / `code_generator.cpp` | тонкі CLI-обгортки для паритетних тестів |
| `stack_parser.cpp` / `format_predicates.cpp` / `lookbehind_demo.cpp` | ранні окремі PoC (стек, regex, lookbehind) |
| `wasm_main.cpp` | Emscripten точка входу (`process(text)` → JSON) |
| `core_wasm.mjs` / `core_wasm.wasm` | зібраний WASM-модуль (закомічені) |
| `core.ts` | TS-обгортка для React-додатку |
| `ts_*_reference.mjs` / `wasm_test.mjs` | TS-еталони й тест WASM для побайтового diff |

## Висновок для дисертації / керівника

- Ядро (парсер предикатів, стековий алгоритм, розпізнавання патернів, генерація
  C++) **повністю реалізовано на C++**.
- Веб-додаток працює **без переписування UI** — C++ виконується в браузері як WASM.
- Тотожність поведінки доведена **79/79 побайтовими тестами**.
- Найризикованіша частина (regex) звелася до одного рядка ручного коду.
