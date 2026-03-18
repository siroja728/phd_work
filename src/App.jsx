import React, { useState } from 'react';
// Import the recursive parsing engine and AST executor
import { parseDSL, executeAST, generateCode } from './engine';

export default function App() {
  const [dslCode, setDslCode] = useState(
    '{ A != 0} [ { B != 0 } [ X = -C/A; stop ] ]',
  );
  const [contextInput, setContextInput] = useState(
    '{ "A": 1, "B": -5, "C": 6 }',
  );

  const [astOutput, setAstOutput] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [jsCodeOutput, setJsCodeOutput] = useState('');
  const [error, setError] = useState('');

  const handleRun = () => {
    setError('');
    setAstOutput(null);
    setExecutionResult(null);
    setJsCodeOutput('');

    try {
      const context = JSON.parse(contextInput);
      const ast = parseDSL(dslCode);

      setAstOutput(ast);

      // Execute the AST and capture the mutated context
      const contextForExecution = JSON.parse(JSON.stringify(context));
      const executedContext = executeAST(ast, contextForExecution);
      const generated = generateCode(ast);

      setExecutionResult(executedContext);
      setJsCodeOutput(generated);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    // Main full-screen container
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h2 style={{ margin: '0 0 10px 0' }}>⚙️ Предикатний Рушій</h2>

      {/* TOP SECTION: INPUT PANELS */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          height: '35%',
          minHeight: '200px',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Правила (DSL):</h4>
          <textarea
            value={dslCode}
            onChange={(e) => setDslCode(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              fontFamily: 'monospace',
              padding: '10px',
              resize: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Вхідний контекст (JSON):</h4>
          <textarea
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              fontFamily: 'monospace',
              padding: '10px',
              resize: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* MIDDLE SECTION: ACTION BUTTON & ERRORS */}
      <div
        style={{
          margin: '15px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
        }}
      >
        <button
          onClick={handleRun}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          ▶ Запустити рушій
        </button>
        {error && (
          <div
            style={{
              color: '#dc3545',
              fontWeight: 'bold',
              backgroundColor: '#f8d7da',
              padding: '8px 15px',
              borderRadius: '4px',
              border: '1px solid #f5c2c7',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: OUTPUT PANELS */}
      <div style={{ display: 'flex', gap: '15px', flex: 1, minHeight: 0 }}>
        {/* Panel 1: Generated AST */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            overflow: 'hidden',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>
            1. Згенероване AST:
          </h4>
          <pre
            style={{
              flex: 1,
              margin: 0,
              overflow: 'auto',
              fontSize: '13px',
              color: '#333',
            }}
          >
            {astOutput ? JSON.stringify(astOutput, null, 2) : 'Поки пусто...'}
          </pre>
        </div>

        {/* Panel 2: Execution Result */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#e8f5e9',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #c8e6c9',
            overflow: 'hidden',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>
            2. Результат виконання:
          </h4>
          <pre
            style={{
              flex: 1,
              margin: 0,
              overflow: 'auto',
              fontSize: '13px',
              color: '#1b5e20',
            }}
          >
            {executionResult
              ? JSON.stringify(executionResult, null, 2)
              : 'Поки пусто...'}
          </pre>
        </div>

        {/* Panel 3: JS Code output */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#e3f2fd',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #bbdefb',
            overflow: 'hidden',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>
            3. JS Код Автомата:
          </h4>
          <pre
            style={{
              flex: 1,
              margin: 0,
              overflow: 'auto',
              fontSize: '13px',
              color: '#0d47a1',
            }}
          >
            {jsCodeOutput || 'Поки пусто...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
