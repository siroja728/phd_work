export function InfoPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">info · як записувати</span>
      </div>
      <div className="panel-body info-body">
        <p>Кожен рядок — один предикат:</p>
        <br />
        <code className="info-code">{'{ умова } [ дії ]'}</code>
        <br /><br />
        <p>
          • Перший рядок —{' '}
          <span className="info-accent">початковий стан</span>
        </p>
        <p>
          • Наступні рядки —{' '}
          <span className="info-final">кінцеві стани</span>
        </p>
        <br />
        <p>
          Умови:{' '}
          <code className="info-inline">
            x &gt; 0, x &lt; 0, x == 0, x != 0, true
          </code>
        </p>
        <p>
          Дії:{' '}
          <code className="info-inline">
            read(x), print("..."), z = x + y
          </code>
        </p>
        <br />
        <p className="info-note">
          Mark = false на початку. Якщо стан вже відвідано — повернення до S1.
        </p>
        <br />
        <p className="info-note">
          Арифметичні вирази у діях розбираються стековим алгоритмом
          з парами лексем та пріоритетами операторів.
        </p>
      </div>
    </div>
  )
}
