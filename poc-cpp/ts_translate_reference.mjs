// TS reference — replicates codeGenerator.translateCondition (internal, not exported).
// Verbatim copy of the logic in src/services/codeGenerator.ts.
const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data.replace(/\n$/, '')))
})

function translateCondition(cond) {
  if (cond === 'true') return 'true'
  return cond
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/(?<![=!<>])=(?!=)/g, '==')
}

process.stdout.write(translateCondition(input))
