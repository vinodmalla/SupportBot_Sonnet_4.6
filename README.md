# 🤖 Aura — AI Customer Support Bot

> **Take-Home Assessment · Full Stack Engineer (New Grad)**  
> Built with React · Claude API · Claude.ai Artifact

---

## 🔗 Links

| | |
|---|---|
| 🌐 **Live Artifact** | [https://claude.ai/public/artifacts/affe1176-5058-4757-8d0f-91d9400352ee](#)  |
| 📹 **Walkthrough Video** | [https://www.loom.com/share/9f469b524118407282e82f0ce29a11cb](#)  |
| 💻 **GitHub Repo** | [https://github.com/vinodmalla/SupportBot_Sonnet_4.6](#) |

---

## 📌 What I Built

**Aura** is an AI-powered customer support concierge for a fictional digital bank — **Instincts Bank Ltd**.

Users can chat with Aura to ask questions about account fees, savings rates, card management, transfers, and security. The bot is strictly scoped to banking topics only — it politely refuses anything unrelated and escalates to human support when needed.

---

## ✨ Features

| Feature | Details |
|---|---|
| 💬 Real AI chat | Live API calls to `claude-sonnet-4-20250514` via `fetch` |
| 🧠 Conversation memory | Full message history sent with every API request |
| 🏦 Bot persona | Aura — concierge for Instincts Bank Ltd with a strict system prompt |
| ⚡ Quick reply chips | One-tap shortcuts for 4 common questions |
| 👤 Human escalation | "Talk to an Expert" shows contact info card |
| 🔄 New chat / reset | Clears session and resets to empty state |
| ⏳ Loading state | Animated bouncing dots while waiting for response |
| ❌ Error handling | Visible red error banner — no silent failures |
| 💾 Session persistence | Messages saved to `sessionStorage` — survives page refresh |

---

## 🛠️ Tech Stack

- **React** — functional components with hooks (`useState`, `useEffect`, `useRef`)
- **Anthropic Claude API** — `claude-sonnet-4-20250514`
- **Custom CSS** with CSS variables for theming (no Tailwind dependency)
- **DM Serif Display + DM Sans** — Google Fonts for premium banking aesthetic
- **Lucide React** — icons
- **sessionStorage** — client-side message persistence
- **Claude.ai Artifact** — zero-backend deployment

---

## 🏗️ Architecture & Key Decisions

### 1. State Storage — `sessionStorage`
Plain React state resets on every page refresh. `sessionStorage` persists the conversation for the lifetime of the browser tab — so refreshing doesn't wipe the chat. It clears automatically when the tab closes, which is appropriate for a support session (no stale data).

### 2. Conversation Memory — Full history per request
Claude has no memory between API calls. I send the entire `messages` array with every request so the bot remembers what was said earlier in the conversation. This is the standard multi-turn pattern for LLM-based chat.

### 3. Browser API Header
Direct browser-to-API calls to Anthropic require this header:
```
anthropic-dangerous-direct-browser-access: true
```
Without it, the browser blocks the request at the CORS level and no response is returned.

### 4. Separation of `sendMessage` and `handleChip`
Both functions call the same `callAPI` helper but are kept separate because chips auto-submit without needing the input field, while `sendMessage` reads from the input state. Sharing `callAPI` avoids duplicating the fetch logic.

### 5. Local `updated` variable instead of reading state
After adding the user message, I use a local `updated` variable to call the API — not the `messages` state — because React state updates are asynchronous. Reading `messages` right after `setMessages` would return the old array.

```js
const updated = [...messages, userMsg];
setMessages(updated);       // updates UI
callAPI(updated);           // uses local var, not stale state
```

---

## 📁 Project Structure

```
AuraConcierge.jsx
├── SYSTEM_PROMPT        — Bot identity, knowledge base, strict rules
├── QUICK_REPLIES        — 4 chip shortcut questions
└── SupportBot()         — Main component
    ├── callAPI()        — fetch wrapper for Anthropic API
    ├── sendMessage()    — handles input field submit
    ├── handleChip()     — handles quick reply chip click
    └── handleNewChat()  — clears session and resets all state
```

---

## ⚠️ Challenges Faced

**1. Silent API failures**  
First version showed nothing when the API call failed. Fixed by wrapping `callAPI` in `try/catch` and rendering a visible error banner so the user always knows something went wrong.

**2. Browser blocking the Anthropic API**  
All requests were failing silently due to a missing CORS header. Adding `anthropic-dangerous-direct-browser-access: true` to every fetch call fixed it.

**3. Stale state in async functions**  
Using `messages` directly after `setMessages` returned the old array because state updates are batched. Fixed by storing the updated array in a local variable and passing that to both `setMessages` and `callAPI`.

---

## 🚀 What I'd Improve With More Time

- **Streaming responses** — Show tokens as they arrive instead of waiting for the full reply
- **Markdown rendering** — Parse `**bold**`, `- bullets`, and `## headings` from Claude's response into proper HTML
- **Accessibility** — ARIA labels, keyboard navigation, screen reader support
- **Unit tests** — Cover the API error paths and state management logic



## 👨‍💻 Author

**Malla Vinodkumar**  
Full Stack Developer · MERN Stack · 2.6 years @ HCL Technologies  
📧 mallavinod95@gmail.com  

