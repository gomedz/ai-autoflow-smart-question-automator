/**
 * AI AutoFlow - Universal Popup Controller (popup.js)
 * Supports 4 AI Platforms: Gemini, ChatGPT, Perplexity & Claude.
 * Manages configuration, tab detection, platform switching, and automation sync.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // Platform Definitions
  const PLATFORMS = {
    gemini: {
      name: 'Google Gemini',
      icon: '✨',
      matchHost: 'gemini.google.com',
      openUrl: 'https://gemini.google.com/app',
      accentColor: '#8b5cf6'
    },
    chatgpt: {
      name: 'ChatGPT',
      icon: '🟢',
      matchHost: 'chatgpt.com',
      fallbackHost: 'openai.com',
      openUrl: 'https://chatgpt.com/',
      accentColor: '#10b981'
    },
    perplexity: {
      name: 'Perplexity AI',
      icon: '🔵',
      matchHost: 'perplexity.ai',
      openUrl: 'https://www.perplexity.ai/',
      accentColor: '#38bdf8'
    },
    claude: {
      name: 'Claude',
      icon: '🟠',
      matchHost: 'claude.ai',
      openUrl: 'https://claude.ai/new',
      accentColor: '#f97316'
    }
  };

  // DOM Elements
  const notAiBanner = document.getElementById('not-ai-banner');
  const notAiText = document.getElementById('not-ai-text');
  const openPlatformBtn = document.getElementById('open-platform-btn');
  const platformDetectedPill = document.getElementById('platform-detected-pill');
  const platformCards = document.querySelectorAll('.platform-card');

  const badgeStatus = document.getElementById('badge-status');
  const trackerIndicator = document.getElementById('tracker-indicator');
  const trackerStateTitle = document.getElementById('tracker-state-title');
  const trackerStepCount = document.getElementById('tracker-step-count');
  const trackerDetails = document.getElementById('tracker-details');
  const progressContainer = document.getElementById('tracker-progress-container');
  const progressModeLabel = document.getElementById('progress-mode-label');
  const progressTimerVal = document.getElementById('progress-timer-val');
  const progressBar = document.getElementById('tracker-progress-bar');

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnStop = document.getElementById('btn-stop');
  const btnResetAll = document.getElementById('btn-reset-all');
  const btnShowHud = document.getElementById('btn-show-hud');
  const btnRestoreHudFooter = document.getElementById('btn-restore-hud-footer');
  const toggleFloatingHud = document.getElementById('toggle-floating-hud');
  const btnDonate = document.getElementById('btn-donate');
  const donateModal = document.getElementById('donate-modal');
  const donateBackdrop = document.getElementById('donate-backdrop');
  const btnCloseDonate = document.getElementById('btn-close-donate');
  const btnCopyCrypto = document.getElementById('btn-copy-crypto');
  const cryptoAddr = document.getElementById('crypto-addr');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const tabQCount = document.getElementById('tab-q-count');

  const inputTopic = document.getElementById('input-topic');
  const inputWaitingTime = document.getElementById('input-waiting-time');
  const inputQuestionCount = document.getElementById('input-question-count');
  const countChips = document.querySelectorAll('.chip-count');
  const inputCustomPrompt = document.getElementById('input-custom-prompt');
  const btnResetPrompt = document.getElementById('btn-reset-prompt');
  const btnPromptQuestions = document.getElementById('btn-prompt-questions');
  const btnPromptImages = document.getElementById('btn-prompt-images');
  const presetChips = document.querySelectorAll('.chip:not(.chip-count):not(.chip-prompt)');

  const queueList = document.getElementById('queue-list');
  const logsConsole = document.getElementById('logs-console');

  const DEFAULT_PROMPTS = {
    questions: "Please generate exactly {count} complex, thought-provoking questions about {topic}. Format your response strictly as a numbered list from 1 to {count} with only the question text on each line, without preamble or conversational filler.",
    images: "Please generate exactly {count} detailed, creative text-to-image prompts about {topic}. Format your response strictly as a numbered list from 1 to {count} with only the image prompt on each line, without preamble, conversational filler, or markdown formatting."
  };
  const DEFAULT_PROMPT = DEFAULT_PROMPTS.questions;

  let activeTabId = null;
  let activePlatform = 'gemini'; // Current target platform
  let detectedPlatform = null;

  // 1. Detect platform from active tab URL
  function detectPlatformFromUrl(url) {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('gemini.google.com')) return 'gemini';
    if (lower.includes('chatgpt.com') || lower.includes('openai.com')) return 'chatgpt';
    if (lower.includes('perplexity.ai')) return 'perplexity';
    if (lower.includes('claude.ai')) return 'claude';
    return null;
  }

  // 2. Check active tab and match against platforms
  async function checkActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const plat = detectPlatformFromUrl(tab.url);
        if (plat) {
          activeTabId = tab.id;
          detectedPlatform = plat;
          activePlatform = plat;
          platformDetectedPill.textContent = `Active: ${PLATFORMS[plat].name}`;
          notAiBanner.style.display = 'none';
          updatePlatformCardsUI(plat);
          return true;
        }
      }

      // If active tab is not an AI tab, do not bind activeTabId to a background tab
      activeTabId = null;
      detectedPlatform = null;

      // Check if any AI platform tab exists in window for convenience switcher
      let foundBackgroundPlatform = null;
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      for (const t of allTabs) {
        const plat = detectPlatformFromUrl(t.url);
        if (plat) {
          foundBackgroundPlatform = plat;
          platformDetectedPill.textContent = `Found: ${PLATFORMS[plat].name}`;
          break;
        }
      }

      if (!foundBackgroundPlatform) {
        platformDetectedPill.textContent = 'No AI tab open';
      }

      // If active tab is not the selected platform
      notAiBanner.style.display = 'flex';
      notAiText.textContent = `${PLATFORMS[activePlatform].name} is not open in current tab.`;
      openPlatformBtn.textContent = (foundBackgroundPlatform === activePlatform)
        ? `Switch to ${PLATFORMS[activePlatform].name}`
        : `Open ${PLATFORMS[activePlatform].name}`;
      return false;
    } catch (e) {
      activeTabId = null;
      return false;
    }
  }

  function updatePlatformCardsUI(selected) {
    platformCards.forEach(card => {
      const p = card.getAttribute('data-platform');
      if (p === selected) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Platform card selection listener
  platformCards.forEach(card => {
    card.addEventListener('click', async () => {
      const platKey = card.getAttribute('data-platform');
      activePlatform = platKey;
      updatePlatformCardsUI(platKey);

      await chrome.storage.local.set({ selectedPlatform: platKey });

      // If currently on that platform, focus; if not, show banner button
      if (detectedPlatform === platKey && activeTabId) {
        notAiBanner.style.display = 'none';
      } else {
        notAiBanner.style.display = 'flex';
        notAiText.textContent = `${PLATFORMS[platKey].name} is not the active tab.`;
        openPlatformBtn.textContent = `Switch to ${PLATFORMS[platKey].name}`;
      }
    });
  });

  openPlatformBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
      action: 'OPEN_OR_FOCUS_PLATFORM',
      payload: { platform: activePlatform }
    });
    window.close();
  });

  // 3. Load stored settings
  async function loadSettings() {
    const data = await chrome.storage.local.get([
      'selectedPlatform',
      'waitingTimeSeconds',
      'questionCount',
      'initialTopic',
      'customPrompt',
      'hudEnabled',
      'flowState'
    ]);

    if (data.selectedPlatform && PLATFORMS[data.selectedPlatform]) {
      activePlatform = data.selectedPlatform;
      updatePlatformCardsUI(activePlatform);
    }
    if (data.initialTopic) inputTopic.value = data.initialTopic;
    if (data.waitingTimeSeconds) inputWaitingTime.value = data.waitingTimeSeconds;
    if (data.questionCount) {
      inputQuestionCount.value = data.questionCount;
      updateCountChipsUI(data.questionCount);
    } else {
      updateCountChipsUI(10);
    }
    inputCustomPrompt.value = data.customPrompt || DEFAULT_PROMPTS.questions;
    updatePromptChipsUI(inputCustomPrompt.value);
    if (toggleFloatingHud) {
      toggleFloatingHud.checked = data.hudEnabled !== false;
    }

    if (data.flowState) {
      renderState(data.flowState);
    }
  }

  // Helper to update active starter prompt chip
  function updatePromptChipsUI(val) {
    const v = (val || '').trim();
    if (v === DEFAULT_PROMPTS.images) {
      btnPromptImages?.classList.add('active-chip');
      btnPromptQuestions?.classList.remove('active-chip');
    } else if (v === DEFAULT_PROMPTS.questions) {
      btnPromptQuestions?.classList.add('active-chip');
      btnPromptImages?.classList.remove('active-chip');
    } else {
      const isImage = /image\s*prompt|text-to-image|midjourney|dall-e/i.test(v);
      if (isImage) {
        btnPromptImages?.classList.add('active-chip');
        btnPromptQuestions?.classList.remove('active-chip');
      } else {
        btnPromptQuestions?.classList.add('active-chip');
        btnPromptImages?.classList.remove('active-chip');
      }
    }
  }

  // Helper to update active count chip
  function updateCountChipsUI(countVal) {
    const num = parseInt(countVal, 10);
    countChips.forEach(chip => {
      if (parseInt(chip.getAttribute('data-count'), 10) === num) {
        chip.classList.add('active-chip');
      } else {
        chip.classList.remove('active-chip');
      }
    });
  }

  // 4. Save settings changes
  async function saveSettings() {
    const qCount = Math.max(1, Math.min(50, parseInt(inputQuestionCount.value, 10) || 10));
    const waitSec = Math.max(3, parseInt(inputWaitingTime.value, 10) || 10);
    const hudOn = toggleFloatingHud ? toggleFloatingHud.checked : true;
    await chrome.storage.local.set({
      selectedPlatform: activePlatform,
      initialTopic: inputTopic.value.trim(),
      waitingTimeSeconds: waitSec,
      questionCount: qCount,
      customPrompt: inputCustomPrompt.value.trim(),
      hudEnabled: hudOn
    });

    if (activeTabId) {
      sendToTab({
        action: 'UPDATE_CONFIG',
        payload: {
          topic: inputTopic.value.trim(),
          waitingTimeSeconds: waitSec,
          questionCount: qCount,
          totalQuestions: qCount
        }
      });
    }
  }

  inputTopic.addEventListener('input', saveSettings);
  inputTopic.addEventListener('change', saveSettings);
  inputWaitingTime.addEventListener('change', saveSettings);
  inputQuestionCount.addEventListener('input', () => {
    updateCountChipsUI(inputQuestionCount.value);
  });
  inputQuestionCount.addEventListener('change', () => {
    updateCountChipsUI(inputQuestionCount.value);
    saveSettings();
  });
  inputCustomPrompt.addEventListener('change', saveSettings);

  if (toggleFloatingHud) {
    toggleFloatingHud.addEventListener('change', async () => {
      const enabled = toggleFloatingHud.checked;
      await chrome.storage.local.set({ hudEnabled: enabled });
      if (activeTabId) {
        sendToTab({
          action: 'SET_HUD_ENABLED',
          payload: { enabled }
        });
      }
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(t => {
          if (t.id && t.url && (t.url.includes('gemini.google.com') || t.url.includes('chatgpt.com') || t.url.includes('perplexity.ai') || t.url.includes('claude.ai'))) {
            chrome.tabs.sendMessage(t.id, {
              action: 'SET_HUD_ENABLED',
              payload: { enabled }
            }).catch(() => {});
          }
        });
      });
    });
  }

  // Preset topic chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      inputTopic.value = chip.getAttribute('data-topic');
      saveSettings();
    });
  });

  // Preset question count chips
  countChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const count = parseInt(chip.getAttribute('data-count'), 10);
      inputQuestionCount.value = count;
      updateCountChipsUI(count);
      saveSettings();
    });
  });

  if (btnPromptQuestions) {
    btnPromptQuestions.addEventListener('click', () => {
      inputCustomPrompt.value = DEFAULT_PROMPTS.questions;
      updatePromptChipsUI(DEFAULT_PROMPTS.questions);
      saveSettings();
    });
  }

  if (btnPromptImages) {
    btnPromptImages.addEventListener('click', () => {
      inputCustomPrompt.value = DEFAULT_PROMPTS.images;
      updatePromptChipsUI(DEFAULT_PROMPTS.images);
      if (!inputTopic.value || inputTopic.value === "Artificial Intelligence ethics and future consciousness") {
        inputTopic.value = "Futuristic cyberpunk cityscapes with neon reflections";
      }
      saveSettings();
    });
  }

  inputCustomPrompt.addEventListener('input', () => {
    updatePromptChipsUI(inputCustomPrompt.value);
  });

  btnResetPrompt.addEventListener('click', () => {
    const isImage = btnPromptImages?.classList.contains('active-chip') || /image\s*prompt|text-to-image/i.test(inputCustomPrompt.value);
    inputCustomPrompt.value = isImage ? DEFAULT_PROMPTS.images : DEFAULT_PROMPTS.questions;
    updatePromptChipsUI(inputCustomPrompt.value);
    saveSettings();
  });

  // Tab switching (Config / Queue / Logs)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // Helper to message the active AI tab with automatic script injection fallback
  async function sendToTab(msg) {
    if (!activeTabId) {
      await checkActiveTab();
    }
    if (!activeTabId) return null;

    try {
      return await chrome.tabs.sendMessage(activeTabId, msg);
    } catch (e) {
      // Content scripts might not be injected yet (e.g. extension was freshly reloaded)
      try {
        const injectRes = await chrome.runtime.sendMessage({
          action: 'ENSURE_SCRIPTS_INJECTED',
          payload: { tabId: activeTabId }
        });
        if (injectRes && injectRes.success) {
          await new Promise(r => setTimeout(r, 200));
          return await chrome.tabs.sendMessage(activeTabId, msg).catch(() => null);
        }
        return null;
      } catch (err2) {
        // Silently return null - prevents Chrome error logging
        return null;
      }
    }
  }

  // Show, Restore, or Re-anchor the In-Page Floating HUD
  async function showOrRestoreHUD(btnElement = null) {
    if (!activeTabId) {
      await checkActiveTab();
    }
    if (!activeTabId) {
      alert(`Please open ${PLATFORMS[activePlatform].name} first to display the Floating HUD.`);
      return;
    }

    try {
      if (btnElement) {
        btnElement.dataset.origText = btnElement.textContent;
        btnElement.textContent = '⏳ Restoring...';
      }

      if (toggleFloatingHud) {
        toggleFloatingHud.checked = true;
      }
      await chrome.storage.local.set({ hudEnabled: true });

      // Ensure content scripts are alive
      await chrome.runtime.sendMessage({
        action: 'ENSURE_SCRIPTS_INJECTED',
        payload: { tabId: activeTabId }
      }).catch(() => {});

      const res = await sendToTab({ action: 'SHOW_OR_RESTORE_HUD' });
      if (res && res.success) {
        if (btnElement) {
          btnElement.textContent = '✓ Visible!';
          setTimeout(() => {
            btnElement.textContent = btnElement.dataset.origText || '📍 In-Page HUD';
          }, 1200);
        }
      } else {
        if (btnElement) {
          btnElement.textContent = btnElement.dataset.origText || '📍 In-Page HUD';
        }
      }
    } catch (err) {
      if (btnElement) {
        btnElement.textContent = btnElement.dataset.origText || '📍 In-Page HUD';
      }
    }
  }

  if (btnShowHud) {
    btnShowHud.addEventListener('click', () => showOrRestoreHUD(btnShowHud));
  }

  if (btnRestoreHudFooter) {
    btnRestoreHudFooter.addEventListener('click', () => showOrRestoreHUD(btnRestoreHudFooter));
  }

  // Action Buttons
  btnStart.addEventListener('click', async () => {
    await saveSettings();
    const isReady = await checkActiveTab();
    if (!isReady && !activeTabId) {
      alert(`Please open ${PLATFORMS[activePlatform].name} first to run the automator.`);
      return;
    }

    // Guarantee the in-page HUD is mounted and visible upon starting flow
    showOrRestoreHUD().catch(() => {});

    const qCount = Math.max(1, parseInt(inputQuestionCount.value, 10) || 10);
    const payload = {
      platform: activePlatform,
      topic: inputTopic.value.trim(),
      waitingTimeSeconds: parseInt(inputWaitingTime.value, 10) || 10,
      questionCount: qCount,
      totalQuestions: qCount,
      customPrompt: inputCustomPrompt.value.trim()
    };

    const res = await sendToTab({ action: 'START_FLOW', payload });
    if (res && res.state) {
      renderState(res.state);
    }
  });

  btnPause.addEventListener('click', async () => {
    const res = await sendToTab({ action: 'PAUSE_FLOW' });
    if (res && res.state) renderState(res.state);
  });

  btnResume.addEventListener('click', async () => {
    const res = await sendToTab({ action: 'RESUME_FLOW' });
    if (res && res.state) renderState(res.state);
  });

  btnStop.addEventListener('click', async () => {
    const res = await sendToTab({ action: 'STOP_FLOW' });
    if (res && res.state) renderState(res.state);
  });

  btnResetAll.addEventListener('click', async () => {
    if (confirm('Reset all automation progress and queue?')) {
      const res = await sendToTab({ action: 'RESET_FLOW' });
      if (res && res.state) renderState(res.state);
      else {
        await chrome.storage.local.set({
          flowState: {
            status: 'idle',
            currentQuestionIndex: -1,
            totalQuestions: 0,
            questions: [],
            waitingSecondsLeft: 0,
            scrollSecondsLeft: 0,
            platform: activePlatform
          }
        });
        await loadSettings();
      }
    }
  });

  // Render Execution State
  function renderState(state) {
    if (!state) return;

    const curIndex = state.currentQuestionIndex ?? -1;
    const total = state.totalQuestions || state.requestedQuestionCount || parseInt(inputQuestionCount.value, 10) || 10;
    trackerStepCount.textContent = curIndex >= 0 ? `${curIndex + 1} / ${total}` : `0 / ${total}`;
    tabQCount.textContent = state.questions ? state.questions.length : '0';

    if (state.platform && PLATFORMS[state.platform]) {
      updatePlatformCardsUI(state.platform);
    }

    badgeStatus.className = 'status-badge';
    trackerIndicator.className = 'tracker-indicator';

    const isRunning = [
      'asking_initial', 'waiting_initial', 'extracting',
      'waiting_delay', 'scrolling_slowly', 'sending_next', 'waiting_response'
    ].includes(state.status);

    if (isRunning) {
      btnStart.style.display = 'none';
      btnPause.style.display = 'flex';
      btnResume.style.display = 'none';
      btnStop.style.display = 'flex';
      trackerIndicator.classList.add('active');
    } else if (state.status === 'paused') {
      btnStart.style.display = 'none';
      btnPause.style.display = 'none';
      btnResume.style.display = 'flex';
      btnStop.style.display = 'flex';
      trackerIndicator.classList.remove('active');
    } else {
      btnStart.style.display = 'flex';
      btnPause.style.display = 'none';
      btnResume.style.display = 'none';
      btnStop.style.display = 'none';
      trackerIndicator.classList.remove('active');
    }

    switch (state.status) {
      case 'idle':
        badgeStatus.classList.add('status-idle');
        badgeStatus.textContent = 'IDLE';
        trackerStateTitle.textContent = 'Ready to Automate';
        trackerDetails.innerHTML = `Click <strong>Start Auto Flow</strong> to generate ${total} complex questions on ${PLATFORMS[activePlatform].name}.`;
        progressContainer.style.display = 'none';
        break;

      case 'asking_initial':
        badgeStatus.classList.add('status-active');
        badgeStatus.textContent = 'ASKING';
        trackerStateTitle.textContent = '1. Sending Initial Prompt';
        trackerDetails.textContent = `Submitting prompt requesting ${total} complex questions to ${PLATFORMS[activePlatform].name}...`;
        progressContainer.style.display = 'none';
        break;

      case 'waiting_initial':
        badgeStatus.classList.add('status-active');
        badgeStatus.textContent = 'WAITING';
        trackerStateTitle.textContent = '1. Generating Questions';
        trackerDetails.textContent = `Waiting for ${PLATFORMS[activePlatform].name} to formulate ${total} questions...`;
        progressContainer.style.display = 'none';
        break;

      case 'extracting':
        badgeStatus.classList.add('status-active');
        badgeStatus.textContent = 'PARSING';
        trackerStateTitle.textContent = '2. Extracting Questions';
        trackerDetails.textContent = `Loading the ${total} questions into the execution queue...`;
        progressContainer.style.display = 'none';
        break;

      case 'waiting_delay':
        badgeStatus.classList.add('status-waiting');
        badgeStatus.textContent = `WAIT ${state.waitingSecondsLeft}s`;
        trackerStateTitle.textContent = `3. Waiting Time: Question ${curIndex + 1}`;
        trackerDetails.textContent = `Pausing for configured waiting delay before scrolling...`;
        progressContainer.style.display = 'flex';
        progressBar.classList.add('wait-mode');
        progressModeLabel.textContent = '⏳ Waiting Delay';
        progressTimerVal.textContent = `${state.waitingSecondsLeft}s`;
        const waitTotal = state.waitingTimeSeconds || 10;
        const waitPct = Math.max(0, Math.min(100, ((waitTotal - state.waitingSecondsLeft) / waitTotal) * 100));
        progressBar.style.width = `${waitPct}%`;
        break;

      case 'scrolling_slowly':
        badgeStatus.classList.add('status-scrolling');
        badgeStatus.textContent = `SCROLL ${state.scrollSecondsLeft}s`;
        trackerStateTitle.textContent = `4. Scrolling Down Slowly (5s)`;
        trackerDetails.textContent = `Smoothly scrolling downward for exactly 5.0 seconds...`;
        progressContainer.style.display = 'flex';
        progressBar.classList.remove('wait-mode');
        progressModeLabel.textContent = '📜 Slow Scrolling (5s)';
        progressTimerVal.textContent = `${state.scrollSecondsLeft}s`;
        const scrollPct = Math.max(0, Math.min(100, ((5 - state.scrollSecondsLeft) / 5) * 100));
        progressBar.style.width = `${scrollPct}%`;
        break;

      case 'sending_next':
        badgeStatus.classList.add('status-active');
        badgeStatus.textContent = `SENDING Q${curIndex + 1}`;
        trackerStateTitle.textContent = `5. Sending Question ${curIndex + 1}`;
        trackerDetails.textContent = `Submitting Question ${curIndex + 1} automatically...`;
        progressContainer.style.display = 'none';
        break;

      case 'waiting_response':
        badgeStatus.classList.add('status-active');
        badgeStatus.textContent = `ANSWERING Q${curIndex + 1}`;
        trackerStateTitle.textContent = `5. Answering Question ${curIndex + 1}`;
        trackerDetails.textContent = `Waiting for ${PLATFORMS[activePlatform].name} to complete its answer...`;
        progressContainer.style.display = 'none';
        break;

      case 'paused':
        badgeStatus.classList.add('status-idle');
        badgeStatus.textContent = 'PAUSED';
        trackerStateTitle.textContent = 'Automation Paused';
        trackerDetails.textContent = 'Execution is paused. Click Resume to continue.';
        break;

      case 'stopped':
        badgeStatus.classList.add('status-idle');
        badgeStatus.textContent = 'STOPPED';
        trackerStateTitle.textContent = 'Automation Stopped';
        trackerDetails.textContent = 'Automation stopped by user.';
        progressContainer.style.display = 'none';
        break;

      case 'completed':
        badgeStatus.classList.add('status-done');
        badgeStatus.textContent = 'DONE';
        trackerStateTitle.textContent = '6. Sequence Completed';
        trackerDetails.innerHTML = `🎉 <strong>All ${total} questions completed on ${PLATFORMS[activePlatform].name}!</strong> Extension has automatically stopped.`;
        progressContainer.style.display = 'none';
        break;
    }

    // Render Question Queue
    if (state.questions && state.questions.length > 0) {
      renderQueue(state.questions, state.currentQuestionIndex);
    }

    // Render Activity Log
    if (state.activityLog) {
      renderLogs(state.activityLog);
    }
  }

  function renderQueue(questions, activeIdx) {
    queueList.innerHTML = '';
    const customPromptVal = inputCustomPrompt ? inputCustomPrompt.value : '';
    const topicVal = inputTopic ? inputTopic.value : '';
    const isPrompt = /image\s*prompt|prompt/i.test(customPromptVal) || /image\s*prompt|prompt/i.test(topicVal);
    const prefix = isPrompt ? 'P' : 'Q';

    questions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      if (idx === activeIdx) item.classList.add('active');
      if (q.status === 'completed') item.classList.add('done');

      let icon = '⚪';
      if (q.status === 'completed') icon = '✅';
      else if (q.status === 'waiting') icon = '⏳';
      else if (q.status === 'scrolling') icon = '📜';
      else if (q.status === 'sending') icon = '🚀';
      else if (q.status === 'generating') icon = '⚡';
      else if (q.status === 'error') icon = '❌';

      item.innerHTML = `
        <span class="q-badge">${icon}</span>
        <span class="q-text" title="${escapeHtml(q.text)}"><strong>${prefix}${idx + 1}:</strong> ${escapeHtml(q.text)}</span>
      `;
      queueList.appendChild(item);
    });
  }

  /**
   * Renders the activityLog array into #logs-console.
   * Entries are stored newest-first (unshift), so we display them top-to-bottom.
   * Only re-renders if the top entry has changed to avoid unnecessary DOM thrash.
   */
  let _lastLogTop = null;
  function renderLogs(activityLog) {
    if (!logsConsole || !Array.isArray(activityLog) || activityLog.length === 0) return;

    // Skip if nothing new at the top
    const topEntry = activityLog[0];
    const topKey = topEntry.time + topEntry.text;
    if (topKey === _lastLogTop) return;
    _lastLogTop = topKey;

    logsConsole.innerHTML = '';
    for (const entry of activityLog) {
      const div = document.createElement('div');
      div.className = `log-entry log-${entry.type || 'info'}`;
      div.textContent = `[${entry.time}] ${entry.text}`;
      logsConsole.appendChild(div);
    }
  }

  /** Appends a single log entry directly to #logs-console (for popup-local events). */
  function appendLog(msg, type = 'info') {
    if (!logsConsole) return;
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString();
    div.textContent = `[${time}] ${msg}`;
    logsConsole.insertBefore(div, logsConsole.firstChild);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Donation Modal Controller ---
  function openDonateModal() {
    if (!donateModal) return;
    donateModal.style.display = 'flex';
    donateModal.setAttribute('aria-hidden', 'false');
  }

  function closeDonateModal() {
    if (!donateModal) return;
    donateModal.style.display = 'none';
    donateModal.setAttribute('aria-hidden', 'true');
  }

  if (btnDonate) {
    btnDonate.addEventListener('click', (e) => {
      e.stopPropagation();
      openDonateModal();
    });
  }

  if (btnCloseDonate) {
    btnCloseDonate.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDonateModal();
    });
  }

  if (donateBackdrop) {
    donateBackdrop.addEventListener('click', () => {
      closeDonateModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && donateModal && donateModal.style.display === 'flex') {
      closeDonateModal();
    }
  });

  // Safe external navigation via chrome.tabs.create
  document.querySelectorAll('.donate-ext-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      if (url) {
        if (chrome && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url, active: true });
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    });
  });

  // Crypto Address Copy to Clipboard
  const CRYPTO_DONATION_ADDR = '0x8cD08357a2a56ed90D0137AE7bee324bd772B90d';
  async function copyCryptoAddress() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(CRYPTO_DONATION_ADDR);
      } else {
        const ta = document.createElement('textarea');
        ta.value = CRYPTO_DONATION_ADDR;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (btnCopyCrypto) {
        btnCopyCrypto.textContent = '✓ Copied!';
        btnCopyCrypto.classList.add('copied');
        setTimeout(() => {
          btnCopyCrypto.textContent = '📋 Copy';
          btnCopyCrypto.classList.remove('copied');
        }, 2200);
      }
      appendLog('Crypto address copied to clipboard: ' + CRYPTO_DONATION_ADDR, 'info');
    } catch (err) {
      // Ignore clipboard error
    }
  }

  if (btnCopyCrypto) {
    btnCopyCrypto.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCryptoAddress();
    });
  }
  if (cryptoAddr) {
    cryptoAddr.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCryptoAddress();
    });
  }

  // Listen to Storage Updates
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.flowState) {
        renderState(changes.flowState.newValue);
      }
      if (changes.hudEnabled !== undefined && toggleFloatingHud) {
        toggleFloatingHud.checked = changes.hudEnabled.newValue !== false;
      }
    }
  });

  // Initial synchronization
  await checkActiveTab();
  await loadSettings();

  if (activeTabId) {
    const res = await sendToTab({ action: 'GET_RUNNER_STATE' });
    if (res && res.state) {
      renderState(res.state);
    }
  }

  // Periodic polling while popup is open - query storage locally to avoid repeated tab messaging
  setInterval(async () => {
    try {
      const data = await chrome.storage.local.get(['flowState']);
      if (data && data.flowState) {
        renderState(data.flowState);
      }
    } catch (e) {}
  }, 400);
});
