import { useState, useEffect } from "react";
import type { StackSnapshot, PairItem } from "./stackParser";

interface Props {
  tokens: string[];
  snapshots: StackSnapshot[];
}

export function StackDiagram({ tokens, snapshots }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [snapshots]);

  if (!snapshots.length) return null;

  const snap = snapshots[step];
  const isEnd = snap.tokenIndex >= tokens.length;

  return (
    <section className="card diagram-card">
      <div className="diagram-header">
        <h2>Схема роботи алгоритму</h2>
        <div className="diagram-nav">
          <button
            className="nav-btn"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            &#9664; Назад
          </button>
          <span className="step-counter">
            Крок {step + 1} / {snapshots.length}
          </span>
          <button
            className="nav-btn"
            onClick={() =>
              setStep((s) => Math.min(snapshots.length - 1, s + 1))
            }
            disabled={step === snapshots.length - 1}
          >
            Далі &#9654;
          </button>
        </div>
      </div>

      {/* Token tape */}
      <div className="tape-label">Стрічка вхідних лексем:</div>
      <div className="token-tape">
        {tokens.map((t, i) => (
          <div
            key={i}
            className={
              "tape-chip " +
              (i === snap.tokenIndex
                ? "tape-chip--active"
                : i < snap.tokenIndex
                  ? "tape-chip--done"
                  : "tape-chip--pending")
            }
          >
            {t}
            {i === snap.tokenIndex && (
              <span className="tape-arrow">&#9650;</span>
            )}
          </div>
        ))}
        {isEnd && (
          <div className="tape-chip tape-chip--active">
            &#8867;<span className="tape-arrow">&#9650;</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="action-box">
        <span className="action-icon">&#9654;</span>
        <span>{snap.action}</span>
      </div>

      {/* Single stack + working area */}
      <div className="stacks-row">
        <SingleStack stack={snap.stack} />
        <div className="stacks-divider">
          <div className="divider-label">стан</div>
          <div className="divider-arrows">&#8644;</div>
        </div>
        <WorkingArea
          currentPair={snap.currentPair}
          latestData={snap.latestData}
        />
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((step + 1) / snapshots.length) * 100}%` }}
        />
      </div>
    </section>
  );
}

// ── Single stack column ────────────────────────────────────────────────────

function SingleStack({ stack }: { stack: (PairItem | "(")[] }) {
  const display = [...stack].reverse(); // top of stack at top

  return (
    <div className="stack-col stack--blue">
      <div className="stack-col-header">
        <div className="stack-col-label">Стек</div>
        <div className="stack-col-subtitle">Пари лексем</div>
      </div>
      <div className="stack-col-body">
        {display.length === 0 ? (
          <div className="stack-empty-msg">&#8709; порожній</div>
        ) : (
          display.map((item, i) =>
            item === "(" ? (
              <div key={i} className="stack-item stack-item--paren">
                <span className="paren-badge">(</span>
                <span className="stack-item-value paren-label">
                  маркер межі
                </span>
              </div>
            ) : (
              <div
                key={i}
                className={`stack-item stack-item--pair ${i === 0 ? "stack-item--top" : ""}`}
              >
                {i === 0 && <span className="top-badge">top</span>}
                <span className="pair-data">{item.data1}</span>
                <span className="pair-sep">|</span>
                <span className="pair-op">{item.op}</span>
              </div>
            ),
          )
        )}
      </div>
      <div className="stack-col-base">&#9660; дно стеку</div>
    </div>
  );
}

// ── Working area (currentPair + latestData) ────────────────────────────────

function WorkingArea({
  currentPair,
  latestData,
}: {
  currentPair: PairItem | null;
  latestData: string | null;
}) {
  return (
    <div className="stack-col stack--amber working-area">
      <div className="stack-col-header">
        <div className="stack-col-label">Поточний стан</div>
        <div className="stack-col-subtitle">пара + дані поза стеком</div>
      </div>
      <div className="stack-col-body working-body">
        <div className="working-section-label">Поточна пара (data1, op):</div>
        {currentPair ? (
          <div className="stack-item stack-item--top stack-item--pair">
            <span className="pair-data">{currentPair.data1}</span>
            <span className="pair-sep">|</span>
            <span className="pair-op">{currentPair.op}</span>
          </div>
        ) : (
          <div className="stack-item stack-item--empty">&#8709; немає</div>
        )}

        <div className="working-section-label" style={{ marginTop: 14 }}>
          Поточні дані (latestData):
        </div>
        {latestData !== null ? (
          <div className="stack-item stack-item--top">
            <span className="stack-item-value latest-data">{latestData}</span>
          </div>
        ) : (
          <div className="stack-item stack-item--empty">&#8709; немає</div>
        )}
      </div>
      <div className="stack-col-base">правий операнд наступної операції</div>
    </div>
  );
}
