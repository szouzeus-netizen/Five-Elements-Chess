import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAgent } from "agents/react";
import type { Element, Level, State } from "./game";

const ELEMENTS: Array<[Element, string, string]> = [
  ["water", "水", "#2563eb"],
  ["fire", "火", "#dc2626"],
  ["metal", "金", "#111827"],
  ["wood", "木", "#16a34a"],
  ["earth", "土", "#ca8a04"],
];

const LABELS: Record<Element, string> = {
  water: "水",
  fire: "火",
  metal: "金",
  wood: "木",
  earth: "土",
};

const ROWS = [1, 3, 5, 7, 9];

declare global {
  interface Window {
    __WUXING_RUNTIME__?: { origin?: string };
  }
}

function App() {
  const [gameId] = useState(() => crypto.randomUUID());
  const [state, setState] = useState<State | null>(null);
  const [element, setElement] = useState<Element>("metal");
  const [level, setLevel] = useState<Level>("small");
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const host = window.__WUXING_RUNTIME__?.origin ?? window.location.origin;

  const { stub } = useAgent<State>({
    host,
    name: gameId,
    agent: "wuxingGame",
    onStateUpdate: setState,
  });

  useEffect(() => {
    stub.getState().then(setState).catch(console.error);
  }, [stub]);

  const cells = useMemo(
    () => ROWS.flatMap((count, y) => Array.from({ length: count }, (_, x) => ({ x, y }))),
    [],
  );

  const pieceAt = (x: number, y: number) => state?.board.find((p) => p.x === x && p.y === y);

  async function confirm() {
    if (!pending) return;
    const result = await stub.place({
      owner: state?.turn ?? "black",
      level,
      element,
      x: pending.x,
      y: pending.y,
    });
    if (result?.ok) setPending(null);
  }

  async function reset() {
    await stub.reset();
    setPending(null);
  }

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 1180, margin: "0 auto", padding: 20, color: "#111827" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>五行阵</h1>
          <div style={{ color: "#6b7280", marginTop: 4 }}>对话内交互棋盘 · 当前回合：{state?.turn === "black" ? "黑方" : "白方"}</div>
        </div>
        <button onClick={reset} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>重置棋局</button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(560px, 1fr) 350px", gap: 18 }}>
        <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, boxShadow: "0 4px 18px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            {ROWS.map((count, y) => (
              <div key={y} style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: count }, (_, x) => {
                  const p = pieceAt(x, y);
                  const selected = pending?.x === x && pending?.y === y;
                  const color = p ? ELEMENTS.find(([k]) => k === p.element)?.[2] ?? "#111827" : "#9ca3af";
                  return (
                    <button
                      key={x}
                      title={`${y + 1}-${x + 1}`}
                      onClick={() => setPending({ x, y })}
                      style={{
                        width: 66,
                        height: 58,
                        clipPath: y % 2 === 0 ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(0 0,100% 0,50% 100%)",
                        border: selected ? "3px solid #2563eb" : "1px solid #6b7280",
                        background: p ? (p.owner === "black" ? color : "#fff") : "#f9fafb",
                        color: p ? (p.owner === "black" ? "#fff" : color) : "#9ca3af",
                        fontWeight: 800,
                        fontSize: p?.level === "large" ? 22 : 18,
                        cursor: "pointer",
                        boxShadow: p?.owner === "white" ? `inset 0 0 0 2px ${color}` : undefined,
                      }}
                    >
                      {p ? LABELS[p.element] : `${y + 1}-${x + 1}`}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>选择落子</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {ELEMENTS.map(([key, label, color]) => (
                <button key={key} onClick={() => setElement(key)} style={{ padding: "8px 12px", borderRadius: 10, border: element === key ? `2px solid ${color}` : "1px solid #d1d5db", background: "white", cursor: "pointer" }}>{label}</button>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 7 }}>
              {(["small", "large"] as Level[]).map((key) => (
                <button key={key} onClick={() => setLevel(key)} style={{ flex: 1, padding: 9, borderRadius: 10, border: level === key ? "2px solid #111827" : "1px solid #d1d5db", background: "white", cursor: "pointer" }}>{key === "small" ? "小棋" : "大棋"}</button>
              ))}
            </div>
            <p style={{ marginBottom: 5 }}>选择：{level === "small" ? "小" : "大"}{LABELS[element]}</p>
            <p style={{ marginTop: 0, color: "#6b7280" }}>位置：{pending ? `${pending.y + 1}-${pending.x + 1}` : "未选择"}</p>
            <button onClick={confirm} disabled={!pending} style={{ width: "100%", padding: 11, border: 0, borderRadius: 10, background: "#111827", color: "white", opacity: pending ? 1 : 0.45, cursor: pending ? "pointer" : "not-allowed" }}>确定落子</button>
          </section>

          <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>公开信息</h3>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <div><b>黑方手牌：</b>{formatHand(state?.blackHand)}</div>
              <div><b>白方手牌：</b>{formatHand(state?.whiteHand)}</div>
              <div><b>黑方下一张：</b>{state?.nextBlack ? LABELS[state.nextBlack] : "-"}</div>
              <div><b>白方下一张：</b>{state?.nextWhite ? LABELS[state.nextWhite] : "-"}</div>
              <div><b>供应堆：</b>{formatHand(state?.supply)}</div>
            </div>
          </section>

          <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>最近行动</h3>
            <div style={{ fontSize: 14, maxHeight: 180, overflow: "auto" }}>
              {(state?.history ?? []).slice(-12).reverse().map((item, i) => <div key={`${item}-${i}`} style={{ padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>{item}</div>)}
              {!state?.history?.length && <div style={{ color: "#9ca3af" }}>暂无</div>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function formatHand(hand?: Record<Element, number>) {
  if (!hand) return "-";
  return ELEMENTS.map(([key, label]) => `${label}${hand[key] ?? 0}`).join(" · ");
}

createRoot(document.getElementById("root")!).render(<App />);
