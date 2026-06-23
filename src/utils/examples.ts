export const EXAMPLES: Record<string, string> = {
  // IF3 — sequential multi-condition (sign of a number)
  sign: `{ true } [ read(x); ]
{ x > 0 } [ print("positive"); ]
{ x < 0 } [ print("negative"); ]
{ x == 0 } [ print("zero"); ]`,

  // IF1 — goto-based if/else (maximum of two numbers)
  ifelse: `{ true } [ a: int; b: int; max: int; read(a); read(b); ]
{ a > b } [ max = a; goto done; ]
{ a <= b } [ max = b; ]
:done { true } [ print(max); ]`,

  // DO2 — while loop (factorial); demonstrates int type declarations
  while: `{ true } [ n: int; result: int = 1; read(n); ]
:loop { n > 1 } [ result = result * n; n = n - 1; goto loop; ]
{ n <= 1 } [ print(result); ]`,

  // DO3 — do-while (sum of N user inputs)
  dowhile: `{ true } [ n: int; sum: int = 0; x: int; read(n); ]
:body { true } [ read(x); sum = sum + x; n = n - 1; ]
{ n > 0 } [ goto body; ]
{ n <= 0 } [ print(sum); ]`,

  // Stack Trace — complex arithmetic; demonstrates int declarations + expr analysis
  expr: `{ true } [ A: int; B: int; C: int; D: int; E: int; result: int; read(A); read(B); read(C); read(D); read(E); result = A * (B + C / D) - E; ]
{ result > 0 } [ print("positive"); ]
{ result < 0 } [ print("negative"); ]
{ result == 0 } [ print("zero"); ]`,

  // Floating-point average — demonstrates float type
  floats: `{ true } [ n: int; i: int; x: float; total: float = 0.0; read(n); i = n; ]
:loop { i > 0 } [ read(x); total = total + x; i = i - 1; goto loop; ]
{ i <= 0 } [ print(total); ]`,

  // MEMO — semaphore-guarded shared resource inside a loop
  memo: `{ true } [ n: int; read(n); ]
:step { n > 0 } [ n = n - 1; goto step; ] <sem: sharedData>
{ n <= 0 } [ print(n); ]`,

  // PARALLEL — 3 threads: sum (DO2) + factorial (DO2) + counter (DO3), shared output mutex
  parallel: `@summer { true } [ n: int; sum: int = 0; read(n); ]
@summer :add { n > 0 } [ sum = sum + n; n = n - 1; goto add; ]
@summer { n <= 0 } [ print(sum); ] <sem: out>
@factor { true } [ m: int; prod: int = 1; read(m); ]
@factor :mult { m > 1 } [ prod = prod * m; m = m - 1; goto mult; ]
@factor { m <= 1 } [ print(prod); ] <sem: out>
@counter { true } [ k: int; cnt: int = 0; read(k); ]
@counter :body { true } [ cnt = cnt + 1; k = k - 1; ]
@counter { k > 0 } [ goto body; ]
@counter { k <= 0 } [ print(cnt); ] <sem: out>`,
}

export type ExampleKey = keyof typeof EXAMPLES
