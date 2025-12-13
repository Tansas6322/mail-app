"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { castleRepo, Castle } from "@/lib/castleRepo";

function insertAtSelection(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.setRangeText(text, start, end, "end");
  textarea.focus();
}

// 選択範囲を色タグで囲む（未選択なら何もしない）
function applyColor(textarea: HTMLTextAreaElement, tag: string) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  if (start === end) return;

  const selected = textarea.value.slice(start, end);
  const colored = `${tag}${selected}${tag}`;
  textarea.setRangeText(colored, start, end, "end");
  textarea.focus();
}

// 選択範囲の色タグを解除（完全に @...@ &...& $...$ #...# の形なら外す）
function removeColor(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  if (start === end) return;

  const selected = textarea.value.slice(start, end);
  const uncolored = selected.replace(/^([@&#$])(.*)\1$/s, "$2");

  textarea.setRangeText(uncolored, start, end, "end");
  textarea.focus();
}

// 全文コピー用：改行コードを整形（CRLF/CR→LF）し、末尾に改行を保証
function normalizeNewlines(text: string) {
  let t = text.replace(/\r\n?/g, "\n");
  if (!t.endsWith("\n")) t += "\n";
  return t;
}

export default function Page() {
  const [season, setSeason] = useState("S1");
  const [region, setRegion] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");

  const [all, setAll] = useState<Castle[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    (async () => {
      const data = await castleRepo.listBySeason(season);
      setAll(data);
    })();
  }, [season]);

  const regions = useMemo(() => {
    const set = new Set(all.map((c) => c.region).filter(Boolean));
    return Array.from(set).sort();
  }, [all]);

  const provinces = useMemo(() => {
    const filtered = region ? all.filter((c) => c.region === region) : all;
    const set = new Set(filtered.map((c) => c.province).filter(Boolean));
    return Array.from(set).sort();
  }, [all, region]);

  const filteredCastles = useMemo(() => {
    const q = query.trim();
    return all
      .filter((c) => (region ? c.region === region : true))
      .filter((c) => (province ? c.province === province : true))
      .filter((c) => (q ? c.name.includes(q) : true))
      .slice(0, 300);
  }, [all, region, province, query]);

  const onInsert = (c: Castle) => {
    // 見やすいよう末尾にスペースを1つ付与
    const text = `${c.name}(${c.x},${c.y}) `;
    const ta = textareaRef.current;
    if (!ta) return;
    insertAtSelection(ta, text);
    setBody(ta.value);
  };

  // 改行コードを整形してコピー（末尾改行も付与）
  const copyAll = async () => {
    const normalized = normalizeNewlines(body);
    await navigator.clipboard.writeText(normalized);
    alert("改行付きでコピーしました");
  };

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>信長の野望 真戦 メールエディタ</h1>

      <section style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>本文</div>

          {/* 色ボタン */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => textareaRef.current && applyColor(textareaRef.current, "@")}
              style={colorBtn()}
              title="@青@"
            >
              青
            </button>
            <button
              type="button"
              onClick={() => textareaRef.current && applyColor(textareaRef.current, "&")}
              style={colorBtn()}
              title="&赤&"
            >
              赤
            </button>
            <button
              type="button"
              onClick={() => textareaRef.current && applyColor(textareaRef.current, "$")}
              style={colorBtn()}
              title="$緑$"
            >
              緑
            </button>
            <button
              type="button"
              onClick={() => textareaRef.current && applyColor(textareaRef.current, "#")}
              style={colorBtn()}
              title="#黄#"
            >
              黄
            </button>

            <button
              type="button"
              onClick={() => textareaRef.current && removeColor(textareaRef.current)}
              style={colorBtn()}
              title="色解除"
            >
              解除
            </button>

            <span style={{ opacity: 0.7, fontSize: 12, alignSelf: "center" }}>
              ※文字を選択してから色ボタン／解除
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="ここにメール本文を書いてください"
            rows={10}
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 10,
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={copyAll} style={btn()}>
            全文コピー（改行付き）
          </button>
        </div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>シーズン</div>
            <select
              value={season}
              onChange={(e) => {
                setSeason(e.target.value);
                setRegion("");
                setProvince("");
                setQuery("");
              }}
              style={select()}
            >
              <option value="S1">S1</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>地方</div>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setProvince("");
              }}
              style={select()}
            >
              <option value="">（全て）</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>国/地域</div>
            <select value={province} onChange={(e) => setProvince(e.target.value)} style={select()}>
              <option value="">（全て）</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700 }}>城名検索</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例：清洲 / 二条 / 小田原 …"
              style={input()}
            />
          </label>
        </div>

        <div style={{ fontWeight: 700 }}>城リスト（クリックで本文に挿入）：{filteredCastles.length} 件表示</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {filteredCastles.map((c, i) => (
            <button
              key={`${c.season}-${c.region}-${c.province}-${c.name}-${c.x}-${c.y}-${i}`}
              onClick={() => onInsert(c)}
              style={cardBtn()}
            >
              <div style={{ fontWeight: 800 }}>{c.name}</div>
              <div style={{ opacity: 0.8, fontSize: 13 }}>
                {c.region} / {c.province}
              </div>
              <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                ({c.x},{c.y})
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #222",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function colorBtn(): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function select(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#fff",
  };
}

function input(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    width: "100%",
  };
}

function cardBtn(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  };
}
