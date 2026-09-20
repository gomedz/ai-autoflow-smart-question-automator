# Chrome Web Store Publication Listing: AI AutoFlow

## 1. Store Listing Information

### Extension Name
**AI AutoFlow - Multi-AI Question Automator (Gemini, ChatGPT, Perplexity, Claude)**

### Short Description (max 132 chars)
Automate question workflows across Gemini, ChatGPT, Perplexity & Claude: ask 10 complex questions, queue, wait, scroll, & auto-send.

### Detailed Description
**AI AutoFlow** is an automation productivity tool designed for the four major conversational AI platforms: Google Gemini, ChatGPT, Perplexity AI, and Claude. It automates deep research and multi-turn inquiry workflows with structured sequencing and smooth in-page navigation.

#### Supported Platforms:
- **Google Gemini** (`gemini.google.com`)
- **ChatGPT** (`chatgpt.com` & `chat.openai.com`)
- **Perplexity AI** (`perplexity.ai`)
- **Claude** (`claude.ai`)

#### Core Features:
- **Automatic 10-Question Generation**: Submits an initial prompt asking the AI to formulate 10 complex questions on your chosen topic.
- **Intelligent Response Parsing & Queueing**: Monitors the AI's response in real time, extracts the 10 questions, and loads them into a live queue.
- **Customizable Waiting Delays**: Configure intervals between messages with live countdown timers on both the Floating HUD and popup.
- **Smooth 5-Second Downward Scroll**: Before sending each subsequent question, the extension slowly scrolls down the conversation container for exactly 5.0 seconds.
- **Autonomous Sequential Dispatch**: Types and submits each question automatically using native-compatible DOM events, and waits for the AI to complete its answer before proceeding.
- **Auto-Stop on Completion**: Automatically halts all execution cleanly once the 10th question has been answered.
- **Unified 4-Platform Selector & In-Page HUD**: Features an extension toolbar popup with a 4-option platform switch bar and a draggable floating HUD that adapts its branding and theme to whichever platform is active.

---

## 2. Permissions Justification

| Permission | Scope / Use Case | Plain-English Justification for Reviewers |
|---|---|---|
| `storage` | Extension data persistence | Saves user preferences locally (waiting interval, custom topic, starter prompt templates, selected platform) and maintains active execution queue state across browser sessions. |
| `tabs` | Browser tab querying | Identifies open AI tabs (Gemini, ChatGPT, Perplexity, Claude) to route commands and provide 1-click platform switching. |
| `activeTab` | Focused tab interaction | Grants temporary execution permission to communicate with the currently active AI tab when the user opens the extension popup. |
| `scripting` | Content script orchestration | Used as a fallback to execute automation scripts within the AI tab context if dynamic injection is required. |

### Host Permissions Justification
- `https://gemini.google.com/*`: Required to interact with Google Gemini's chat interface.
- `https://chatgpt.com/*` & `https://chat.openai.com/*`: Required to interact with ChatGPT's chat interface.
- `https://*.perplexity.ai/*`: Required to interact with Perplexity AI's chat interface.
- `https://claude.ai/*`: Required to interact with Claude's chat interface.

---

## 3. Privacy & Data Use Disclosures

- **Data Collection**: No personal data, user credentials, browsing history, or analytics are collected, stored externally, or transmitted to any third-party servers.
- **Local Storage**: All settings and queued questions remain strictly within the user's browser via `chrome.storage.local`.
- **Single-Purpose Policy**: The extension serves one single purpose: automating message typing and structured queue dispatching across the 4 supported conversational AI platforms.

---

## 4. Version History

- **v1.1.0** (Multi-AI Expansion):
  - Added support for 4 major AI platforms: Gemini, ChatGPT, Perplexity, and Claude.
  - Implemented universal Platform DOM Adapter (`platform-dom.js`).
  - Added 4-Platform Selector UI in extension popup with auto-detection.
  - In-page Floating HUD with adaptive branding per platform.
- **v1.0.0** (Initial Release):
  - Initial 10-complex-question automated starter flow for Gemini.
