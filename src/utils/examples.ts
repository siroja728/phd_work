export const EXAMPLES: Record<string, string> = {
  sign: `{ true } [ read(x) ]
{ x > 0 } [ print("positive") ]
{ x < 0 } [ print("negative") ]
{ x == 0 } [ print("zero") ]`,

  minmax: `{ true } [ read(a); read(b) ]
{ a > b } [ print(a) ]
{ a <= b } [ print(b) ]`,

  grade: `{ true } [ read(score) ]
{ score >= 90 } [ print("A") ]
{ score >= 75 } [ print("B") ]
{ score >= 60 } [ print("C") ]
{ score < 60 } [ print("F") ]`,

  expr: `{ true } [ read(A); read(B); read(C); read(D); read(E); result = A * (B + C / D) - E ]
{ result > 0 } [ print("positive") ]
{ result < 0 } [ print("negative") ]
{ result == 0 } [ print("zero") ]`,
}

export type ExampleKey = keyof typeof EXAMPLES
