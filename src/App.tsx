import { useState } from "react";
import { StackParser } from "./stackParser";
import type { OperationStep, StackSnapshot } from "./stackParser";
import { StackDiagram } from "./StackDiagram";
import "./App.css";

interface ContextEntry {
  id: number;
  key: string;
  value: string;
}

let idCounter = 1;

function App() {
  const [expression, setExpression] = useState("a + b * (c - d)");
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([
    { id: idCounter++, key: "a", value: "2" },
    { id: idCounter++, key: "b", value: "3" },
    { id: idCounter++, key: "c", value: "10" },
    { id: idCounter++, key: "d", value: "4" },
  ]);
  const [steps, setSteps] = useState<OperationStep[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<StackSnapshot[]>([]);
  const [parsedTokens, setParsedTokens] = useState<string[]>([]);

  const addContextEntry = () => {
    setContextEntries((prev) => [
      ...prev,
      { id: idCounter++, key: "", value: "" },
    ]);
  };

  const removeContextEntry = (id: number) => {
    setContextEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: number, field: "key" | "value", val: string) => {
    setContextEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
    );
  };

  const handleCalculate = () => {
    setError(null);
    setSteps([]);
    setResult(null);

    const context: Record<string, number> = {};
    for (const entry of contextEntries) {
      const k = entry.key.trim();
      const v = parseFloat(entry.value);
      if (k && !isNaN(v)) {
        context[k] = v;
      }
    }

    try {
      const parser = new StackParser(context);
      const res = parser.parse(expression);
      setSteps(parser.steps);
      setResult(res);
      setSnapshots(parser.snapshots);
      setParsedTokens(parser.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="subtitle">Стековий алгоритм</h1>
      </header>

      <main className="app-main">
        <section className="card">
          <h2>Вираз (модель)</h2>
          <input
            className="expr-input"
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Наприклад: a + b * (c - d)"
            spellCheck={false}
          />
          <p className="hint">Підтримуються оператори: + − * / та дужки</p>
        </section>

        <section className="card">
          <h2>Контекст (значення змінних)</h2>
          <div className="context-list">
            {contextEntries.map((entry) => (
              <div key={entry.id} className="context-row">
                <input
                  className="ctx-key"
                  type="text"
                  placeholder="Змінна"
                  value={entry.key}
                  onChange={(e) => updateEntry(entry.id, "key", e.target.value)}
                />
                <span className="ctx-eq">=</span>
                <input
                  className="ctx-val"
                  type="number"
                  placeholder="Значення"
                  value={entry.value}
                  onChange={(e) =>
                    updateEntry(entry.id, "value", e.target.value)
                  }
                />
                <button
                  className="btn-remove"
                  onClick={() => removeContextEntry(entry.id)}
                  title="Видалити"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addContextEntry}>
            + Додати змінну
          </button>
        </section>

        <button className="btn-calc" onClick={handleCalculate}>
          Обчислити
        </button>

        {error && (
          <div className="error-box">
            <strong>Помилка:</strong> {error}
          </div>
        )}

        {steps.length > 0 && (
          <section className="card results">
            <h2>Покрокове виконання</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Операнд 1</th>
                    <th>Оператор</th>
                    <th>Операнд 2</th>
                    <th>Тимчасова зм.</th>
                    <th>Обчислення</th>
                    <th>Результат</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <code>{step.data1}</code>
                      </td>
                      <td>
                        <code className="op">{step.op}</code>
                      </td>
                      <td>
                        <code>{step.data2}</code>
                      </td>
                      <td>
                        <code className="temp">{step.temp}</code>
                      </td>
                      <td className="calc-cell">
                        {step.val1} {step.op} {step.val2}
                      </td>
                      <td className="result-cell">{step.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result !== null && (
              <div className="final-result">
                <span className="final-label">Підсумок:</span>
                <span className="final-value">{result}</span>
              </div>
            )}
          </section>
        )}

        <StackDiagram tokens={parsedTokens} snapshots={snapshots} />
      </main>
    </div>
  );
}

export default App;
