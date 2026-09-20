/**
 * Gemini AutoFlow - DOM Interaction Engine (gemini-dom.js)
 * Handles input injection, send triggering, response stream watching,
 * 10-question parsing, and 5-second slow scrolling on gemini.google.com.
 */

window.GeminiDOM = (function () {
  'use strict';

  // Candidate selectors for Gemini's input field
  const INPUT_SELECTORS = [
    'rich-textarea div[contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="prompt" i]',
    'div[contenteditable="true"]',
    'rich-textarea textarea',
    'textarea[aria-label*="prompt" i]',
    'textarea'
  ];

  // Candidate selectors for the Send button (multi-lingual support)
  const SEND_BUTTON_SELECTORS = [
    'button[aria-label*="Send message" i]',
    'button[aria-label*="Send prompt" i]',
    'button[aria-label*="Send" i]',
    'button[aria-label*="Kirim pesan" i]',
    'button[aria-label*="Kirim prompt" i]',
    'button[aria-label*="Kirim" i]',
    'button[aria-label*="Submit" i]',
    'button.send-button',
    'button:has(mat-icon[data-mat-icon-name="send"])',
    'button:has(mat-icon[data-mat-icon-name="arrow_upward"])',
    'button:has(mat-icon[data-mat-icon-name="arrow_up"])',
    'button:has(span.send-button-icon)',
    'button[mat-icon-button][aria-label*="send" i]',
    'button[mat-icon-button][aria-label*="kirim" i]',
    '.send-button-container button'
  ];

  // Candidate selectors for the Stop response button (indicates actively generating)
  const STOP_BUTTON_SELECTORS = [
    'button[aria-label*="Stop response" i]',
    'button[aria-label*="Stop" i]',
    'button[aria-label*="Hentikan respons" i]',
    'button[aria-label*="Hentikan" i]',
    'button:has(mat-icon[data-mat-icon-name="stop"])',
    'button:has(span.stop-button-icon)'
  ];

  // Candidate selectors for Gemini's response bubbles
  const RESPONSE_CONTAINER_SELECTORS = [
    'model-response',
    '.model-response-text',
    'div[class*="response-container"]',
    'message-content',
    '.response-content',
    '.markdown'
  ];

  let lastSendTimestamp = 0;

  /**
   * Finds the primary text input element for Gemini
   * @returns {HTMLElement|null}
   */
  function findInputElement() {
    for (const sel of INPUT_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          return el;
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    return null;
  }

  /**
   * Finds the Send button element
   * @returns {HTMLButtonElement|null}
   */
  function findSendButton() {
    for (const sel of SEND_BUTTON_SELECTORS) {
      try {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null) {
          return btn;
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    return null;
  }

  /**
   * Checks if Gemini is currently generating a response
   * @returns {boolean}
   */
  function isGenerating() {
    // 1. Check for visible Stop response button
    for (const sel of STOP_BUTTON_SELECTORS) {
      try {
        const stopBtn = document.querySelector(sel);
        if (stopBtn && stopBtn.offsetParent !== null && !stopBtn.disabled) {
          return true;
        }
      } catch (e) {}
    }

    // 2. Check for loading / streaming indicators
    try {
      const loadingElements = document.querySelectorAll(
        '.loading-dots, .streaming, [aria-label*="generating" i], mat-progress-spinner, .sparkle-loading'
      );
      for (const el of loadingElements) {
        if (el && el.offsetParent !== null) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  /**
   * Injects text cleanly into Gemini's rich text editor and triggers Angular/Wiz reactive listeners
   * @param {string} text - Message to type
   * @returns {Promise<boolean>}
   */
  async function typeMessage(text) {
    const input = findInputElement();
    if (!input) {
      console.error('[GeminiAutoFlow] Input field not found!');
      return false;
    }

    input.focus();

    // Select all existing text and delete cleanly to prevent duplicates
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete', false, null);
    } catch (e) {
      console.warn('[GeminiAutoFlow] Pre-clear notice:', e);
    }

    // Technique 1: document.execCommand('insertText') is the primary method for contenteditable
    let success = false;
    try {
      success = document.execCommand('insertText', false, text);
    } catch (err) {
      console.warn('[GeminiAutoFlow] execCommand insertText failed, using fallback:', err);
    }

    // Technique 2: Fallback for textarea or failed execCommand
    if (!success || input.tagName === 'TEXTAREA') {
      if (input.tagName === 'TEXTAREA') {
        input.value = text;
      } else {
        input.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
      }
    }

    // Dispatch synthetic events so Google's reactive form controls detect value change
    try {
      input.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Unidentified', bubbles: true }));
    } catch (e) {
      console.warn('[GeminiAutoFlow] Event dispatch warning:', e);
    }

    // Allow Angular 250ms to react and enable the Send button
    await new Promise(r => setTimeout(r, 250));
    return true;
  }

  /**
   * Clicks the Send button or simulates Enter key
   * Uses single-click dispatching and 3-second debounce lock
   * @returns {Promise<boolean>}
   */
  async function clickSend() {
    const now = Date.now();
    if (now - lastSendTimestamp < 3000) {
      console.warn('[GeminiAutoFlow] Blocked rapid send dispatch (< 3s debounce).');
      return false;
    }

    const btn = findSendButton();
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
      lastSendTimestamp = Date.now();
      btn.click();
      return true;
    }

    // Fallback: Dispatch Enter key on the input element
    const input = findInputElement();
    if (input) {
      lastSendTimestamp = Date.now();
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterEvent);
      return true;
    }

    console.warn('[GeminiAutoFlow] Neither Send button nor Input available for send.');
    return false;
  }

  /**
   * Waits until Gemini has finished generating its answer
   * @param {number} timeoutMs - Max duration to wait (default 120s)
   * @param {function} [onProgress] - Optional tick callback (elapsedSec)
   * @returns {Promise<boolean>}
   */
  async function waitForResponseComplete(timeoutMs = 120000, onProgress = null) {
    const startTime = Date.now();
    let hasStartedGenerating = false;
    let consecutiveIdleChecks = 0;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 400));

      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      if (typeof onProgress === 'function') {
        onProgress(elapsedSec);
      }

      const generating = isGenerating();

      if (generating) {
        hasStartedGenerating = true;
        consecutiveIdleChecks = 0;
      } else {
        if (hasStartedGenerating) {
          consecutiveIdleChecks++;
          // Require at least 2 consecutive idle checks (~800ms) to ensure stream is complete
          if (consecutiveIdleChecks >= 2) {
            return true;
          }
        } else {
          // If 3+ seconds have elapsed and send button is active again without stop button
          if (Date.now() - startTime > 3000) {
            const sendBtn = findSendButton();
            if (sendBtn && !sendBtn.disabled) {
              return true;
            }
          }
        }
      }
    }

    console.warn('[GeminiAutoFlow] waitForResponseComplete reached timeout.');
    return true; // Proceed on timeout
  }

  /**
   * Finds the latest model response element and extracts questions
   * @returns {string[]} Array of parsed question strings
   */
  function extractQuestionsFromLatestResponse() {
    let bestContainer = null;

    // Search for all model response containers
    for (const sel of RESPONSE_CONTAINER_SELECTORS) {
      const elements = document.querySelectorAll(sel);
      if (elements && elements.length > 0) {
        // The last one is the latest response
        bestContainer = elements[elements.length - 1];
        break;
      }
    }

    if (!bestContainer) {
      // Fallback: look for all text inside main
      bestContainer = document.querySelector('main') || document.body;
    }

    const textContent = bestContainer.innerText || bestContainer.textContent || '';
    return parseQuestionsFromText(textContent);
  }

  /**
   * Parses 10 questions from formatted markdown/text
   * Handles formats:
   * 1. What is...?
   * 1) What is...?
   * 1. **What is...?**
   * Question 1: ...
   * @param {string} text - Raw text from Gemini response
   * @returns {string[]}
   */
  function parseQuestionsFromText(text) {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = [];

    // Regex matching numbered questions: "1. Question", "1) Question", "1. **Question**"
    const numberedRegex = /^(\d{1,2})[\.\)]\s*(.+)$/i;
    const questionPrefixRegex = /^Question\s*(\d{1,2})[:\.\-]\s*(.+)$/i;

    for (const line of lines) {
      let match = line.match(numberedRegex) || line.match(questionPrefixRegex);
      if (match) {
        let questionText = match[2].trim();
        // Clean markdown bolding/italics/quotes
        questionText = questionText.replace(/^\*+|\*+$/g, '');
        questionText = questionText.replace(/^_+|_+$/g, '');
        questionText = questionText.replace(/^["']|["']$/g, '');
        questionText = questionText.trim();

        // Avoid short headers or false positives
        if (questionText.length >= 10) {
          questions.push(questionText);
        }
      }
    }

    // If regex didn't extract 10 questions, fallback to line-by-line questions with '?'
    if (questions.length < 5) {
      const fallbackQuestions = lines.filter(line => {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
        return cleaned.endsWith('?') && cleaned.length >= 15;
      }).map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^\*+|\*+$/g, '').trim());

      if (fallbackQuestions.length >= questions.length) {
        return fallbackQuestions.slice(0, 10);
      }
    }

    return questions.slice(0, 10);
  }

  /**
   * Smoothly scrolls to the top of the latest response bubble
   * so the user can read from the beginning during the waiting delay.
   */
  function scrollToLatestResponseTop() {
    try {
      const responses = document.querySelectorAll(
        'model-response, .model-response-text, message-content, div[class*="response-container"], .markdown'
      );
      if (responses.length > 0) {
        const latest = responses[responses.length - 1];
        latest.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      console.warn('[GeminiAutoFlow] scrollToLatestResponseTop notice:', e);
    }
  }

  /**
   * Finds all scrollable elements currently in the Gemini DOM
   * @returns {HTMLElement[]}
   */
  function findScrollableContainers() {
    const found = new Set();

    // 1. Specific known Gemini structural selectors
    const selectors = [
      'infinite-scroller',
      '.scrollable-container',
      'chat-window',
      '.conversation-container',
      'mat-sidenav-content',
      'scroll-container',
      'main',
      'div[class*="conversation"]',
      'div[class*="chat-history"]',
      'div[class*="scrollable"]',
      'div[class*="chat-container"]'
    ];

    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el && el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 0) {
            found.add(el);
          }
        });
      } catch (e) {}
    });

    // 2. Generic check for any element with overflow auto/scroll and overflowing height
    try {
      const allDivs = document.querySelectorAll('div, section, main, article');
      for (const el of allDivs) {
        if (el && el.clientHeight > 150 && el.scrollHeight > el.clientHeight + 20) {
          const style = window.getComputedStyle(el);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') {
            found.add(el);
          }
        }
      }
    } catch (e) {}

    // 3. Document / window fallback
    const docEl = document.scrollingElement || document.documentElement;
    if (docEl && docEl.scrollHeight > window.innerHeight + 10) {
      found.add(docEl);
    }

    return Array.from(found);
  }

  /**
   * Condition 4: Scroll down slowly for exactly 5 seconds (5000ms)
   * Robust multi-container downward animation with pre-positioning.
   * If the page is currently at the bottom, positions to the top of the
   * response first so that there is tangible downward distance to travel.
   * @param {number} durationMs - Duration in milliseconds (default: 5000)
   * @param {function} [onProgress] - Callback (progressRatio, secondsLeft)
   * @returns {Promise<void>}
   */
  function scrollDownSlowly(durationMs = 5000, onProgress = null) {
    return new Promise(resolve => {
      const containers = findScrollableContainers();
      console.log(`[GeminiAutoFlow] Starting 5s slow scroll on ${containers.length} candidate container(s).`);

      // Locate latest response element for anchoring
      const responses = document.querySelectorAll(
        'model-response, .model-response-text, message-content, div[class*="response-container"], .markdown'
      );
      const latestResponse = responses.length > 0 ? responses[responses.length - 1] : null;

      // Build scroll plan for each container
      const containerPlans = containers.map(container => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        let startScroll = container.scrollTop;

        // If container is at or near bottom (< 80px from bottom),
        // there is no downward scroll room. Scroll up to the response top
        // or up by ~75% viewport height so the downward animation is visible.
        if (maxScroll > 100 && startScroll >= maxScroll - 80) {
          if (latestResponse && container.contains(latestResponse)) {
            const rectContainer = container.getBoundingClientRect();
            const rectResponse = latestResponse.getBoundingClientRect();
            const relativeTop = rectResponse.top - rectContainer.top + container.scrollTop;
            startScroll = Math.max(0, Math.min(relativeTop, maxScroll - 300));
          } else {
            startScroll = Math.max(0, maxScroll - Math.max(500, Math.round(container.clientHeight * 0.75)));
          }
          container.scrollTop = startScroll;
        }

        return {
          container,
          startScroll,
          targetScroll: maxScroll
        };
      });

      const startTime = performance.now();

      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);
        const secondsLeft = Math.max(0, ((durationMs - elapsed) / 1000)).toFixed(1);

        if (typeof onProgress === 'function') {
          onProgress(progress, parseFloat(secondsLeft));
        }

        // Apply downward progress to each container
        containerPlans.forEach(plan => {
          const { container, startScroll, targetScroll } = plan;
          const currentMax = container.scrollHeight - container.clientHeight;
          const finalTarget = Math.max(targetScroll, currentMax);
          const currentPos = startScroll + (finalTarget - startScroll) * progress;
          container.scrollTop = currentPos;
        });

        // Also scroll window in case page uses body/window scrolling
        const docEl = document.scrollingElement || document.documentElement;
        const windowMax = docEl.scrollHeight - window.innerHeight;
        if (windowMax > 0) {
          const windowPos = windowMax * progress;
          window.scrollTo({ top: windowPos, behavior: 'auto' });
        }

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          // Finalize: ensure all containers are scrolled to absolute bottom
          containerPlans.forEach(plan => {
            plan.container.scrollTop = plan.container.scrollHeight;
          });
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });

          // Smoothly bring input element into view
          const input = findInputElement();
          if (input) {
            try {
              input.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } catch (e) {}
          }

          if (typeof onProgress === 'function') {
            onProgress(1.0, 0.0);
          }
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  return {
    findInputElement,
    findSendButton,
    isGenerating,
    typeMessage,
    clickSend,
    waitForResponseComplete,
    extractQuestionsFromLatestResponse,
    parseQuestionsFromText,
    scrollToLatestResponseTop,
    findScrollableContainers,
    scrollDownSlowly
  };
})();
