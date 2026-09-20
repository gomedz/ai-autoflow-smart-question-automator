/**
 * AI AutoFlow - Universal In-Page Floating HUD (floating-hud.js)
 * Mounts a sleek, draggable overlay onto Gemini, ChatGPT, Perplexity & Claude
 * to view real-time countdown, 5s slow scrolling progress,
 * the 10-question execution queue, and manual controls.
 * 
 * Includes self-healing MutationObserver, SPA route persistence,
 * and remote recovery from the extension popup.
 */

(function () {
  'use strict';

  // Clean up existing HUD DOM element if previously attached before mounting fresh instance
  try {
    const existingHud = document.getElementById('ai-autoflow-floating-hud');
    if (existingHud) {
      existingHud.remove();
    }
  } catch (e) {}
  window.__AI_AUTOFLOW_HUD_INITIALIZED__ = true;

  function getRunner() {
    return window.AIRunner || window.GeminiRunner;
  }

  function getDOM() {
    return window.PlatformDOM || window.GeminiDOM;
  }

  function detectPlatform() {
    const DOM = getDOM();
    return DOM && typeof DOM.getPlatform === 'function'
      ? DOM.getPlatform()
      : 'gemini';
  }

  const PLATFORM_NAMES = {
    gemini: { title: 'Gemini AutoFlow', badge: '✨ Gemini', colorClass: 'plat-gemini' },
    chatgpt: { title: 'ChatGPT AutoFlow', badge: '🟢 ChatGPT', colorClass: 'plat-chatgpt' },
    perplexity: { title: 'Perplexity AutoFlow', badge: '🔵 Perplexity', colorClass: 'plat-perplexity' },
    claude: { title: 'Claude AutoFlow', badge: '🟠 Claude', colorClass: 'plat-claude' }
  };

  let currentPlatform = detectPlatform();
  let currentPlatInfo = PLATFORM_NAMES[currentPlatform] || PLATFORM_NAMES.gemini;

  // Create HUD element (or retrieve if already created)
  let hud = document.getElementById('ai-autoflow-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'ai-autoflow-hud';
  }
  hud.className = currentPlatInfo.colorClass;
  hud.innerHTML = `
    <div class="hud-header" id="hud-drag-handle">
      <div class="hud-brand">
        <img class="hud-brand-logo" src="${chrome.runtime.getURL('icons/icon-32.png')}" alt="AI AutoFlow Logo">
        <span id="hud-brand-title">${currentPlatInfo.title}</span>
        <span class="hud-platform-chip" id="hud-platform-chip">${currentPlatInfo.badge}</span>
      </div>
      <div class="hud-header-actions">
        <button class="hud-icon-btn" id="hud-toggle-btn" title="Minimize / Expand">_</button>
        <button class="hud-icon-btn hud-close-btn" id="hud-close-btn" title="Hide Floating HUD">✕</button>
      </div>
    </div>
    <div class="hud-body">
      <!-- Status Card -->
      <div class="hud-status-card">
        <div class="hud-status-top">
          <span class="hud-status-pill status-idle" id="hud-status-pill">
            <span class="status-dot"></span>
            <span id="hud-status-text">IDLE</span>
          </span>
          <span class="hud-step-counter" id="hud-step-counter">0 / 10</span>
        </div>
        <div class="hud-status-desc" id="hud-status-desc">Ready to start automated question flow.</div>

        <!-- Progress Bar for Waiting (Condition 3) & 5s Slow Scroll (Condition 4) -->
        <div class="hud-progress-wrap" id="hud-progress-wrap" style="display: none;">
          <div class="hud-progress-info">
            <span id="hud-progress-label">Action</span>
            <span id="hud-progress-time">0s</span>
          </div>
          <div class="hud-progress-bar">
            <div class="hud-progress-fill" id="hud-progress-fill"></div>
          </div>
        </div>
      </div>

      <!-- Current Topic Preview (Click to Edit) -->
      <div class="hud-topic-bar" id="hud-topic-bar" title="Click to edit topic">
        <span>Topic:</span>
        <span class="hud-topic-val" id="hud-topic-val">Artificial Intelligence</span>
        <button class="hud-topic-edit-btn" id="hud-topic-edit-btn" title="Edit topic">✎</button>
      </div>

      <!-- 10 Questions Queue View -->
      <div class="hud-questions-container" id="hud-questions-container">
        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 11px;">
          Questions will appear here once generated.
        </div>
      </div>

      <!-- Controls -->
      <div class="hud-controls">
        <button class="hud-btn hud-btn-primary" id="hud-start-btn">▶ Start Flow</button>
        <button class="hud-btn hud-btn-secondary" id="hud-pause-btn" style="display: none;">❚❚ Pause</button>
        <button class="hud-btn hud-btn-secondary" id="hud-resume-btn" style="display: none;">▶ Resume</button>
        <button class="hud-btn hud-btn-danger" id="hud-stop-btn" style="display: none;">■ Stop</button>
      </div>
    </div>
  `;

  // HUD Visibility & Enable/Disable State
  let isHUDEnabled = true;

  function setHUDVisibility(enabled, spotlight = false) {
    isHUDEnabled = !!enabled;
    if (!hud) return;
    if (!isHUDEnabled) {
      hud.classList.add('hud-hidden');
      hud.style.setProperty('display', 'none', 'important');
      hud.style.setProperty('visibility', 'hidden', 'important');
      hud.style.setProperty('opacity', '0', 'important');
      hud.style.setProperty('pointer-events', 'none', 'important');
      if (hud.parentNode) {
        hud.parentNode.removeChild(hud);
      }
    } else {
      hud.classList.remove('hud-hidden');
      hud.style.removeProperty('display');
      hud.style.removeProperty('visibility');
      hud.style.removeProperty('opacity');
      hud.style.removeProperty('pointer-events');
      ensureHUDMounted();
      if (spotlight) {
        restoreHUD(true);
      }
    }
  }

  // Persistent Mounting Lifecycle
  function ensureHUDMounted() {
    if (!isHUDEnabled) {
      if (hud && hud.parentNode) {
        hud.parentNode.removeChild(hud);
      }
      return false;
    }
    try {
      if (!document.body) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', ensureHUDMounted, { once: true });
        }
        return false;
      }

      if (!document.body.contains(hud)) {
        document.body.appendChild(hud);
        setupObserver();
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  // Setup MutationObserver to re-append HUD if Single Page Application wipes body nodes
  let bodyObserver = null;
  function setupObserver() {
    if (bodyObserver || !document.body) return;
    bodyObserver = new MutationObserver(() => {
      if (!isHUDEnabled) return;
      if (!document.body.contains(hud)) {
        try {
          document.body.appendChild(hud);
        } catch (e) {}
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: false });
  }

  // Initial Mount
  ensureHUDMounted();
  setupObserver();

  // Periodic heartbeat ensuring HUD remains in DOM across complex SPA transitions
  setInterval(() => {
    if (isHUDEnabled) ensureHUDMounted();
  }, 1500);

  // Sync platform branding
  function syncPlatformInfo() {
    currentPlatform = detectPlatform();
    currentPlatInfo = PLATFORM_NAMES[currentPlatform] || PLATFORM_NAMES.gemini;
    hud.className = `${currentPlatInfo.colorClass}${isMinimized ? ' hud-minimized' : ''}`;
    if (brandTitle) brandTitle.textContent = currentPlatInfo.title;
    if (platformChip) platformChip.textContent = currentPlatInfo.badge;
  }

  // SPA Route Navigation Interceptors
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      ensureHUDMounted();
      syncPlatformInfo();
    }, 250);
  });

  ['pushState', 'replaceState'].forEach(method => {
    const origMethod = history[method];
    if (typeof origMethod === 'function') {
      history[method] = function () {
        const result = origMethod.apply(this, arguments);
        setTimeout(() => {
          ensureHUDMounted();
          syncPlatformInfo();
        }, 250);
        return result;
      };
    }
  });

  // Element references
  const dragHandle = hud.querySelector('#hud-drag-handle');
  const toggleBtn = hud.querySelector('#hud-toggle-btn');
  const closeBtn = hud.querySelector('#hud-close-btn');
  const statusPill = hud.querySelector('#hud-status-pill');
  const statusText = hud.querySelector('#hud-status-text');
  const stepCounter = hud.querySelector('#hud-step-counter');
  const statusDesc = hud.querySelector('#hud-status-desc');
  const progressWrap = hud.querySelector('#hud-progress-wrap');
  const progressLabel = hud.querySelector('#hud-progress-label');
  const progressTime = hud.querySelector('#hud-progress-time');
  const progressFill = hud.querySelector('#hud-progress-fill');
  const topicBar = hud.querySelector('#hud-topic-bar');
  const topicVal = hud.querySelector('#hud-topic-val');
  const topicEditBtn = hud.querySelector('#hud-topic-edit-btn');
  const questionsContainer = hud.querySelector('#hud-questions-container');
  const startBtn = hud.querySelector('#hud-start-btn');
  const pauseBtn = hud.querySelector('#hud-pause-btn');
  const resumeBtn = hud.querySelector('#hud-resume-btn');
  const stopBtn = hud.querySelector('#hud-stop-btn');
  const brandTitle = hud.querySelector('#hud-brand-title');
  const platformChip = hud.querySelector('#hud-platform-chip');

  // Topic editing from Floating HUD
  function promptEditTopic() {
    const current = (topicVal ? topicVal.textContent.trim() : '') || 'Artificial Intelligence';
    const updated = window.prompt('Enter new topic for question automation:', current);
    if (updated !== null && updated.trim().length > 0) {
      const clean = updated.trim();
      if (topicVal) topicVal.textContent = clean;
      chrome.storage.local.set({ initialTopic: clean });
      const r = getRunner();
      if (r && r.setTopic) {
        r.setTopic(clean);
      } else if (currentRunnerState) {
        currentRunnerState.topic = clean;
      }
    }
  }

  if (topicBar) {
    topicBar.addEventListener('click', (e) => {
      e.stopPropagation();
      promptEditTopic();
    });
  }
  if (topicEditBtn) {
    topicEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      promptEditTopic();
    });
  }

  // Minimize toggle
  let isMinimized = false;
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMinimized = !isMinimized;
    hud.classList.toggle('hud-minimized', isMinimized);
    toggleBtn.textContent = isMinimized ? '▢' : '_';
  });

  // Close / Hide toggle
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setHUDVisibility(false);
      chrome.storage.local.set({ hudEnabled: false });
    });
  }

  // Dragging support
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = hud.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    hud.style.bottom = 'auto';
    hud.style.right = 'auto';
    hud.style.left = `${initialLeft}px`;
    hud.style.top = `${initialTop}px`;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxLeft = Math.max(10, window.innerWidth - hud.offsetWidth - 10);
    const maxTop = Math.max(10, window.innerHeight - hud.offsetHeight - 10);
    hud.style.left = `${Math.max(10, Math.min(maxLeft, initialLeft + dx))}px`;
    hud.style.top = `${Math.max(10, Math.min(maxTop, initialTop + dy))}px`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Clamp coordinates when window is resized so HUD never gets lost offscreen
  function clampHUDPosition() {
    if (hud.style.left && hud.style.left !== 'auto') {
      const left = parseInt(hud.style.left, 10);
      const top = parseInt(hud.style.top, 10);
      const maxLeft = Math.max(10, window.innerWidth - hud.offsetWidth - 10);
      const maxTop = Math.max(10, window.innerHeight - hud.offsetHeight - 10);
      hud.style.left = `${Math.max(10, Math.min(maxLeft, left))}px`;
      hud.style.top = `${Math.max(10, Math.min(maxTop, top))}px`;
    }
  }
  window.addEventListener('resize', clampHUDPosition);

  // Restore & Summon HUD function
  function restoreHUD(spotlight = true) {
    isHUDEnabled = true;
    hud.classList.remove('hud-hidden');
    hud.style.removeProperty('display');
    hud.style.removeProperty('visibility');
    hud.style.removeProperty('opacity');
    hud.style.removeProperty('pointer-events');
    ensureHUDMounted();
    isMinimized = false;
    hud.classList.remove('hud-minimized');
    toggleBtn.textContent = '_';

    // Reset coordinates to default corner
    hud.style.bottom = '24px';
    hud.style.right = '24px';
    hud.style.left = 'auto';
    hud.style.top = 'auto';
    hud.style.display = 'block';
    hud.style.visibility = 'visible';
    hud.style.opacity = '1';

    syncPlatformInfo();

    if (spotlight) {
      hud.classList.remove('hud-spotlight');
      void hud.offsetWidth; // Force CSS reflow
      hud.classList.add('hud-spotlight');
      setTimeout(() => hud.classList.remove('hud-spotlight'), 900);
    }
  }

  // Action Button Listeners
  startBtn.addEventListener('click', () => {
    const runner = getRunner();
    if (runner) runner.startAutomation();
  });

  pauseBtn.addEventListener('click', () => {
    const runner = getRunner();
    if (runner) runner.pause();
  });

  resumeBtn.addEventListener('click', () => {
    const runner = getRunner();
    if (runner) runner.resume();
  });

  stopBtn.addEventListener('click', () => {
    const runner = getRunner();
    if (runner) runner.stop();
  });

  let currentRunnerState = null;

  // Subscribe to Runner State Changes
  function updateHUD(state) {
    if (!state) return;
    currentRunnerState = state;

    if (!isHUDEnabled) return;
    ensureHUDMounted();

    // Update Platform Tag if defined
    const p = state.platform || currentPlatform;
    const pInfo = PLATFORM_NAMES[p] || PLATFORM_NAMES.gemini;
    brandTitle.textContent = pInfo.title;
    platformChip.textContent = pInfo.badge;

    if (state.topic && topicVal) {
      topicVal.textContent = state.topic;
    }

    // Update Step Counter
    const curIndex = state.currentQuestionIndex;
    const total = state.totalQuestions || state.requestedQuestionCount || 10;
    stepCounter.textContent = curIndex >= 0 ? `${curIndex + 1} / ${total}` : `0 / ${total}`;

    // Reset status pill classes
    statusPill.className = 'hud-status-pill';

    const isRunning = [
      'asking_initial', 'waiting_initial', 'extracting',
      'waiting_delay', 'scrolling_slowly', 'sending_next', 'waiting_response'
    ].includes(state.status);

    if (isRunning) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      resumeBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
    } else if (state.status === 'paused') {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'flex';
      stopBtn.style.display = 'flex';
    } else {
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      stopBtn.style.display = 'none';
    }

    // Status specifics
    switch (state.status) {
      case 'idle':
        statusPill.classList.add('status-idle');
        statusText.textContent = 'IDLE';
        statusDesc.textContent = `Ready on ${pInfo.badge}. Click Start Flow to generate ${total} questions.`;
        progressWrap.style.display = 'none';
        break;

      case 'asking_initial':
        statusPill.classList.add('status-initial');
        statusText.textContent = 'ASKING';
        statusDesc.textContent = `Sending initial prompt requesting ${total} complex questions...`;
        progressWrap.style.display = 'none';
        break;

      case 'waiting_initial':
        statusPill.classList.add('status-initial');
        statusText.textContent = 'WAITING';
        statusDesc.textContent = `Waiting for ${pInfo.badge} to formulate initial questions...`;
        progressWrap.style.display = 'none';
        break;

      case 'extracting':
        statusPill.classList.add('status-initial');
        statusText.textContent = 'PARSING';
        statusDesc.textContent = 'Extracting generated questions into queue...';
        progressWrap.style.display = 'none';
        break;

      case 'waiting_delay':
        statusPill.classList.add('status-waiting');
        statusText.textContent = 'WAITING DELAY';
        statusDesc.textContent = `Condition 3: Waiting before Question ${curIndex + 1}...`;
        progressWrap.style.display = 'block';
        progressLabel.textContent = '⏳ Waiting Delay';
        progressTime.textContent = `${state.waitingSecondsLeft}s`;
        const waitTotal = state.waitingTimeSeconds || 10;
        const waitPct = Math.max(0, Math.min(100, ((waitTotal - state.waitingSecondsLeft) / waitTotal) * 100));
        progressFill.style.width = `${waitPct}%`;
        progressFill.className = 'hud-progress-fill wait-mode';
        break;

      case 'scrolling_slowly':
        statusPill.classList.add('status-scrolling');
        statusText.textContent = 'SCROLLING';
        statusDesc.textContent = `Condition 4: Smoothly scrolling chat window (${state.scrollSecondsLeft}s left)...`;
        progressWrap.style.display = 'block';
        progressLabel.textContent = '📜 Smooth Scroll';
        progressTime.textContent = `${state.scrollSecondsLeft}s`;
        const scrollPct = Math.max(0, Math.min(100, (1 - (state.scrollSecondsLeft / 5)) * 100));
        progressFill.style.width = `${scrollPct}%`;
        progressFill.className = 'hud-progress-fill scroll-mode';
        break;

      case 'sending_next':
        statusPill.classList.add('status-sending');
        statusText.textContent = `SENDING Q${curIndex + 1}`;
        statusDesc.textContent = `Condition 5: Typing & submitting Question ${curIndex + 1}...`;
        progressWrap.style.display = 'none';
        break;

      case 'waiting_response':
        statusPill.classList.add('status-generating');
        statusText.textContent = `ANSWERING Q${curIndex + 1}`;
        statusDesc.textContent = `Condition 5: ${pInfo.badge} is answering Question ${curIndex + 1}...`;
        progressWrap.style.display = 'none';
        break;

      case 'paused':
        statusPill.classList.add('status-paused');
        statusText.textContent = 'PAUSED';
        statusDesc.textContent = 'Automation paused by user.';
        break;

      case 'stopped':
        statusPill.classList.add('status-idle');
        statusText.textContent = 'STOPPED';
        statusDesc.textContent = 'Automation stopped.';
        progressWrap.style.display = 'none';
        break;

      case 'completed':
        statusPill.classList.add('status-completed');
        statusText.textContent = 'COMPLETED';
        statusDesc.textContent = `🎉 All ${total} questions sent and answered successfully!`;
        progressWrap.style.display = 'none';
        break;
    }

    // Render questions queue
    if (state.questions && state.questions.length > 0) {
      renderQuestionsList(state.questions, state.currentQuestionIndex, state);
    } else {
      renderQuestionsList([], -1, state);
    }
  }

  function renderQuestionsList(questions, activeIdx, flowState = currentRunnerState) {
    questionsContainer.innerHTML = '';
    if (!questions || questions.length === 0) {
      questionsContainer.innerHTML = `
        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 11px;">
          Questions / prompts will appear here once generated.
        </div>
      `;
      return;
    }

    const currentPrompt = (flowState && flowState.initialPrompt) || '';
    const currentTopic = (flowState && flowState.topic) || '';
    const isPrompt = /image\s*prompt|prompt/i.test(currentPrompt) || /image\s*prompt|prompt/i.test(currentTopic);
    const prefix = isPrompt ? 'P' : 'Q';

    questions.forEach((q, idx) => {
      const row = document.createElement('div');
      row.className = 'hud-question-row';
      if (idx === activeIdx) {
        row.classList.add('active');
        setTimeout(() => {
          try {
            row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } catch (e) {}
        }, 50);
      }
      if (q.status === 'completed') row.classList.add('done');

      let icon = '⚪';
      if (q.status === 'completed') icon = '✅';
      else if (q.status === 'waiting') icon = '⏳';
      else if (q.status === 'scrolling') icon = '📜';
      else if (q.status === 'sending') icon = '🚀';
      else if (q.status === 'generating') icon = '⚡';
      else if (q.status === 'error') icon = '❌';

      row.innerHTML = `
        <span class="hud-q-badge">${icon}</span>
        <span class="hud-q-text" title="${escapeHtml(q.text)}"><strong>${prefix}${idx + 1}:</strong> ${escapeHtml(q.text)}</span>
      `;
      questionsContainer.appendChild(row);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Hook into runner
  const runner = getRunner();
  if (runner) {
    runner.subscribe(updateHUD);
    updateHUD(runner.getState());
  } else {
    const timer = setInterval(() => {
      const r = getRunner();
      if (r) {
        clearInterval(timer);
        r.subscribe(updateHUD);
        updateHUD(r.getState());
      }
    }, 200);
  }

  // Double-sync: listen for flowState, initialTopic, and hudEnabled changes in chrome.storage
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.hudEnabled !== undefined) {
          setHUDVisibility(changes.hudEnabled.newValue);
        }
        if (changes.initialTopic && changes.initialTopic.newValue) {
          if (topicVal) {
            topicVal.textContent = changes.initialTopic.newValue;
          }
          if (currentRunnerState) {
            currentRunnerState.topic = changes.initialTopic.newValue;
          }
        }
        if (changes.flowState && changes.flowState.newValue) {
          updateHUD(changes.flowState.newValue);
        }
      }
    });

    chrome.storage.local.get(['hudEnabled', 'initialTopic', 'flowState'], (res) => {
      if (res) {
        if (typeof res.hudEnabled === 'boolean') {
          setHUDVisibility(res.hudEnabled);
        }
        if (res.initialTopic && topicVal) {
          topicVal.textContent = res.initialTopic;
        }
        if (res.flowState) {
          updateHUD(res.flowState);
        }
      }
    });
  } catch (e) {}

  // Listen for message events from Extension Popup (Remote Recovery & Positioning)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return false;

    if (message.action === 'SET_HUD_ENABLED' || message.action === 'SET_HUD_VISIBILITY') {
      const enabled = message.payload ? message.payload.enabled : message.enabled;
      setHUDVisibility(enabled, true);
      sendResponse({ success: true, enabled: isHUDEnabled });
      return true;
    }

    if (message.action === 'SHOW_OR_RESTORE_HUD' || message.action === 'RESTORE_HUD') {
      setHUDVisibility(true, true);
      restoreHUD(true);
      sendResponse({
        success: true,
        mounted: document.body ? document.body.contains(hud) : false,
        minimized: isMinimized,
        enabled: isHUDEnabled
      });
      return true;
    }

    if (message.action === 'GET_HUD_STATUS') {
      sendResponse({
        success: true,
        mounted: document.body ? document.body.contains(hud) : false,
        minimized: isMinimized,
        enabled: isHUDEnabled
      });
      return true;
    }

    return false;
  });

  // Expose global controller
  window.AIHUD = {
    ensureMounted: ensureHUDMounted,
    restore: restoreHUD,
    setVisibility: setHUDVisibility,
    isEnabled: () => isHUDEnabled,
    getElement: () => hud
  };
})();
