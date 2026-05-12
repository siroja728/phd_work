export const EXAMPLES: Record<string, string> = {
  // IF3 — sequential multi-condition (sign of a number)
  sign: `{ true } [ read(x); ]
{ x > 0 } [ print("positive"); ]
{ x < 0 } [ print("negative"); ]
{ x == 0 } [ print("zero"); ]`,

  // IF1 — goto-based if/else (maximum of two numbers)
  ifelse: `{ true } [ read(a); read(b); ]
{ a > b } [ max = a; goto done; ]
{ a <= b } [ max = b; ]
:done { true } [ print(max); ]`,

  // DO2 — while loop (factorial, also exercises Stack Trace)
  while: `{ true } [ read(n); result = 1; ]
:loop { n > 1 } [ result = result * n; n = n - 1; goto loop; ]
{ n <= 1 } [ print(result); ]`,

  // DO3 — do-while (sum of N user inputs)
  dowhile: `{ true } [ read(n); sum = 0; ]
:body { true } [ read(x); sum = sum + x; n = n - 1; ]
{ n > 0 } [ goto body; ]
{ n <= 0 } [ print(sum); ]`,

  // Stack Trace — complex arithmetic expression A*(B+C/D)-E
  expr: `{ true } [ read(A); read(B); read(C); read(D); read(E); result = A * (B + C / D) - E; ]
{ result > 0 } [ print("positive"); ]
{ result < 0 } [ print("negative"); ]
{ result == 0 } [ print("zero"); ]`,

  // MEMO — semaphore-guarded shared resource inside a loop
  memo: `{ true } [ read(n); ]
:step { n > 0 } [ n = n - 1; goto step; ] <sem: sharedData>
{ n <= 0 } [ print(n); ]`,

  // PARALLEL — 3 threads: sum (DO2) + factorial (DO2) + counter (DO3), shared output mutex
  parallel: `@summer { true } [ read(n); sum = 0; ]
@summer :add { n > 0 } [ sum = sum + n; n = n - 1; goto add; ]
@summer { n <= 0 } [ print(sum); ] <sem: out>
@factor { true } [ read(m); prod = 1; ]
@factor :mult { m > 1 } [ prod = prod * m; m = m - 1; goto mult; ]
@factor { m <= 1 } [ print(prod); ] <sem: out>
@counter { true } [ read(k); cnt = 0; ]
@counter :body { true } [ cnt = cnt + 1; k = k - 1; ]
@counter { k > 0 } [ goto body; ]
@counter { k <= 0 } [ print(cnt); ] <sem: out>`,
}

export type ExampleKey = keyof typeof EXAMPLES
