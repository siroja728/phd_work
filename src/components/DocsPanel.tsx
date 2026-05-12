import { memo } from 'react'
import { useTranslation } from 'react-i18next'

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="docs-section">
      <h3 className="docs-section-title">{title}</h3>
      {children}
    </section>
  )
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="docs-code">{children}</pre>
}

function Row({ code, desc }: { code: string; desc: React.ReactNode }) {
  return (
    <tr className="docs-row">
      <td className="docs-cell-code">
        <code>{code}</code>
      </td>
      <td className="docs-cell-desc">{desc}</td>
    </tr>
  )
}

interface PatternProps {
  tag: string
  tagClass: string
  name: string
  desc: React.ReactNode
  code: string
  extra?: string
}

function Pattern({ tag, tagClass, name, desc, code, extra }: PatternProps) {
  return (
    <div className="docs-pattern">
      <span className={`docs-pattern-tag ${tagClass}`}>{tag}</span>
      <div className="docs-pattern-body">
        <div className="docs-pattern-name">{name}</div>
        <div className="docs-pattern-desc">{desc}</div>
        <CodeBlock>{code}</CodeBlock>
        {extra && <CodeBlock>{extra}</CodeBlock>}
      </div>
    </div>
  )
}

// ── Content definitions ───────────────────────────────────────────────────────

function EnContent() {
  return (
    <>
      <Section title="Predicate line format">
        <CodeBlock>{'{ condition } [ actions; ]'}</CodeBlock>
        <CodeBlock>{':label { condition } [ actions; ]'}</CodeBlock>
        <CodeBlock>{'{ condition } [ actions; ] <sem: resourceName>'}</CodeBlock>
        <table className="docs-table">
          <tbody>
            <Row code=":label" desc="Optional. Names this state — other states can jump here with goto label." />
            <Row code="{ condition }" desc="Guard expression. The state body executes only when this is true." />
            <Row code="[ actions ]" desc="Semicolon-separated list of operations to perform." />
            <Row code="<sem: res>" desc="Optional. Attaches a semaphore guard around the resource function res()." />
          </tbody>
        </table>
      </Section>

      <Section title="Parallel threads">
        <p className="docs-note" style={{ marginBottom: 8 }}>
          Prefix any line with <code>@threadName</code> to assign it to a named thread. All
          threads run concurrently; the code generator emits one <code>std::thread</code> per
          group. Semaphores become <code>std::mutex</code> + <code>lock_guard</code>.
        </p>
        <CodeBlock>{`@writer { true } [ read(n) ]
@writer :write { n > 0 } [ n = n-1; goto write ] <sem: io>
@writer { n <= 0 } [ print(n) ]
@reader { true } [ read(m) ]
@reader :read { m > 0 } [ m = m-1; goto read ] <sem: io>
@reader { m <= 0 } [ print(m) ]`}</CodeBlock>
        <table className="docs-table">
          <tbody>
            <Row code="@name" desc="Assigns this state to thread 'name'. States without @prefix form a single-thread automaton." />
            <Row code="<sem: res>" desc="In multi-thread mode generates lock_guard<mutex> instead of a spin-lock." />
          </tbody>
        </table>
      </Section>

      <Section title="Conditions">
        <table className="docs-table">
          <tbody>
            <Row code="true" desc="Unconditional — always executes." />
            <Row code="x > 0" desc="Comparison operators: ==  !=  <  >  <=  >=" />
            <Row code="x > 0 and y < 10" desc={<>Logical AND <span style={{ opacity: 0.6 }}>(also: &amp;&amp;)</span></>} />
            <Row code="a = 0 or b = 0" desc={<>Logical OR <span style={{ opacity: 0.6 }}>(also: ||). Single = is treated as ==</span></>} />
            <Row code="not done" desc={<>Logical NOT <span style={{ opacity: 0.6 }}>(also: !)</span></>} />
          </tbody>
        </table>
      </Section>

      <Section title="Actions">
        <table className="docs-table">
          <tbody>
            <Row code="read(x)" desc="Read one value from stdin into variable x." />
            <Row code='print(x)' desc='Print a value or string to stdout. Strings use "double quotes".' />
            <Row code="x = expr" desc="Assignment. The right-hand side can be any arithmetic expression." />
            <Row
              code="result = A * (B + C / D) - E"
              desc={<>Arithmetic: <code>+ − * /</code> with parentheses. Generates three-address intermediate code — visible in the <strong>Stack Trace</strong> tab.</>}
            />
            <Row code="goto label" desc="Unconditional jump to the named state. Creates a back-edge or forward jump in the automaton." />
          </tbody>
        </table>
        <p className="docs-note">
          Each action must end with <code>;</code> — e.g. <code>read(n); sum = 0;</code>
        </p>
      </Section>

      <Section title="Detected patterns → IR nodes">
        <Pattern
          tag="EX" tagClass="docs-tag-ex"
          name="Linear execution"
          desc={<>A state with condition <code>true</code> whose only outgoing transition is also <code>true</code>. Maps directly to sequential statements.</>}
          code={'{ true } [ read(n); sum = 0; ]'}
        />
        <Pattern
          tag="IF3" tagClass="docs-tag-if3"
          name="Multi-branch conditional (if / else-if)"
          desc={<>A chain of states each guarded by a distinct non-<code>true</code> condition, no <code>goto</code>.</>}
          code={`{ true } [ read(x); ]\n{ x > 0 } [ print("pos"); ]\n{ x < 0 } [ print("neg"); ]\n{ x == 0 } [ print("zero"); ]`}
        />
        <Pattern
          tag="IF1" tagClass="docs-tag-if1"
          name="If / else with goto"
          desc={<>A state with 2+ outgoing transitions where one branch ends with <code>goto label</code>, skipping the else body.</>}
          code={`{ true } [ read(a); read(b); ]\n{ a > b } [ max = a; goto done; ]\n{ a <= b } [ max = b; ]\n:done { true } [ print(max); ]`}
        />
        <Pattern
          tag="DO2" tagClass="docs-tag-do2"
          name="While loop (condition first)"
          desc={<>A state with a <code>goto</code> back to itself — generates a <code>while</code> loop.</>}
          code={`:loop { n > 1 } [ result = result * n; n = n - 1; goto loop; ]\n{ n <= 1 } [ print(result); ]`}
        />
        <Pattern
          tag="DO3" tagClass="docs-tag-do3"
          name="Do-while loop (condition last)"
          desc={<>A body state followed by a condition state whose <code>goto</code> points back to the body — generates a <code>do … while</code> loop.</>}
          code={`{ true } [ read(n); sum = 0; ]\n:body { true } [ read(x); sum = sum + x; n = n - 1; ]\n{ n > 0 } [ goto body; ]\n{ n <= 0 } [ print(sum); ]`}
        />
        <Pattern
          tag="MEMO" tagClass="docs-tag-memo"
          name="Semaphore-guarded resource"
          desc={<>Attach <code>{'<sem: name>'}</code> to any state. Generates a mutex spin-lock around the resource function call.</>}
          code={`:step { n > 0 } [ n = n - 1; goto step; ] <sem: sharedData>`}
          extra={`// generated:\nwhile (sharedData);\nsharedData = true;\nsharedData();\nsharedData = false;`}
        />
      </Section>

      <Section title="Tips">
        <ul className="docs-tips">
          <li>Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (or <kbd>⌘</kbd>+<kbd>Enter</kbd>) to run without clicking the button.</li>
          <li>Press <kbd>Ctrl</kbd>+<kbd>F</kbd> (or click <strong>Format</strong>) to auto-format the predicate text — normalises spacing around operators, keywords, and semicolons.</li>
          <li>Use <kbd>Tab</kbd> in the editor to insert 2 spaces.</li>
          <li>Arithmetic in actions is decomposed into three-address form — see the <strong>Stack Trace</strong> tab.</li>
          <li>The <strong>IR</strong> tab shows the intermediate representation tree before code generation.</li>
          <li>The <strong>Graph</strong> tab renders the automaton — back-edges route left, self-loops route right.</li>
        </ul>
      </Section>
    </>
  )
}

function UkContent() {
  return (
    <>
      <Section title="Формат рядка предиката">
        <CodeBlock>{'{ умова } [ дії; ]'}</CodeBlock>
        <CodeBlock>{':мітка { умова } [ дії; ]'}</CodeBlock>
        <CodeBlock>{'{ умова } [ дії; ] <sem: імʼяРесурсу>'}</CodeBlock>
        <table className="docs-table">
          <tbody>
            <Row code=":мітка" desc="Необов'язково. Іменує стан — інші стани можуть перейти сюди через goto мітка." />
            <Row code="{ умова }" desc="Охорона стану. Тіло виконується лише коли умова true." />
            <Row code="[ дії ]" desc="Список операцій, розділених крапкою з комою." />
            <Row code="<sem: res>" desc="Необов'язково. Додає семафорний захист навколо виклику функції res()." />
          </tbody>
        </table>
      </Section>

      <Section title="Паралельні потоки">
        <p className="docs-note" style={{ marginBottom: 8 }}>
          Додайте префікс <code>@імʼяПотоку</code> до будь-якого рядка, щоб призначити стан
          потоку. Генератор створює по одному <code>std::thread</code> на групу. Семафори
          стають <code>std::mutex</code> + <code>lock_guard</code>.
        </p>
        <CodeBlock>{`@writer { true } [ read(n) ]
@writer :write { n > 0 } [ n = n-1; goto write ] <sem: io>
@writer { n <= 0 } [ print(n) ]
@reader { true } [ read(m) ]
@reader :read { m > 0 } [ m = m-1; goto read ] <sem: io>
@reader { m <= 0 } [ print(m) ]`}</CodeBlock>
        <table className="docs-table">
          <tbody>
            <Row code="@імʼя" desc="Призначає стан потоку 'імʼя'. Стани без префікса формують однопотоковий автомат." />
            <Row code="<sem: res>" desc="У багатопотоковому режимі генерує lock_guard<mutex> замість спін-блокування." />
          </tbody>
        </table>
      </Section>

      <Section title="Умови">
        <table className="docs-table">
          <tbody>
            <Row code="true" desc="Безумовно — завжди виконується." />
            <Row code="x > 0" desc="Оператори порівняння: ==  !=  <  >  <=  >=" />
            <Row code="x > 0 and y < 10" desc={<>Логічне І <span style={{ opacity: 0.6 }}>(також: &amp;&amp;)</span></>} />
            <Row code="a = 0 or b = 0" desc={<>Логічне АБО <span style={{ opacity: 0.6 }}>(також: ||). Одиночне = трактується як ==</span></>} />
            <Row code="not done" desc={<>Логічне НЕ <span style={{ opacity: 0.6 }}>(також: !)</span></>} />
          </tbody>
        </table>
      </Section>

      <Section title="Дії">
        <table className="docs-table">
          <tbody>
            <Row code="read(x)" desc="Зчитати одне значення зі stdin у змінну x." />
            <Row code="print(x)" desc='Вивести значення або рядок у stdout. Рядки — у "подвійних лапках".' />
            <Row code="x = вираз" desc="Присвоєння. Права частина — довільний арифметичний вираз." />
            <Row
              code="result = A * (B + C / D) - E"
              desc={<>Арифметика: <code>+ − * /</code> з дужками. Генерує трьохадресний проміжний код — видно у вкладці <strong>Stack Trace</strong>.</>}
            />
            <Row code="goto мітка" desc="Безумовний перехід до іменованого стану. Створює зворотну або пряму дугу в автоматі." />
          </tbody>
        </table>
        <p className="docs-note">
          Кожна дія повинна закінчуватись <code>;</code> — напр. <code>read(n); sum = 0;</code>
        </p>
      </Section>

      <Section title="Виявлені шаблони → вузли IR">
        <Pattern
          tag="EX" tagClass="docs-tag-ex"
          name="Лінійне виконання"
          desc={<>Стан з умовою <code>true</code>, єдиний вихідний перехід якого також <code>true</code>. Відповідає послідовним операторам.</>}
          code={'{ true } [ read(n); sum = 0; ]'}
        />
        <Pattern
          tag="IF3" tagClass="docs-tag-if3"
          name="Багатогілковий умовний (if / else-if)"
          desc={<>Ланцюжок станів, кожен з окремою умовою (не <code>true</code>), без <code>goto</code>.</>}
          code={`{ true } [ read(x); ]\n{ x > 0 } [ print("pos"); ]\n{ x < 0 } [ print("neg"); ]\n{ x == 0 } [ print("zero"); ]`}
        />
        <Pattern
          tag="IF1" tagClass="docs-tag-if1"
          name="If / else з goto"
          desc={<>Стан з 2+ вихідними переходами, де одна гілка завершується <code>goto мітка</code> — пропускає тіло else.</>}
          code={`{ true } [ read(a); read(b); ]\n{ a > b } [ max = a; goto done; ]\n{ a <= b } [ max = b; ]\n:done { true } [ print(max); ]`}
        />
        <Pattern
          tag="DO2" tagClass="docs-tag-do2"
          name="Цикл while (умова на початку)"
          desc={<>Стан із <code>goto</code> назад до себе — генерує цикл <code>while</code>.</>}
          code={`:loop { n > 1 } [ result = result * n; n = n - 1; goto loop; ]\n{ n <= 1 } [ print(result); ]`}
        />
        <Pattern
          tag="DO3" tagClass="docs-tag-do3"
          name="Цикл do-while (умова в кінці)"
          desc={<>Стан тіла + стан умови, <code>goto</code> якого повертається до тіла — генерує цикл <code>do … while</code>.</>}
          code={`{ true } [ read(n); sum = 0; ]\n:body { true } [ read(x); sum = sum + x; n = n - 1; ]\n{ n > 0 } [ goto body; ]\n{ n <= 0 } [ print(sum); ]`}
        />
        <Pattern
          tag="MEMO" tagClass="docs-tag-memo"
          name="Семафорний захист ресурсу"
          desc={<>Додайте <code>{'<sem: name>'}</code> до будь-якого стану. Генерує спін-блокування навколо виклику функції ресурсу.</>}
          code={`:step { n > 0 } [ n = n - 1; goto step; ] <sem: sharedData>`}
          extra={`// згенерований код:\nwhile (sharedData);\nsharedData = true;\nsharedData();\nsharedData = false;`}
        />
      </Section>

      <Section title="Поради">
        <ul className="docs-tips">
          <li>Натисніть <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (або <kbd>⌘</kbd>+<kbd>Enter</kbd>), щоб запустити без кліку по кнопці.</li>
          <li>Натисніть <kbd>Ctrl</kbd>+<kbd>F</kbd> (або кнопку <strong>Форматувати</strong>), щоб автоматично відформатувати текст предикатів — нормалізує пробіли навколо операторів, ключових слів і крапок з комою.</li>
          <li>Використовуйте <kbd>Tab</kbd> в редакторі для вставки 2 пробілів.</li>
          <li>Арифметика в діях розкладається у трьохадресну форму — дивіться вкладку <strong>Stack Trace</strong>.</li>
          <li>Вкладка <strong>IR</strong> показує проміжне представлення перед генерацією коду.</li>
          <li>Вкладка <strong>Граф</strong> відображає автомат — зворотні дуги ведуть ліворуч, петлі — праворуч.</li>
        </ul>
      </Section>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function DocsPanelComponent() {
  const { i18n } = useTranslation()
  const isUk = i18n.language === 'uk'

  return (
    <div className="docs-root">
      <h2 className="docs-title">{isUk ? 'Довідка по синтаксису' : 'Syntax Reference'}</h2>
      {isUk ? <UkContent /> : <EnContent />}
    </div>
  )
}

export const DocsPanel = memo(DocsPanelComponent)
