/**
 * AI AutoFlow - Universal Automation Runner (automation-runner.js)
 * Coordinates the 6-stage execution flow across Gemini, ChatGPT, Perplexity & Claude:
 * 1. Ask AI for 10 complex questions
 * 2. Parse & load the 10 questions into the queue
 * 3. Wait for configured delay (countdown)
 * 4. Scroll down slowly for exactly 5 seconds
 * 5. Auto-send next question and wait for response
 * 6. Stop cleanly when all questions are sent
 */

window.AIRunner = (function () {
  'use strict';

  function getDOM() {
    return window.PlatformDOM || window.GeminiDOM;
  }

  // Internal state
  let state = {
    status: 'idle', // idle, asking_initial, waiting_initial, extracting, waiting_delay, scrolling_slowly, sending_next, waiting_response, completed, paused, stopped
    platform: 'unknown',
    currentQuestionIndex: -1,
    totalQuestions: 0,
    requestedQuestionCount: 10,
    questions: [], // [{ text: string, status: 'pending'|'waiting'|'scrolling'|'sending'|'generating'|'completed'|'error' }]
    waitingTimeSeconds: 10,
    scrollDurationSeconds: 5,
    waitingSecondsLeft: 0,
    scrollSecondsLeft: 0,
    topic: 'Artificial Intelligence ethics and future consciousness',
    initialPrompt: '',
    activityLog: [],
    lastError: null,
    isPaused: false,
    shouldStop: false
  };

  const listeners = new Set();

  function detectCurrentPlatform() {
    const DOM = getDOM();
    state.platform = DOM && typeof DOM.getPlatform === 'function' ? DOM.getPlatform() : 'gemini';
  }

  function logActivity(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { time: timestamp, text: msg, type };
    state.activityLog.unshift(entry);
    if (state.activityLog.length > 50) state.activityLog.pop();
    console.log(`[AIAutoFlow] [${timestamp}] ${msg}`);
    notifyListeners();
  }

  function notifyListeners() {
    for (const fn of listeners) {
      try {
        fn(getState());
      } catch (e) {
        console.error('[AIAutoFlow] Listener error:', e);
      }
    }

    // Broadcast status change to background (updates badge)
    try {
      chrome.runtime.sendMessage({
        action: 'STATUS_CHANGED',
        payload: {
          status: state.status,
          currentQuestionIndex: state.currentQuestionIndex,
          totalQuestions: state.totalQuestions,
          platform: state.platform
        }
      }).catch(() => {});
    } catch (e) {}

    // Persist to chrome.storage
    try {
      chrome.storage.local.set({
        flowState: {
          status: state.status,
          platform: state.platform,
          currentQuestionIndex: state.currentQuestionIndex,
          totalQuestions: state.totalQuestions,
          questions: state.questions,
          waitingSecondsLeft: state.waitingSecondsLeft,
          scrollSecondsLeft: state.scrollSecondsLeft,
          activityLog: state.activityLog,
          lastUpdated: Date.now()
        }
      }).catch(() => {});
    } catch (e) {}
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /**
   * Loads settings from storage
   */
  async function loadConfig() {
    detectCurrentPlatform();
    try {
      const data = await chrome.storage.local.get([
        'waitingTimeSeconds',
        'scrollDurationSeconds',
        'initialTopic',
        'customPrompt',
        'questionCount'
      ]);
      if (data.waitingTimeSeconds) state.waitingTimeSeconds = Number(data.waitingTimeSeconds);
      if (data.initialTopic) state.topic = data.initialTopic;
      if (data.customPrompt) state.initialPrompt = data.customPrompt;
      if (data.questionCount) state.requestedQuestionCount = Math.max(1, Number(data.questionCount));
      notifyListeners();
    } catch (e) {
      console.warn('[AIAutoFlow] Could not load storage config:', e);
    }
  }

  /**
   * Helper to sleep with pause and stop checks
   */
  async function sleepWithCheck(ms, checkInterval = 250) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (state.shouldStop) return false;
      while (state.isPaused && !state.shouldStop) {
        await new Promise(r => setTimeout(r, 300));
      }
      const remain = ms - (Date.now() - start);
      await new Promise(r => setTimeout(r, Math.min(checkInterval, remain)));
    }
    return !state.shouldStop;
  }

  /**
   * Helper to format initial prompt with topic and user-specified question count
   */
  function formatInitialPrompt(topic, count) {
    const rawTopic = topic || 'Artificial Intelligence ethics and future consciousness';
    const num = count || 10;
    const defaultTemplate = `Please generate exactly {count} complex, thought-provoking questions about {topic}. Format your response strictly as a numbered list from 1 to {count} with only the question text on each line, without preamble or conversational filler.`;

    let prompt = state.initialPrompt && state.initialPrompt.trim()
      ? state.initialPrompt
      : defaultTemplate;

    prompt = prompt.replace(/{topic}/g, rawTopic);

    if (prompt.includes('{count}')) {
      prompt = prompt.replace(/{count}/g, num);
    } else {
      // Smart substitution if template still contains literal "10"
      prompt = prompt.replace(/exactly \d+/gi, `exactly ${num}`);
      prompt = prompt.replace(/1 to \d+/gi, `1 to ${num}`);
      prompt = prompt.replace(/\b10 complex\b/gi, `${num} complex`);
      prompt = prompt.replace(/\b10 questions\b/gi, `${num} questions`);
    }

    return prompt;
  }

  /**
   * Step 1: Send the first message asking AI to make specified number of complex questions / prompts
   */
  async function executeStep1_AskInitialQuestions() {
    const DOM = getDOM();
    state.status = 'asking_initial';
    notifyListeners();

    const count = state.requestedQuestionCount || 10;
    const promptText = formatInitialPrompt(state.topic, count);

    logActivity(`Step 1: Sending initial prompt for ${count} items on ${state.platform.toUpperCase()}...`);

    // Snapshot response container state prior to sending to avoid premature completion on previous chats
    const baseline = DOM.snapshotResponseState ? DOM.snapshotResponseState() : null;

    let sendSucceeded = false;
    for (let sendAttempt = 1; sendAttempt <= 3; sendAttempt++) {
      const typed = await DOM.typeMessage(promptText);
      if (!typed) {
        logActivity(`Attempt #${sendAttempt}: Failed to inject prompt into ${state.platform} input.`, 'warn');
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      await new Promise(r => setTimeout(r, 500));
      const sent = await DOM.clickSend();
      if (sent) {
        sendSucceeded = true;
        break;
      }

      logActivity(`Attempt #${sendAttempt}: Send button not clickable yet on ${state.platform}. Retrying in 800ms...`, 'warn');
      await new Promise(r => setTimeout(r, 800));
    }

    if (!sendSucceeded) {
      logActivity(`Failed to send initial prompt on ${state.platform} after 3 attempts.`, 'error');
      state.status = 'stopped';
      notifyListeners();
      return false;
    }

    state.status = 'waiting_initial';
    logActivity(`Initial prompt sent. Waiting for ${state.platform} to generate ${count} items...`);
    notifyListeners();

    // Wait for AI to finish generating, passing baseline to prevent premature exit
    await DOM.waitForResponseComplete(150000, baseline, (elapsedSec) => {
      // Periodic progress ticker
    });

    logActivity(`${state.platform.toUpperCase()} finished generating initial response.`);
    return true;
  }

  /**
   * Step 2: Extract questions/prompts from response and load into queue
   */
  async function executeStep2_ExtractQuestions() {
    const DOM = getDOM();
    state.status = 'extracting';
    notifyListeners();
    logActivity('Step 2: Parsing generated prompts from response...');

    const targetCount = state.requestedQuestionCount || 10;
    let extracted = [];

    // Robust multi-attempt extraction (up to 5 attempts) to allow DOM to finish rendering
    for (let attempt = 1; attempt <= 5; attempt++) {
      const waitMs = attempt === 1 ? 200 : 500 + (attempt * 400);
      await new Promise(r => setTimeout(r, waitMs));

      extracted = DOM.extractQuestionsFromLatestResponse(targetCount);
      if (extracted.length >= Math.min(3, targetCount)) {
        logActivity(`Extracted ${extracted.length} items from response (attempt #${attempt}).`);
        break;
      }

      // Check all assistant containers in reverse if latest was incomplete
      if (extracted.length === 0 && DOM.extractFromAllAssistantResponses) {
        extracted = DOM.extractFromAllAssistantResponses(targetCount);
        if (extracted.length >= 1) {
          logActivity(`Extracted ${extracted.length} items from assistant container.`);
          break;
        }
      }
    }

    // Absolute fallback only if response was completely unparseable
    if (extracted.length === 0) {
      logActivity('No numbered items detected in latest response after retries. Creating contextual fallback list.', 'warn');
      
      const isImagePrompt = /image\s*prompt|prompt|gambar|foto|photo|visual/i.test(state.initialPrompt || '') ||
                            /image\s*prompt|prompt|gambar|foto|photo|visual/i.test(state.topic || '');

      if (isImagePrompt) {
        const promptTemplates = [
          `A cinematic futuristic visual depicting ${state.topic}, dynamic volumetric lighting, ultra-detailed textures, 8K concept art`,
          `An epic perspective of ${state.topic} in a dramatic atmospheric environment, photorealistic, intricate depth of field`,
          `A monumental high-tech chamber showcasing ${state.topic}, glowing energy conduits, high octane render, 8K resolution`,
          `A dramatic confrontation scene centered around ${state.topic}, neon reflections, cinematic color grading, Unreal Engine 5 aesthetic`,
          `A surreal, intricate masterpiece exploring ${state.topic}, ethereal lighting, complex geometry, hyper-detailed digital art`,
          `An intimate macro shot illustrating the delicate core mechanisms of ${state.topic}, soft ambient lighting, photorealistic octane render`,
          `A sprawling panoramic landscape transformed by ${state.topic}, golden hour sunlight, majestic scale, matte painting style`,
          `A retro-futuristic cyberpunk interpretation of ${state.topic}, vibrant neon palette, rainy reflective streets, detailed circuitry`,
          `An abstract dimensional visualization of ${state.topic}, swirling cosmic particle streams, radiant luminescence, 8K wallpaper`,
          `A gritty industrial realization of ${state.topic}, heavy weathered metal, intense mechanical engineering, dramatic shadows`
        ];
        for (let idx = 0; idx < targetCount; idx++) {
          const tpl = promptTemplates[idx % promptTemplates.length];
          extracted.push(idx >= promptTemplates.length ? `${tpl} (Variation #${idx + 1})` : tpl);
        }
      } else {
        const baseTemplates = [
          `What are the emergent implications of ${state.topic} on human cognition?`,
          `How do architectural constraints define the boundary limits of ${state.topic}?`,
          `What ethical paradoxes arise when scaling ${state.topic} globally?`,
          `In what ways could unexpected edge cases disrupt ${state.topic}?`,
          `How does historical precedent inform current debates on ${state.topic}?`,
          `What epistemological assumptions are embedded within ${state.topic}?`,
          `How might adversarial interference compromise systems built upon ${state.topic}?`,
          `What systemic trade-offs exist between velocity and safety in ${state.topic}?`,
          `How will next-generation iterations fundamentally reconfigure ${state.topic}?`,
          `What unresolved ontological questions remain at the core of ${state.topic}?`,
          `What socio-economic ramifications must be anticipated regarding ${state.topic}?`,
          `How can decentralized governance models address challenges in ${state.topic}?`,
          `What long-term sustainability factors directly impact ${state.topic}?`,
          `How do interdisciplinary paradigms reshape our comprehension of ${state.topic}?`,
          `What counter-intuitive outcomes have been observed within ${state.topic}?`
        ];
        for (let idx = 0; idx < targetCount; idx++) {
          const tpl = baseTemplates[idx % baseTemplates.length];
          extracted.push(idx >= baseTemplates.length ? `${tpl} (Dimension #${idx + 1})` : tpl);
        }
      }
    }

    state.questions = extracted.slice(0, targetCount).map((q, idx) => ({
      index: idx + 1,
      text: q,
      status: 'pending'
    }));
    state.totalQuestions = state.questions.length;
    state.currentQuestionIndex = -1;

    logActivity(`Loaded ${state.totalQuestions} items into the automated execution queue.`);
    notifyListeners();

    // Position view at top of generated response for reading during waiting delay
    if (DOM && DOM.scrollToLatestResponseTop) {
      DOM.scrollToLatestResponseTop();
    }

    return true;
  }

  /**
   * Steps 3, 4, 5: Question processing loop
   * For each question:
   * 3. Waiting time from each message to send (countdown)
   * 4. Scroll down slowly for 5 seconds after waiting time over
   * 5. Auto-send next question and wait for response
   */
  async function executeQuestionLoop() {
    const DOM = getDOM();

    for (let i = 0; i < state.questions.length; i++) {
      if (state.shouldStop) {
        logActivity('Automation stopped by user request.');
        state.status = 'stopped';
        notifyListeners();
        return;
      }

      state.currentQuestionIndex = i;
      const currentQ = state.questions[i];
      logActivity(`--- Processing Question ${i + 1} of ${state.totalQuestions} on ${state.platform.toUpperCase()} ---`);

      // ==========================================
      // Step 3: Waiting time before sending message
      // ==========================================
      state.status = 'waiting_delay';
      currentQ.status = 'waiting';
      notifyListeners();

      const waitTotal = state.waitingTimeSeconds || 10;
      logActivity(`Step 3: Waiting ${waitTotal}s before sending Question ${i + 1}...`);

      for (let sec = waitTotal; sec > 0; sec--) {
        state.waitingSecondsLeft = sec;
        notifyListeners();

        const ok = await sleepWithCheck(1000);
        if (!ok) {
          logActivity('Execution aborted during waiting phase.');
          state.status = 'stopped';
          notifyListeners();
          return;
        }
      }
      state.waitingSecondsLeft = 0;
      notifyListeners();

      // ==========================================
      // Step 4: Scroll down slowly for 5 seconds
      // ==========================================
      state.status = 'scrolling_slowly';
      currentQ.status = 'scrolling';
      logActivity(`Step 4: Scrolling down slowly for 5.0 seconds...`);
      notifyListeners();

      await DOM.scrollDownSlowly(5000, (progress, secondsLeft) => {
        state.scrollSecondsLeft = secondsLeft;
        notifyListeners();
      });

      state.scrollSecondsLeft = 0;
      logActivity('5-second slow scroll completed.');
      notifyListeners();

      if (state.shouldStop) {
        state.status = 'stopped';
        notifyListeners();
        return;
      }

      // ==========================================
      // Step 5: Send question automatically
      // ==========================================
      state.status = 'sending_next';
      currentQ.status = 'sending';
      logActivity(`Step 5: Sending Question ${i + 1}: "${currentQ.text.substring(0, 60)}..."`);
      notifyListeners();

      // Snapshot response container state prior to sending to avoid premature completion on previous turns
      const baseline = DOM.snapshotResponseState ? DOM.snapshotResponseState() : null;

      let sendSucceeded = false;
      for (let sendAttempt = 1; sendAttempt <= 3; sendAttempt++) {
        const typed = await DOM.typeMessage(currentQ.text);
        if (!typed) {
          logActivity(`Attempt #${sendAttempt}: Failed to inject question ${i + 1} into editor.`, 'warn');
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        await new Promise(r => setTimeout(r, 500));
        const sent = await DOM.clickSend();
        if (sent) {
          sendSucceeded = true;
          break;
        }

        logActivity(`Attempt #${sendAttempt}: Send button not clickable for question ${i + 1}. Retrying in 800ms...`, 'warn');
        await new Promise(r => setTimeout(r, 800));
      }

      if (!sendSucceeded) {
        logActivity(`Failed to click send for question ${i + 1} after 3 attempts.`, 'error');
        currentQ.status = 'error';
        notifyListeners();
        continue;
      }

      // Wait for AI to answer the question
      state.status = 'waiting_response';
      currentQ.status = 'generating';
      logActivity(`Question ${i + 1} sent. Waiting for ${state.platform} response...`);
      notifyListeners();

      await DOM.waitForResponseComplete(180000, baseline, (elapsedSec) => {
        // Periodic progress ticker
      });
      currentQ.status = 'completed';
      logActivity(`Question ${i + 1} answered successfully.`);
      notifyListeners();

      // Position view at top of answer for reading during waiting delay
      if (DOM && DOM.scrollToLatestResponseTop) {
        DOM.scrollToLatestResponseTop();
      }
    }

    // ==========================================
    // Step 6: All questions sent, stop extension
    // ==========================================
    state.status = 'completed';
    state.currentQuestionIndex = state.questions.length - 1;
    logActivity(`Step 6: Completed! All ${state.totalQuestions} questions sent and answered on ${state.platform.toUpperCase()}.`);
    notifyListeners();
  }

  /**
   * Main Start Entry Point
   */
  async function startAutomation(options = {}) {
    if (state.status !== 'idle' && state.status !== 'completed' && state.status !== 'stopped') {
      logActivity('Cannot start: automation is already running or paused.', 'warn');
      return false;
    }

    await loadConfig();

    if (options.topic) state.topic = options.topic;
    if (options.waitingTimeSeconds) state.waitingTimeSeconds = Number(options.waitingTimeSeconds);
    if (options.customPrompt) state.initialPrompt = options.customPrompt;
    if (options.questionCount) state.requestedQuestionCount = Math.max(1, Number(options.questionCount));
    else if (options.totalQuestions) state.requestedQuestionCount = Math.max(1, Number(options.totalQuestions));

    state.shouldStop = false;
    state.isPaused = false;
    state.questions = [];
    state.totalQuestions = 0;
    state.currentQuestionIndex = -1;
    state.waitingSecondsLeft = 0;
    state.scrollSecondsLeft = 0;
    state.activityLog = []; // Clear log on each new run

    logActivity(`Starting AI AutoFlow on ${state.platform.toUpperCase()}...`);

    // Run async in background loop
    (async () => {
      try {
        const step1Ok = await executeStep1_AskInitialQuestions();
        if (!step1Ok || state.shouldStop) return;

        const step2Ok = await executeStep2_ExtractQuestions();
        if (!step2Ok || state.shouldStop) return;

        await executeQuestionLoop();
      } catch (err) {
        console.error('[AIAutoFlow] Critical error in automation loop:', err);
        logActivity(`Error: ${err.message}`, 'error');
        state.status = 'stopped';
        state.lastError = err.message;
        notifyListeners();
      }
    })();

    return true;
  }

  function pause() {
    if (state.status === 'idle' || state.status === 'completed' || state.status === 'stopped') return false;
    state.isPaused = true;
    state.status = 'paused';
    logActivity('Automation paused.');
    notifyListeners();
    return true;
  }

  function resume() {
    if (!state.isPaused) return false;
    state.isPaused = false;
    if (state.waitingSecondsLeft > 0) {
      state.status = 'waiting_delay';
    } else if (state.scrollSecondsLeft > 0) {
      state.status = 'scrolling_slowly';
    } else {
      state.status = 'waiting_response';
    }
    logActivity('Automation resumed.');
    notifyListeners();
    return true;
  }

  function stop() {
    state.shouldStop = true;
    state.isPaused = false;
    state.status = 'stopped';
    logActivity('Stopping automation cleanly...');
    notifyListeners();
    return true;
  }

  function reset() {
    stop();
    state.status = 'idle';
    state.currentQuestionIndex = -1;
    state.totalQuestions = 0;
    state.questions = [];
    state.waitingSecondsLeft = 0;
    state.scrollSecondsLeft = 0;
    logActivity('Automation reset to idle state.');
    notifyListeners();
  }

  function setWaitingTime(seconds) {
    state.waitingTimeSeconds = Math.max(1, Number(seconds) || 10);
    chrome.storage.local.set({ waitingTimeSeconds: state.waitingTimeSeconds });
    logActivity(`Waiting time updated to ${state.waitingTimeSeconds}s.`);
    notifyListeners();
  }

  function setTopic(newTopic) {
    if (newTopic) {
      state.topic = newTopic.trim();
      chrome.storage.local.set({ initialTopic: state.topic });
      notifyListeners();
    }
  }

  function setQuestionCount(count) {
    state.requestedQuestionCount = Math.max(1, Number(count) || 10);
    chrome.storage.local.set({ questionCount: state.requestedQuestionCount });
    logActivity(`Total question count updated to ${state.requestedQuestionCount}.`);
    notifyListeners();
  }

  // Listen for message events from Extension Popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'GET_RUNNER_STATE':
          detectCurrentPlatform();
          sendResponse({ success: true, state: getState() });
          break;
        case 'START_FLOW':
          startAutomation(message.payload || {});
          sendResponse({ success: true, state: getState() });
          break;
        case 'PAUSE_FLOW':
          pause();
          sendResponse({ success: true, state: getState() });
          break;
        case 'RESUME_FLOW':
          resume();
          sendResponse({ success: true, state: getState() });
          break;
        case 'STOP_FLOW':
          stop();
          sendResponse({ success: true, state: getState() });
          break;
        case 'RESET_FLOW':
          reset();
          sendResponse({ success: true, state: getState() });
          break;
        case 'UPDATE_CONFIG':
          if (message.payload?.waitingTimeSeconds) {
            setWaitingTime(message.payload.waitingTimeSeconds);
          }
          if (message.payload?.topic) {
            setTopic(message.payload.topic);
          }
          if (message.payload?.questionCount || message.payload?.totalQuestions) {
            setQuestionCount(message.payload.questionCount || message.payload.totalQuestions);
          }
          sendResponse({ success: true, state: getState() });
          break;
        default:
          sendResponse({ success: false, reason: 'Unknown runner action' });
          break;
      }
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  });

  loadConfig();

  return {
    getState,
    subscribe,
    startAutomation,
    pause,
    resume,
    stop,
    reset,
    setWaitingTime,
    setTopic,
    setQuestionCount,
    logActivity
  };
})();

// Backward compatibility alias
window.GeminiRunner = window.AIRunner;
