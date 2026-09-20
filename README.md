# AI AutoFlow

A Chrome extension that automates multi-turn AI conversations — it generates questions or image prompts on a topic, then auto-sends them one by one with configurable delays.

**Supported platforms:** Google Gemini · ChatGPT · Perplexity AI · Claude

---

## How It Works

Each run follows 6 automatic stages:

| # | Stage | What happens |
|---|---|---|
| 1 | **Ask** | Sends an initial prompt asking the AI to generate N questions/prompts on your topic |
| 2 | **Queue** | Waits for the AI to finish, then extracts all items into the live queue |
| 3 | **Wait** | Counts down a configurable delay before each question (default: 10s) |
| 4 | **Scroll** | Smoothly scrolls down the chat for 5 seconds |
| 5 | **Send** | Types and submits the next question, waits for the AI to finish answering |
| 6 | **Done** | Repeats steps 3–5 until all questions are sent, then stops automatically |

---

## Features

- **Two prompt modes** — Generate complex questions *or* detailed image prompts
- **Configurable** — Set topic, number of questions (3–20), and waiting delay
- **Floating HUD** — Draggable on-page overlay that shows live status, countdown, and controls
- **Activity Log** — Timestamped log of every automation event in the popup
- **Self-healing HUD** — Survives page navigation and SPA re-renders via MutationObserver
- **Platform auto-detect** — Detects which AI tab is active and adapts automatically

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the project folder
4. To reload after changes: click the **🔄** icon on the extension card

---

## Quick Start

1. Open any supported AI site (Gemini, ChatGPT, Perplexity, or Claude)
2. The **Floating HUD** appears in the bottom-right corner
3. Set your topic and options in the popup, then click **Start Auto Flow**
4. Watch the automation run — use Pause / Stop anytime from the popup or HUD

---

## ☕ Support

- **Trakteer**: [teer.id/gmd.inc](https://teer.id/gmd.inc)
- **Buy Me a Coffee**: [buymeacoffee.com/gmd.inc](https://www.buymeacoffee.com/gmd.inc)
- **Crypto (USDT/ETH/EVM)**: `0x8cD08357a2a56ed90D0137AE7bee324bd772B90d`
