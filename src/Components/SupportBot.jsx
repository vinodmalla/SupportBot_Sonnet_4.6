import { useState, useEffect, useRef } from "react";
import { BotIcon, SendIcon, UserCircle, RefreshCw, PhoneCall } from "lucide-react";

const SYSTEM_PROMPT = `You are Aura, the AI concierge for Instincts Bank Ltd — a modern digital bank.

STRICT RULES:
- Only answer questions related to banking, accounts, cards, loans, transfers, fees, or Instincts Bank services
- If asked anything outside banking (sports, coding, general knowledge etc), politely say: "I'm only able to assist with banking-related questions. Is there anything about your Instincts Bank account I can help with?"
- Keep replies short and direct — no long paragraphs, no storytelling
- Never make up account-specific data

What you know about Instincts Bank:
- Savings APY: 4.9%, no minimum balance, withdraw anytime
- Monthly fee: $0. No overdraft fees
- Free ATMs at 55,000+ Allpoint locations
- Debit card: free virtual + physical Visa, instant freeze via app
- Transfers: free between Instincts Bank users, 1.2% fee for external transfers
- FDIC insured up to $250,000
- Security: 256-bit encryption, biometric login, 2FA
- Support: support@instinctsbank.com | 1-800-467-8265 (Mon–Fri 8am–8pm ET)
- For live account data (balance, transactions), direct user to the app or human support

Always end with one short follow-up offer.`;

const QUICK_REPLIES = [
  "What are your fees?",
  "How do I freeze my card?",
  "What is the savings APY?",
  "How do I send money?",
];


function MarkdownRenderer({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") { elements.push(<br key={i} />); i++; continue; }

    // Heading ## or ###
    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: "13px", color: "var(--gold)", marginTop: "8px", marginBottom: "2px" }}>{parseInline(line.slice(4))}</div>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: "14px", color: "var(--gold)", marginTop: "8px", marginBottom: "2px" }}>{parseInline(line.slice(3))}</div>);
      i++; continue;
    }

    // Bullet: - or *
    if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} style={{ marginBottom: "3px" }}>{parseInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={"ul" + i} style={{ paddingLeft: "18px", margin: "4px 0" }}>{items}</ul>);
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} style={{ marginBottom: "3px" }}>{parseInline(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={"ol" + i} style={{ paddingLeft: "18px", margin: "4px 0" }}>{items}</ol>);
      continue;
    }

    // Normal paragraph
    elements.push(<div key={i} style={{ marginBottom: "3px" }}>{parseInline(line)}</div>);
    i++;
  }

  return <div style={{ lineHeight: 1.65 }}>{elements}</div>;
}

function parseInline(text) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) parts.push(<strong key={match.index} style={{ fontWeight: 700, color: "#e6edf3" }}>{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={match.index}>{match[2]}</em>);
    else if (match[3] !== undefined) parts.push(<code key={match.index} style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>{match[3]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

export default function SupportBot() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ib_messages");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showExpert, setShowExpert] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem("ib_messages", JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function callAPI(history) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    return data.content[0].text;
  }

  async function sendMessage() {
    
    const text = inputValue.trim();
    if (!text || isLoading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputValue("");
    setError(null);
    setShowChips(false);
    setIsLoading(true);
    try {
      const reply = await callAPI(updated);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChip(text) {
    if (isLoading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setShowChips(false);
    setError(null);
    setIsLoading(true);
    try {
      const reply = await callAPI(updated);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    try { sessionStorage.removeItem("ib_messages"); } catch {}
    setMessages([]);
    setInputValue("");
    setError(null);
    setShowExpert(false);
    setShowChips(true);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        :root {
          --ink: #0d1117;
          --ink-2: #161b22;
          --ink-3: #21262d;
          --muted: #8b949e;
          --text: #e6edf3;
          --text-dim: #8b949e;
          --gold: #d4a843;
          --gold-light: #f0c96e;
          --gold-dim: rgba(212, 168, 67, 0.15);
          --gold-border: rgba(212, 168, 67, 0.25);
          --teal: #39d9c4;
          --teal-dim: rgba(57, 217, 196, 0.1);
          --red: #f85149;
        }

        .ib-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ib-root { font-family: 'DM Sans', sans-serif; }

        .ib-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 860px;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          background: var(--ink);
          color: var(--text);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--ink-3);
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset;
          position: relative;
        }

        /* Subtle noise texture */
        .ib-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }

        /* Header */
        .ib-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: linear-gradient(135deg, #0f1923 0%, #0d1117 100%);
          border-bottom: 1px solid var(--ink-3);
        }

        .ib-header-left { display: flex; align-items: center; gap: 14px; }

        .ib-logo-ring {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: var(--gold-dim);
          border: 1px solid var(--gold-border);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
        }

        .ib-bank-name {
          font-family: 'DM Serif Display', serif;
          font-size: 17px;
          color: var(--text);
          letter-spacing: 0.01em;
        }

        .ib-agent-line {
          font-size: 11.5px;
          color: var(--text-dim);
          margin-top: 1px;
          display: flex; align-items: center; gap: 5px;
        }

        .ib-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--teal);
          box-shadow: 0 0 6px var(--teal);
          animation: pulse-dot 2.5s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        .ib-new-chat-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 13px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          color: var(--text-dim);
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 8px;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .ib-new-chat-btn:hover { color: var(--text); border-color: var(--gold-border); background: var(--ink-3); }

        /* Body */
        .ib-body {
          position: relative; z-index: 1;
          display: flex;
          flex: 1;
          min-height: 0;
        }

        /* Sidebar */
        .ib-sidebar {
          display: none;
          width: 200px;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px 16px;
          background: rgba(13,17,23,0.7);
          border-right: 1px solid var(--ink-3);
          gap: 16px;
        }

        @media (min-width: 640px) {
          .ib-sidebar { display: flex; }
        }

        .ib-agent-card {
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 12px;
          padding: 14px;
        }

        .ib-agent-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .ib-agent-name {
          font-family: 'DM Serif Display', serif;
          font-size: 15px;
          color: var(--text);
        }

        .ib-agent-status {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px;
          color: var(--teal);
          margin-top: 6px;
        }

        .ib-info-block {
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 12px;
          padding: 12px;
          flex: 1;
        }

        .ib-info-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .ib-stat {
          display: flex; flex-direction: column;
          padding: 8px 0;
          border-bottom: 1px solid var(--ink-3);
        }
        .ib-stat:last-child { border-bottom: none; }

        .ib-stat-value {
          font-family: 'DM Serif Display', serif;
          font-size: 18px;
          color: var(--gold);
          line-height: 1;
        }

        .ib-stat-desc {
          font-size: 10.5px;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .ib-expert-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          color: var(--text-dim);
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ib-expert-btn:hover { color: var(--gold); border-color: var(--gold-border); background: var(--gold-dim); }

        /* Chat */
        .ib-chat-col {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          min-width: 0;
        }

        .ib-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
        }

        .ib-messages::-webkit-scrollbar { width: 4px; }
        .ib-messages::-webkit-scrollbar-track { background: transparent; }
        .ib-messages::-webkit-scrollbar-thumb { background: var(--ink-3); border-radius: 4px; }

        /* Empty state */
        .ib-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 12px;
          color: var(--text-dim);
        }

        .ib-empty-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: var(--gold-dim);
          border: 1px solid var(--gold-border);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
        }

        .ib-empty-title {
          font-family: 'DM Serif Display', serif;
          font-size: 18px;
          color: var(--text);
        }

        .ib-empty-sub {
          font-size: 13px;
          color: var(--text-dim);
          text-align: center;
          max-width: 220px;
          line-height: 1.5;
        }

        /* Message rows */
        .ib-row {
          display: flex;
          animation: fadeUp 0.25s ease-out;
        }
        .ib-row.user { justify-content: flex-end; }
        .ib-row.bot { justify-content: flex-start; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ib-msg-inner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          max-width: 72%;
        }
        .ib-row.user .ib-msg-inner { flex-direction: row-reverse; }

        .ib-avatar {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ib-avatar.user { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.22); color: #818cf8; }
        .ib-avatar.bot { background: var(--gold-dim); border: 1px solid var(--gold-border); color: var(--gold); }

        .ib-bubble {
          padding: 10px 15px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.6;
        }
        .ib-bubble.user {
          background: #3730a3;
          color: #fff;
          border-top-right-radius: 4px;
          border: 1px solid rgba(99,102,241,0.3);
        }
        .ib-bubble.bot {
          background: var(--ink-2);
          color: var(--text);
          border: 1px solid var(--ink-3);
          border-top-left-radius: 4px;
        }

        /* Loading */
        .ib-loading-row { display: flex; justify-content: flex-start; animation: fadeUp 0.25s ease-out; }
        .ib-dots {
          display: flex; align-items: center; gap: 5px;
          padding: 12px 16px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 14px;
          border-top-left-radius: 4px;
        }
        .ib-dot-bounce {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--gold);
          animation: bounce-dot 1.4s ease-in-out infinite;
        }
        .ib-dot-bounce:nth-child(2) { animation-delay: 0.18s; }
        .ib-dot-bounce:nth-child(3) { animation-delay: 0.36s; }

        @keyframes bounce-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        /* Error */
        .ib-error {
          text-align: center;
          font-size: 12px;
          color: var(--red);
          background: rgba(248,81,73,0.08);
          border: 1px solid rgba(248,81,73,0.2);
          border-radius: 8px;
          padding: 8px 14px;
        }

        /* Expert card */
        .ib-expert-card {
          background: var(--ink-2);
          border: 1px solid var(--gold-border);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: fadeUp 0.2s ease-out;
        }
        .ib-expert-card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 15px;
          color: var(--gold);
          margin-bottom: 4px;
        }
        .ib-expert-contact { font-size: 13px; color: var(--text); }
        .ib-expert-hours { font-size: 11.5px; color: var(--text-dim); }
        .ib-expert-dismiss {
          font-size: 11px;
          color: var(--text-dim);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          margin-top: 4px;
          text-align: left;
          transition: color 0.2s;
        }
        .ib-expert-dismiss:hover { color: var(--text); }

        /* Chips */
        .ib-chips {
          padding: 0 20px 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ib-chip {
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          padding: 6px 13px;
          border-radius: 100px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
        }
        .ib-chip:hover {
          color: var(--gold);
          border-color: var(--gold-border);
          background: var(--gold-dim);
        }

        /* Input bar */
        .ib-input-bar {
          padding: 14px 20px;
          background: rgba(13,17,23,0.8);
          border-top: 1px solid var(--ink-3);
        }

        .ib-form {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 12px;
          padding: 5px 5px 5px 14px;
          transition: border-color 0.2s;
        }
        .ib-form:focus-within { border-color: var(--gold-border); }

        .ib-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 13.5px;
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          padding: 7px 0;
        }
        .ib-input::placeholder { color: var(--text-dim); }
        .ib-input:disabled { opacity: 0.5; }

        .ib-send {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px;
          border-radius: 9px;
          background: var(--gold);
          border: none;
          color: var(--ink);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s, transform 0.15s;
        }
        .ib-send:hover { background: var(--gold-light); }
        .ib-send:active { transform: scale(0.93); }
        .ib-send:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div className="ib-root" style={{ padding: '12px', background: '#070b10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ib-shell">

          {/* Header */}
          <header className="ib-header">
            <div className="ib-header-left">
              <div className="ib-logo-ring">
                <BotIcon size={18} />
              </div>
              <div>
                <div className="ib-bank-name">Instincts Bank Ltd</div>
                <div className="ib-agent-line">
                  <span className="ib-dot" />
                  Aura · AI Concierge
                </div>
              </div>
            </div>
            <button className="ib-new-chat-btn" onClick={handleNewChat}>
              <RefreshCw size={12} />
              New Chat
            </button>
          </header>

          {/* Body */}
          <div className="ib-body">

            {/* Sidebar */}
            <aside className="ib-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="ib-agent-card">
                  <div className="ib-agent-label">Agent</div>
                  <div className="ib-agent-name">Aura</div>
                  <div className="ib-agent-status">
                    <span className="ib-dot" />
                    Online
                  </div>
                </div>
                <div className="ib-info-block">
                  <div className="ib-info-label">Highlights</div>
                  <div className="ib-stat">
                    <span className="ib-stat-value">4.9%</span>
                    <span className="ib-stat-desc">Savings APY</span>
                  </div>
                  <div className="ib-stat">
                    <span className="ib-stat-value">$0</span>
                    <span className="ib-stat-desc">Monthly fee</span>
                  </div>
                  <div className="ib-stat">
                    <span className="ib-stat-value">55k+</span>
                    <span className="ib-stat-desc">Free ATMs</span>
                  </div>
                </div>
              </div>
              <button className="ib-expert-btn" onClick={() => setShowExpert(true)}>
                <PhoneCall size={13} />
                Talk to an Expert
              </button>
            </aside>

            {/* Chat column */}
            <div className="ib-chat-col">
              <div className="ib-messages">

                {/* Empty state */}
                {messages.length === 0 && (
                  <div className="ib-empty">
                    <div className="ib-empty-icon">
                      <BotIcon size={22} />
                    </div>
                    <div className="ib-empty-title">Hello, I'm Aura</div>
                    <div className="ib-empty-sub">Ask me anything about your Instincts Bank account or services.</div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                  <div key={i} className={`ib-row ${msg.role === "user" ? "user" : "bot"}`}>
                    <div className="ib-msg-inner">
                      <div className={`ib-avatar ${msg.role === "user" ? "user" : "bot"}`}>
                        {msg.role === "user" ? <UserCircle size={15} /> : <BotIcon size={15} />}
                      </div>
                      <div className={`ib-bubble ${msg.role === "user" ? "user" : "bot"}`}>
                        {msg.role === "user" ? msg.content : <MarkdownRenderer text={msg.content} />}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {isLoading && (
                  <div className="ib-loading-row">
                    <div className="ib-dots">
                      <span className="ib-dot-bounce" />
                      <span className="ib-dot-bounce" />
                      <span className="ib-dot-bounce" />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && <div className="ib-error">{error}</div>}

                {/* Expert card */}
                {showExpert && (
                  <div className="ib-expert-card">
                    <div className="ib-expert-card-title">Connect with a Human Expert</div>
                    <div className="ib-expert-contact">📧 support@instinctsbank.com</div>
                    <div className="ib-expert-contact">📞 1-800-467-8265</div>
                    <div className="ib-expert-hours">Mon–Fri · 8am–8pm ET</div>
                    <button className="ib-expert-dismiss" onClick={() => setShowExpert(false)}>Dismiss</button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick reply chips */}
              {showChips && messages.length === 0 && (
                <div className="ib-chips">
                  {QUICK_REPLIES.map((q) => (
                    <button key={q} className="ib-chip" onClick={() => handleChip(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="ib-input-bar">
                <div className="ib-form">
                  <input
                    className="ib-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) sendMessage(); }}
                    placeholder="Ask about your account…"
                  />
                  <button
                    
                    className="ib-send" onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                  >
                    <SendIcon size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}