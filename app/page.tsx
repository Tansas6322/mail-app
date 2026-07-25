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

  if (selected.length >= 2) {
    const first = selected[0];
    const last = selected[selected.length - 1];
    const tags = new Set(["@", "&", "$", "#"]);
    if (first === last && tags.has(first)) {
      textarea.setRangeText(selected.slice(1, -1), start, end, "end");
      textarea.focus();
      return;
    }
  }
  textarea.focus();
}

// ★「真戦が \n を改行扱いする」前提：コピー用に実改行を「\n」文字列へ変換
function normalizeForShinsen(text: string) {
  // CRLF/CR を LF に統一
  let t = text.replace(/\r\n?/g, "\n");

  // 末尾に改行が欲しいならここで保証（LF）
  if (!t.endsWith("\n")) t += "\n";

  // 実改行を、見える \n（バックスラッシュ+n）へ
  // JSの "\\n" は文字としての \n になります
  return t.replace(/\n/g, "\\n");
}

// ★地方跨ぎ（奥羽-中部 / 奥羽ー中部 など）を分割して扱う
function splitRegions(regionRaw: string) {
  return regionRaw
    .replace(/ー/g, "-")
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);
}

// iOS判定（Safari/Chrome iOS）
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// DOM選択コピー（iOSでも比較的安定）
function copyTextByExecCommand(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  el.style.top = "0";
  document.body.appendChild(el);

  el.focus();
  el.select();
  el.setSelectionRange(0, el.value.length); // iOS向け

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  document.body.removeChild(el);
  return ok;
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

  // 地方一覧：跨ぎを分割して単体だけを並べる
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const c of all) {
      if (!c.region) continue;
      for (const part of splitRegions(c.region)) set.add(part);
    }
    return Array.from(set).sort();
  }, [all]);

  // 国/地域：地方フィルタ時は「跨ぎ分割後に含む」で絞る
  const provinces = useMemo(() => {
    const filtered = region
      ? all.filter((c) => c.region && splitRegions(c.region).includes(region))
      : all;
    const set = new Set(filtered.map((c) => c.province).filter(Boolean));
    return Array.from(set).sort();
  }, [all, region]);

  const filteredCastles = useMemo(() => {
    const q = query.trim();
    return all
      .filter((c) => {
        if (!region) return true;
        if (!c.region) return false;
        return splitRegions(c.region).includes(region);
      })
      .filter((c) => (province ? c.province === province : true))
      .filter((c) => (q ? c.name.includes(q) : true))
      .slice(0, 300);
  }, [all, region, province, query]);

  const onInsert = (c: Castle) => {
    const text = `${c.name}(${c.x},${c.y}) `;
    const ta = textareaRef.current;
    if (!ta) return;
    insertAtSelection(ta, text);
    setBody(ta.value);
  };

  // ★真戦用コピー：改行は「\n」文字列としてコピー
  const copyAllForShinsen = () => {
    const normalized = normalizeForShinsen(body);

    // iOS Chromeで効くことが多いのでまずClipboard APIを試す
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(normalized)
        .then(() => alert(isIOS() ? "コピーしました（\\n形式 / iOS）" : "コピーしました（\\n形式）"))
        .catch(() => {
          const ok = copyTextByExecCommand(normalized);
          alert(ok ? "コピーしました（fallback）" : "コピーに失敗しました");
        });
      return;
    }

    const ok = copyTextByExecCommand(normalized);
    alert(ok ? "コピーしました（fallback）" : "コピーに失敗しました");
  };

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>信長の野望 真戦 御触書エディタ</h1>

      <section style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>本文</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => textareaRef.current && applyColor(textareaRef.current, "@")} style={colorBtn()} title="@青@">
              青
            </button>
            <button type="button" onClick={() => textareaRef.current && applyColor(textareaRef.current, "&")} style={colorBtn()} title="&赤&">
              赤
            </button>
            <button type="button" onClick={() => textareaRef.current && applyColor(textareaRef.current, "$")} style={colorBtn()} title="$緑$">
              緑
            </button>
            <button type="button" onClick={() => textareaRef.current && applyColor(textareaRef.current, "#")} style={colorBtn()} title="#黄#">
              黄
            </button>
            <button type="button" onClick={() => textareaRef.current && removeColor(textareaRef.current)} style={colorBtn()} title="色解除">
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
            placeholder="ここに御触書本文を書いてください"
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
          <button type="button" onClick={copyAllForShinsen} style={btn()}>
            コピー（改行(\n)付）
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          ※このコピーは改行を「\n」という文字として入れます（信長真戦側で \n→改行になる前提）。
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
              <option value="S4">S4</option>
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
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例：清洲 / 二条 / 小田原 …" style={input()} />
          </label>
        </div>

        <div style={{ fontWeight: 700 }}>城リスト（クリックで本文に挿入）：{filteredCastles.length} 件表示</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {filteredCastles.map((c, i) => (
            <button
              key={`${c.season}-${c.region}-${c.province}-${c.name}-${c.x}-${c.y}-${i}`}
              type="button"
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
