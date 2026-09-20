/**
 * AI AutoFlow - Universal Background Service Worker (Manifest V3)
 * Coordinates tabs across Gemini, ChatGPT, Perplexity & Claude,
 * badge states, and message routing.
 */

const PLATFORM_URLS = {
  gemini: {
    match: '*://gemini.google.com/*',
    openUrl: 'https://gemini.google.com/app',
    name: 'Google Gemini'
  },
  chatgpt: {
    match: '*://chatgpt.com/*',
    fallbackMatch: '*://chat.openai.com/*',
    openUrl: 'https://chatgpt.com/',
    name: 'ChatGPT'
  },
  perplexity: {
    match: '*://*.perplexity.ai/*',
    openUrl: 'https://www.perplexity.ai/',
    name: 'Perplexity AI'
  },
  claude: {
    match: '*://claude.ai/*',
    openUrl: 'https://claude.ai/new',
    name: 'Claude'
  }
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['waitingTimeSeconds', 'initialTopic', 'customPrompt', 'selectedPlatform', 'questionCount', 'hudEnabled']);
  const defaults = {
    selectedPlatform: existing.selectedPlatform ?? 'auto', // 'auto', 'gemini', 'chatgpt', 'perplexity', 'claude'
    waitingTimeSeconds: existing.waitingTimeSeconds ?? 10,
    questionCount: existing.questionCount ?? 10,
    scrollDurationSeconds: 5,
    hudEnabled: existing.hudEnabled ?? true,
    initialTopic: existing.initialTopic ?? "Artificial Intelligence ethics and future consciousness",
    customPrompt: existing.customPrompt ?? "Please generate exactly {count} complex, thought-provoking questions about {topic}. Format your response strictly as a numbered list from 1 to {count} with only the question text on each line, without preamble or conversational filler.",
    flowState: {
      status: 'idle',
      currentQuestionIndex: -1,
      totalQuestions: 0,
      questions: [],
      waitingSecondsLeft: 0,
      scrollSecondsLeft: 0,
      platform: 'unknown',
      lastUpdated: Date.now()
    }
  };
  await chrome.storage.local.set(defaults);
  console.log('[AIAutoFlow] Initialized storage defaults for 4 AI platforms.');
});

// Update extension badge based on runner status
async function updateBadge(status, currentStep = 0, totalSteps = 0) {
  try {
    let badgeText = '';
    let badgeColor = '#6366F1';

    switch (status) {
      case 'asking_initial':
      case 'waiting_initial':
        badgeText = 'INIT';
        badgeColor = '#3B82F6';
        break;
      case 'extracting':
        badgeText = 'PARS';
        badgeColor = '#8B5CF6';
        break;
      case 'waiting_delay':
        badgeText = 'WAIT';
        badgeColor = '#F59E0B';
        break;
      case 'scrolling_slowly':
        badgeText = 'SCRL';
        badgeColor = '#EC4899';
        break;
      case 'sending_next':
      case 'waiting_response':
        badgeText = `${currentStep}/${totalSteps || 10}`;
        badgeColor = '#6366F1';
        break;
      case 'paused':
        badgeText = 'PAUS';
        badgeColor = '#6B7280';
        break;
      case 'completed':
        badgeText = 'DONE';
        badgeColor = '#10B981';
        break;
      case 'stopped':
      case 'idle':
      default:
        badgeText = '';
        break;
    }

    await chrome.action.setBadgeText({ text: badgeText });
    if (badgeText) {
      await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    }
  } catch (err) {
    // Silently ignore badge errors when tabs close
  }
}

// Detect which platform a URL belongs to
function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('chatgpt.com') || url.includes('openai.com')) return 'chatgpt';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('claude.ai')) return 'claude';
  return null;
}

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || !message.action) {
        sendResponse({ success: false, error: 'Missing action parameter' });
        return;
      }

      switch (message.action) {
        case 'STATUS_CHANGED': {
          const { status, currentQuestionIndex, totalQuestions } = message.payload || {};
          const currentStep = (typeof currentQuestionIndex === 'number' && currentQuestionIndex >= 0)
            ? currentQuestionIndex + 1
            : 0;
          await updateBadge(status, currentStep, totalQuestions);
          sendResponse({ success: true });
          break;
        }

        case 'OPEN_OR_FOCUS_PLATFORM': {
          const platformKey = message.payload?.platform || 'gemini';
          const platformInfo = PLATFORM_URLS[platformKey] || PLATFORM_URLS.gemini;

          const queryPatterns = [platformInfo.match];
          if (platformInfo.fallbackMatch) queryPatterns.push(platformInfo.fallbackMatch);

          const existingTabs = await chrome.tabs.query({ url: queryPatterns });
          if (existingTabs.length > 0) {
            const targetTab = existingTabs[0];
            await chrome.tabs.update(targetTab.id, { active: true });
            if (targetTab.windowId) {
              await chrome.windows.update(targetTab.windowId, { focused: true });
            }
            sendResponse({ success: true, tabId: targetTab.id, platform: platformKey });
          } else {
            const newTab = await chrome.tabs.create({ url: platformInfo.openUrl });
            sendResponse({ success: true, tabId: newTab.id, platform: platformKey, created: true });
          }
          break;
        }

        case 'GET_ACTIVE_AI_TAB': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const platform = detectPlatformFromUrl(activeTab?.url);
          sendResponse({
            success: true,
            isAITab: !!platform,
            platform: platform,
            tab: activeTab
          });
          break;
        }

        case 'ENSURE_SCRIPTS_INJECTED': {
          const targetTabId = message.payload?.tabId;
          if (!targetTabId) {
            sendResponse({ success: false, error: 'No tabId provided' });
            return;
          }
          try {
            const tab = await chrome.tabs.get(targetTabId).catch(() => null);
            if (!tab || !tab.url || tab.discarded) {
              sendResponse({ success: false, reason: 'Tab inaccessible or discarded' });
              return;
            }
            const platform = detectPlatformFromUrl(tab.url);
            if (!platform) {
              sendResponse({ success: false, reason: 'Not an AI platform tab' });
              return;
            }

            const ping = await chrome.tabs.sendMessage(targetTabId, { action: 'GET_HUD_STATUS' }).catch(() => null);
            if (!ping) {
              await chrome.scripting.insertCSS({
                target: { tabId: targetTabId },
                files: ['content/floating-hud.css']
              }).catch(() => {});
              await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: [
                  'content/platform-dom.js',
                  'content/automation-runner.js',
                  'content/floating-hud.js'
                ]
              });
              sendResponse({ success: true, injected: true });
            } else {
              sendResponse({ success: true, alreadyInjected: true });
            }
          } catch (injErr) {
            sendResponse({ success: false, error: injErr?.message || String(injErr) });
          }
          break;
        }

        default:
          sendResponse({ success: true, notice: 'Unhandled background action' });
          break;
      }
    } catch (err) {
      console.error('[AIAutoFlow] Error in background handler:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});
