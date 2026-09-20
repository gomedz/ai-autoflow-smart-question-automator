/**
 * AI AutoFlow - Universal Platform DOM Adapter (platform-dom.js)
 * Provides unified DOM interaction across:
 * 1. Google Gemini (gemini.google.com)
 * 2. ChatGPT (chatgpt.com & chat.openai.com)
 * 3. Perplexity AI (perplexity.ai)
 * 4. Claude (claude.ai)
 */

window.PlatformDOM = (function () {
  'use strict';

  // Platform detection
  function getPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('chatgpt.com') || host.includes('openai.com')) return 'chatgpt';
    if (host.includes('perplexity.ai')) return 'perplexity';
    if (host.includes('claude.ai')) return 'claude';
    return 'unknown';
  }

  const PLATFORM_CONFIGS = {
    gemini: {
      name: 'Google Gemini',
      badgeIcon: '✨',
      accentColor: '#8b5cf6',
      inputSelectors: [
        'rich-textarea div[contenteditable="true"]',
        'div[role="textbox"][contenteditable="true"]',
        '.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][aria-label*="prompt" i]',
        'div[contenteditable="true"]',
        'rich-textarea textarea',
        'textarea[aria-label*="prompt" i]',
        'textarea'
      ],
      sendSelectors: [
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
      ],
      stopSelectors: [
        'button[aria-label*="Stop response" i]',
        'button[aria-label*="Stop generation" i]',
        'button[aria-label*="Stop generating" i]',
        'button[aria-label*="Hentikan respons" i]',
        'button[aria-label*="Hentikan" i]',
        'button[aria-label*="Berhenti" i]',
        '.send-button-container button:has(mat-icon[data-mat-icon-name*="stop" i])',
        'button:has(mat-icon[data-mat-icon-name*="stop" i])',
        'button:has([data-icon-name*="stop" i])',
        'button:has(span.stop-button-icon)',
        'button.stop-button'
      ],
      streamingIndicators: [
        'model-response.is-streaming',
        'model-response [data-is-streaming="true"]',
        'model-response .loading-dots',
        'model-response .sparkle-loading'
      ],
      responseSelectors: [
        'model-response',
        '.model-response-text',
        'div[class*="response-container"]',
        'message-content',
        '.response-content',
        '.markdown'
      ],
      scrollSelectors: [
        'infinite-scroller',
        '.scrollable-container',
        'chat-window',
        '.conversation-container',
        'mat-sidenav-content',
        'scroll-container',
        'main'
      ]
    },

    chatgpt: {
      name: 'ChatGPT',
      badgeIcon: '🟢',
      accentColor: '#10b981',
      inputSelectors: [
        '#prompt-textarea',
        'div[contenteditable="true"]#prompt-textarea',
        'textarea#prompt-textarea',
        'div[contenteditable="true"][data-placeholder]',
        'div[role="textbox"][contenteditable="true"]',
        'div.ProseMirror',
        'textarea[data-id="root"]',
        'textarea'
      ],
      sendSelectors: [
        'button[data-testid="send-button"]',
        'button[data-testid="fruitjuice-send-button"]',
        'button[aria-label*="Send prompt" i]',
        'button[aria-label*="Send message" i]',
        'button[aria-label*="Send" i]',
        'button[aria-label*="Kirim" i]',
        'button:has(span[data-state])',
        'form button[type="submit"]'
      ],
      stopSelectors: [
        'button[data-testid="stop-button"]',
        'button[aria-label*="Stop streaming" i]',
        'button[aria-label*="Stop generating" i]',
        'button[aria-label*="Stop response" i]',
        'button[aria-label*="Hentikan respons" i]',
        'form button[aria-label*="Stop" i]',
        'button:has(svg rect[width="12"])',
        'button:has(svg rect[width="10"])'
      ],
      streamingIndicators: [
        '[data-is-streaming="true"]',
        '.result-streaming',
        'button[data-testid="stop-button"]'
      ],
      responseSelectors: [
        '[data-message-author-role="assistant"]',
        'article:has([data-message-author-role="assistant"])',
        'div[data-message-author-role="assistant"]',
        '.agent-turn'
      ],
      scrollSelectors: [
        'div[class*="react-scroll-to-bottom"]',
        'main',
        'div[class*="conversation"]',
        'div[class*="overflow-y-auto"]'
      ]
    },

    perplexity: {
      name: 'Perplexity AI',
      badgeIcon: '🔵',
      accentColor: '#38bdf8',
      inputSelectors: [
        'textarea[placeholder*="Ask" i]',
        'textarea[placeholder*="anything" i]',
        'textarea[placeholder*="Tanyakan" i]',
        'textarea[placeholder*="follow-up" i]',
        'textarea',
        'div[contenteditable="true"]'
      ],
      sendSelectors: [
        'button[aria-label*="Submit" i]',
        'button[aria-label*="Ask" i]',
        'button[aria-label*="Send" i]',
        'button[aria-label*="Kirim" i]',
        'button[type="submit"]',
        'button:has(svg path[d*="M13 5l7 7-7 7"])',
        'button.bg-super'
      ],
      stopSelectors: [
        'form button[aria-label*="Stop" i]',
        'div[class*="input"] button[aria-label*="Stop" i]',
        'button[aria-label*="Hentikan" i]',
        'button:has(svg path[d*="M6 6h12v12H6z"])'
      ],
      streamingIndicators: [
        'div[data-is-streaming="true"]',
        'form [aria-label*="Stop" i]'
      ],
      responseSelectors: [
        'div[data-testid*="answer"]',
        'div[class*="answer"]',
        'div[class*="prose"]',
        '.markdown'
      ],
      scrollSelectors: [
        'main',
        'div[class*="overflow-y-auto"]',
        'div[class*="scrollable"]'
      ]
    },

    claude: {
      name: 'Claude',
      badgeIcon: '🟠',
      accentColor: '#f97316',
      inputSelectors: [
        'div[contenteditable="true"].ProseMirror',
        'div[role="textbox"][contenteditable="true"]',
        'fieldset div[contenteditable="true"]',
        'div.ProseMirror',
        'textarea[placeholder*="Reply to Claude" i]',
        'textarea'
      ],
      sendSelectors: [
        'button[aria-label*="Send Message" i]',
        'button[aria-label*="Send message" i]',
        'button[aria-label*="Send" i]',
        'button[aria-label*="Kirim" i]',
        'button:has(svg path[d*="M3.75 3.75"])',
        'fieldset button'
      ],
      stopSelectors: [
        'button[aria-label*="Stop response" i]',
        'button[aria-label*="Stop" i]',
        'button[aria-label*="Hentikan" i]'
      ],
      streamingIndicators: [
        'div[data-is-streaming="true"]',
        '[aria-label*="Stop response" i]'
      ],
      responseSelectors: [
        'div.font-claude-message',
        'div[class*="standard-markdown"]',
        'div.prose',
        'div[data-is-streaming]'
      ],
      scrollSelectors: [
        'div[class*="overflow-y-auto"]',
        'main',
        'div.flex-1.overflow-y-auto'
      ]
    }
  };

  let lastSendTimestamp = 0;

  function getConfig() {
    const p = getPlatform();
    return PLATFORM_CONFIGS[p] || PLATFORM_CONFIGS.gemini;
  }

  /**
   * Finds the active input element on the current platform
   */
  function findInputElement() {
    const config = getConfig();
    for (const sel of config.inputSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      } catch (e) {}
    }
    // Fallback: any visible textarea or contenteditable
    const fallbacks = document.querySelectorAll('textarea, [contenteditable="true"]');
    for (const el of fallbacks) {
      if (el && el.offsetParent !== null && !el.disabled) return el;
    }
    return null;
  }

  /**
   * Finds the active Send button on the current platform
   */
  function findSendButton() {
    const config = getConfig();
    for (const sel of config.sendSelectors) {
      try {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null) return btn;
      } catch (e) {}
    }
    return null;
  }

  /**
   * Helper to verify if an element is genuinely rendered and visible on screen
   */
  function isElementVisible(el) {
    if (!el) return false;
    if (typeof el.checkVisibility === 'function') {
      try {
        return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      } catch (e) {}
    }
    if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.pointerEvents === 'none') {
        return false;
      }
    } catch (e) {}
    return true;
  }

  /**
   * Helper to exclude action toolbar buttons (copy, thumbs up, share, edit) from being mistaken as stop buttons
   */
  function isActionToolbarButton(el) {
    if (!el) return false;
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
    const text = (el.innerText || el.textContent || '').toLowerCase();
    const actionKeywords = ['copy', 'salin', 'share', 'bagikan', 'thumb', 'suka', 'edit', 'more', 'opsi', 'listen', 'dengarkan', 'volume'];
    return actionKeywords.some(k => label.includes(k) || text.includes(k));
  }

  /**
   * Checks if AI is currently generating a response
   */
  function isGenerating() {
    const config = getConfig();

    // 1. Check for Stop buttons (excluding action toolbar buttons and hidden elements)
    for (const sel of config.stopSelectors) {
      try {
        const stopBtns = document.querySelectorAll(sel);
        for (const stopBtn of stopBtns) {
          if (!stopBtn || isActionToolbarButton(stopBtn)) continue;
          if (stopBtn.disabled || stopBtn.getAttribute('aria-disabled') === 'true') continue;
          if (isElementVisible(stopBtn)) return true;
        }
      } catch (e) {}
    }

    // 2. Check for streaming indicators
    for (const sel of config.streamingIndicators) {
      try {
        const indicators = document.querySelectorAll(sel);
        for (const indicator of indicators) {
          if (!indicator || isActionToolbarButton(indicator)) continue;
          if (isElementVisible(indicator)) return true;
        }
      } catch (e) {}
    }

    // 3. Check if active Send button has morphed into a stop button
    try {
      const sendBtn = findSendButton();
      if (sendBtn && isElementVisible(sendBtn) && !isActionToolbarButton(sendBtn)) {
        const label = (sendBtn.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('stop') || label.includes('hentikan') || label.includes('berhenti')) {
          return true;
        }
        // Check for dedicated stop square icon (explicitly not gradient <stop> or generic rect)
        const stopSquare = sendBtn.querySelector('svg rect[width="10"], svg rect[width="12"], svg rect[width="14"], [data-icon-name*="stop" i]');
        if (stopSquare && isElementVisible(stopSquare)) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  /**
   * Injects text cleanly into the active editor
   */
  async function typeMessage(text) {
    const input = findInputElement();
    if (!input) {
      console.error(`[AIAutoFlow] Input field not found on ${getPlatform()}!`);
      return false;
    }

    input.focus();

    // Clear existing text cleanly
    try {
      if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set || Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, '');
        } else {
          input.value = '';
        }
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('delete', false, null);
      }
    } catch (e) {}

    let success = false;

    // ContentEditable / ProseMirror injection
    if (input.isContentEditable || input.getAttribute('contenteditable') === 'true') {
      try {
        input.focus();
        success = document.execCommand('insertText', false, text);
      } catch (err) {}

      if (!success) {
        input.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
      }
    } else {
      // Standard Textarea injection (Perplexity, ChatGPT, etc.) with React prototype setter
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, text);
      } else {
        input.value = text;
      }
      success = true;
    }

    // Dispatch full battery of synthetic events for reactive frameworks (React, Angular, Svelte)
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
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Unidentified', bubbles: true }));
    } catch (e) {}

    // Allow the framework 250ms to react and enable the Send button
    await new Promise(r => setTimeout(r, 250));
    return true;
  }

  /**
   * Clicks Send or synthesizes Enter key with polling for enabled button
   */
  async function clickSend() {
    // Poll up to 2500ms for send button to become enabled and clickable
    const pollStart = Date.now();
    let btn = null;

    while (Date.now() - pollStart < 2500) {
      btn = findSendButton();
      if (btn && isElementVisible(btn) && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    if (btn && isElementVisible(btn) && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
      lastSendTimestamp = Date.now();
      btn.click();
      return true;
    }

    // Secondary attempt: if button exists and is clickable, dispatch pointerdown + click
    if (btn && isElementVisible(btn)) {
      try {
        lastSendTimestamp = Date.now();
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btn.click();
        return true;
      } catch (e) {}
    }

    // Fallback: Dispatch Enter key on the input element
    const input = findInputElement();
    if (input) {
      lastSendTimestamp = Date.now();
      const enterDown = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterDown);
      const enterUp = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterUp);

      // Verify if Enter actually triggered sending or cleared input
      await new Promise(r => setTimeout(r, 250));
      const currentInput = findInputElement();
      const remainingText = currentInput ? (currentInput.value || currentInput.innerText || '').trim() : '';
      if (remainingText.length === 0 || isGenerating()) {
        return true;
      }
    }

    return false;
  }

  const PREFIX_REGEX = /^[\s\*\_\-\•]*(?:\[?\d{1,3}\]?|\(?\d{1,3}\)?|\#\d{1,3}|(?:Image\s+Prompt|Prompt|Question|Pertanyaan|Item|Idea|Topic|Q|Image|Gambar)\s*\d{1,3})[\.\)\:\-\s\*\_\]]+/i;
  const SPLIT_BLOCK_REGEX = /(?:^|\r?\n)(?=[\s\*\_\-\•]*(?:\[?\d{1,3}\]?|\(?\d{1,3}\)?|\#\d{1,3}|(?:Image\s+Prompt|Prompt|Question|Pertanyaan|Item|Idea|Topic|Q|Image|Gambar)\s*\d{1,3})[\.\)\:\-\s\*\_\]]+)/i;

  /**
   * Helper to clean whitespace, numbers, bullets, and markdown wrappers
   */
  function cleanItemText(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();
    cleaned = cleaned.replace(PREFIX_REGEX, '');
    cleaned = cleaned.replace(/^\*+|\*+$/g, '');
    cleaned = cleaned.replace(/^_+|_+$/g, '');
    cleaned = cleaned.replace(/^["'`]|["'`]$/g, '');
    cleaned = cleaned.replace(/\r?\n+/g, ' ');
    return cleaned.trim();
  }

  /**
   * Checks if a line or block starts with a list number, bullet, or prompt label
   */
  function isNumberedOrPrefixed(text) {
    if (!text || typeof text !== 'string') return false;
    return PREFIX_REGEX.test(text.trim());
  }

  /**
   * Strips list numbers or labels from the beginning of a line or block
   */
  function stripNumberPrefix(text) {
    return cleanItemText(text);
  }

  /**
   * Finds all valid assistant response elements across platforms, ignoring user turns
   */
  /**
   * Helper to check if a container contains a generated image or canvas
   */
  function hasGeneratedImage(container) {
    if (!container) return false;
    const images = Array.from(container.querySelectorAll('img, picture, canvas, [data-testid*="image"], [class*="image-container"], [class*="generated-image"]'));
    for (const img of images) {
      if (img.tagName === 'IMG') {
        const src = img.getAttribute('src') || '';
        const isAvatar = img.closest('[class*="avatar" i], [class*="author" i], [class*="profile" i], [class*="user" i]') ||
                         (img.width > 0 && img.width < 60) ||
                         (img.height > 0 && img.height < 60);
        if (src && !isAvatar) {
          return true;
        }
      } else if (img.tagName === 'CANVAS') {
        if (img.width >= 100 && img.height >= 100) return true;
      } else {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper to check if an image is still actively generating or downloading
   */
  /**
   * Helper to check if an image is still actively generating or downloading
   */
  function isImageStillLoading(container) {
    if (!container) return false;
    // Only perform check if container actually contains a generated image
    if (!hasGeneratedImage(container)) return false;

    const loading = container.querySelector(
      '[class*="image" i] [class*="loading" i], [class*="image" i] [class*="shimmer" i], [class*="image" i] [role="progressbar"], .animate-pulse'
    );
    if (loading && isElementVisible(loading)) return true;

    const imgs = Array.from(container.querySelectorAll('img')).filter(img => {
      const isAvatar = img.closest && img.closest('[class*="avatar" i], [class*="author" i], [class*="profile" i], [class*="user" i]');
      return !isAvatar && (img.width >= 60 || img.getAttribute('src')?.startsWith('http') || img.getAttribute('src')?.startsWith('blob:'));
    });

    for (const img of imgs) {
      if (!img.complete && img.getAttribute('src')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds all valid assistant response elements across platforms, ignoring user turns.
   * Preserves top-level turn containers rather than fragmented child elements.
   */
  function findAllResponseContainers() {
    const config = getConfig();

    for (const sel of config.responseSelectors) {
      try {
        const elements = Array.from(document.querySelectorAll(sel));
        const valid = elements.filter(el => {
          if (!el) return false;
          // Disallow user messages or elements inside user turns
          if (el.getAttribute('data-message-author-role') === 'user') return false;
          if (el.closest && el.closest('[data-message-author-role="user"]')) return false;
          // Disallow input areas and form containers
          if (el.closest && (el.closest('form') || el.closest('#prompt-textarea') || el.isContentEditable)) return false;
          // Must have text, height, or an image element
          const hasImg = !!el.querySelector('img, picture, canvas');
          const text = (el.innerText || el.textContent || '').trim();
          if (el.offsetParent === null && el.offsetHeight === 0 && text.length === 0 && !hasImg) return false;
          return true;
        });

        // First matching turn-level selector wins
        if (valid.length > 0) {
          return valid;
        }
      } catch (e) {}
    }

    // Generic fallback across ChatGPT, Claude, Gemini, Perplexity
    const genericSelectors = [
      'model-response',
      '[data-message-author-role="assistant"]',
      'article:has([data-message-author-role="assistant"])',
      'div.font-claude-message',
      'div[data-testid*="answer"]'
    ];

    for (const sel of genericSelectors) {
      try {
        const elements = Array.from(document.querySelectorAll(sel));
        const valid = elements.filter(el => {
          if (!el) return false;
          if (el.getAttribute('data-message-author-role') === 'user') return false;
          if (el.closest && el.closest('[data-message-author-role="user"]')) return false;
          return true;
        });
        if (valid.length > 0) {
          return valid;
        }
      } catch (e) {}
    }

    return [];
  }

  /**
   * Finds latest model response element across platforms
   */
  function findLatestResponseContainer() {
    const containers = findAllResponseContainers();
    if (containers.length > 0) {
      return containers[containers.length - 1];
    }
    return document.body;
  }

  /**
   * Snapshots current response state before sending a prompt
   */
  function snapshotResponseState() {
    const containers = findAllResponseContainers();
    const latest = containers.length > 0 ? containers[containers.length - 1] : null;
    const text = latest ? (latest.innerText || latest.textContent || '').trim() : '';
    const images = Array.from(document.querySelectorAll('img, picture, canvas')).filter(img => {
      const isAvatar = img.closest && img.closest('[class*="avatar" i], [class*="author" i], [class*="profile" i], [class*="user" i]');
      return !isAvatar && ((img.width > 50 && img.height > 50) || img.src?.includes('blob:') || img.src?.includes('dalle') || img.src?.includes('googleusercontent'));
    });
    return {
      count: containers.length,
      element: latest,
      textLength: text.length,
      imageCount: images.length,
      timestamp: Date.now()
    };
  }

  /**
   * Waits until the AI has completed its answer (supporting both text responses and generated images)
   */
  async function waitForResponseComplete(timeoutMs = 180000, baseline = null, onProgress = null) {
    const startTime = Date.now();
    const baseCount = (baseline && typeof baseline.count === 'number') ? baseline.count : 0;
    const baseElem = baseline ? baseline.element : null;
    const baseLen = (baseline && typeof baseline.textLength === 'number') ? baseline.textLength : 0;
    const baseImages = (baseline && typeof baseline.imageCount === 'number') ? baseline.imageCount : 0;

    let hasStartedGenerating = false;
    let lastObservedText = '';
    let lastTextGrowthTime = Date.now();
    let consecutiveStableChecks = 0;

    // Initial buffer to allow framework to update DOM
    await new Promise(r => setTimeout(r, 1000));

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 400));

      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      if (typeof onProgress === 'function') onProgress(elapsedSec);

      const generating = isGenerating();
      const containers = findAllResponseContainers();
      const currentCount = containers.length;
      const latestContainer = containers.length > 0 ? containers[containers.length - 1] : null;
      const curText = latestContainer ? (latestContainer.innerText || latestContainer.textContent || '').trim() : '';

      const currentImages = Array.from(document.querySelectorAll('img, picture, canvas')).filter(img => {
        const isAvatar = img.closest && img.closest('[class*="avatar" i], [class*="author" i], [class*="profile" i], [class*="user" i]');
        return !isAvatar && ((img.width > 50 && img.height > 50) || img.src?.includes('blob:') || img.src?.includes('dalle') || img.src?.includes('googleusercontent'));
      });
      const hasNewImage = currentImages.length > baseImages;
      const hasImg = hasGeneratedImage(latestContainer) || hasNewImage;
      const imgLoading = hasImg && isImageStillLoading(latestContainer);

      // Phase 1: Detect that the NEW generation has started
      if (!hasStartedGenerating) {
        if (generating || imgLoading) {
          hasStartedGenerating = true;
          lastObservedText = curText;
          lastTextGrowthTime = Date.now();
        } else if (baseline) {
          if (currentCount > baseCount || (latestContainer && latestContainer !== baseElem)) {
            hasStartedGenerating = true;
            lastObservedText = curText;
            lastTextGrowthTime = Date.now();
          } else if (curText.length > baseLen + 15 || hasNewImage) {
            hasStartedGenerating = true;
            lastObservedText = curText;
            lastTextGrowthTime = Date.now();
          }
        } else {
          if (lastObservedText === '') {
            lastObservedText = curText;
          } else if (curText !== lastObservedText && curText.length > 0) {
            hasStartedGenerating = true;
            lastObservedText = curText;
            lastTextGrowthTime = Date.now();
          }
        }

        // Conditional start failsafe after 5 seconds: only if something has appeared in the DOM
        if (!hasStartedGenerating && (Date.now() - startTime > 5000)) {
          if (curText.length > baseLen + 10 || currentCount > baseCount || hasImg || generating) {
            hasStartedGenerating = true;
            lastObservedText = curText;
            lastTextGrowthTime = Date.now();
          }
        }
        // Unconditional start failsafe after 12 seconds — handles extended silent "thinking" phases
        // (e.g. Claude Sonnet with Thinking mode, which may produce no DOM output for many seconds)
        if (!hasStartedGenerating && (Date.now() - startTime > 12000)) {
          hasStartedGenerating = true;
          lastObservedText = curText;
          lastTextGrowthTime = Date.now();
        }
      } else {
        // Phase 2: Track stream growth & detect completion
        if (curText.length > lastObservedText.length || curText !== lastObservedText) {
          lastObservedText = curText;
          lastTextGrowthTime = Date.now();
          consecutiveStableChecks = 0;
        }

        const quietMs = Date.now() - lastTextGrowthTime;
        const input = findInputElement();
        const isInputReady = input && !input.disabled && input.getAttribute('aria-disabled') !== 'true';

        // Ensure isGenerating() is false and image is not loading before any completion check
        if (!generating && !imgLoading) {
          // Completion Criterion 1: Image Generation Complete
          if (hasImg && quietMs >= 2500) {
            return true;
          }

          // Completion Criterion 2: Standard Text Completion (stop button gone + text quiet for 2.2s + min content)
          if ((curText.length >= 30 || hasImg) && quietMs >= 2200) {
            consecutiveStableChecks++;
            if (consecutiveStableChecks >= 2) {
              return true; // Finished cleanly
            }
          }

          // Completion Criterion 3: Interactive Input + Stable Content (3.0s quiet)
          if (isInputReady && (curText.length >= 25 || hasImg || (latestContainer && latestContainer.offsetHeight > 80)) && quietMs >= 3000) {
            return true;
          }

          // Completion Criterion 4: Hard Stability Failsafe (6.0s quiet with content)
          if (quietMs >= 6000 && (curText.length >= 30 || hasImg)) {
            return true;
          }
        }
      }

      // Universal Failsafe: only fires after 25s+ AND generation has confirmed stopped.
      // Guards against false exits during the AI's long thinking/planning phase.
      if (hasStartedGenerating && Date.now() - startTime > 25000) {
        const quietMs = Date.now() - lastTextGrowthTime;
        const input = findInputElement();
        const isInputReady = input && !input.disabled && input.getAttribute('aria-disabled') !== 'true';
        if (!isGenerating() && isInputReady && (curText.length >= 20 || hasImg) && quietMs >= 4000) {
          return true;
        }
        if (!isGenerating() && quietMs >= 8000 && (curText.length >= 15 || hasImg)) {
          return true;
        }
      }
    }

    return true; // Timeout fallback
  }

  /**
   * Extracts items from a specific container using a hierarchy of strategies
   */
  function extractItemsFromContainer(container, maxCount = 10) {
    if (!container) return [];

    // STRATEGY 1: HTML List Elements (<ol> > <li> or <ul> > <li>)
    try {
      const lists = Array.from(container.querySelectorAll('ol, ul'));
      if (lists.length > 0) {
        let mainList = lists[lists.length - 1];
        for (const l of lists) {
          if (l.querySelectorAll('li').length >= mainList.querySelectorAll('li').length) {
            mainList = l;
          }
        }

        const listItems = Array.from(mainList.querySelectorAll('li'));
        if (listItems.length >= 1) {
          const items = [];
          for (const li of listItems) {
            const clone = li.cloneNode(true);
            clone.querySelectorAll('button, svg, [class*="citation"], [class*="footnote"], sup, [data-testid*="citation"]').forEach(el => el.remove());
            let text = clone.innerText || clone.textContent || '';
            text = cleanItemText(text);
            if (text.length >= 8) {
              items.push(text);
            }
          }
          if (items.length >= 1) {
            return items.slice(0, maxCount);
          }
        }
      }
    } catch (e) {
      console.warn('[AIAutoFlow] List DOM extraction error:', e);
    }

    // STRATEGY 2: Lookahead block splitting on full container text (handles multiline prompts and paragraphs)
    const rawText = container.innerText || container.textContent || '';
    if (rawText && rawText.trim().length > 0) {
      try {
        const chunks = rawText.split(SPLIT_BLOCK_REGEX).map(c => c.trim()).filter(Boolean);
        const blockItems = [];
        for (const chunk of chunks) {
          if (isNumberedOrPrefixed(chunk)) {
            const cleaned = cleanItemText(chunk);
            if (cleaned.length >= 8) {
              blockItems.push(cleaned);
            }
          }
        }
        if (blockItems.length >= 1) {
          return blockItems.slice(0, maxCount);
        }
      } catch (e) {}
    }

    // STRATEGY 3: Paragraph elements (<p>) starting with numbers, prompts, or labels
    try {
      const pElements = Array.from(container.querySelectorAll('p, div[class*="paragraph"]'));
      if (pElements.length >= 1) {
        const pItems = [];
        for (const p of pElements) {
          const clone = p.cloneNode(true);
          clone.querySelectorAll('button, svg, [class*="citation"], [class*="footnote"], sup').forEach(el => el.remove());
          let text = clone.innerText || clone.textContent || '';
          if (isNumberedOrPrefixed(text)) {
            const stripped = cleanItemText(text);
            if (stripped.length >= 8) {
              pItems.push(stripped);
            }
          }
        }
        if (pItems.length >= 1) {
          return pItems.slice(0, maxCount);
        }
      }
    } catch (e) {}

    // STRATEGY 4: Plain text line-by-line parsing
    return parseQuestionsFromText(rawText, maxCount);
  }

  /**
   * Finds and extracts prompts/questions from the latest model response across platforms
   * @param {number} maxCount Maximum number of items to extract (default 10)
   */
  function extractQuestionsFromLatestResponse(maxCount = 10) {
    const bestContainer = findLatestResponseContainer();
    if (!bestContainer) return [];

    return extractItemsFromContainer(bestContainer, maxCount);
  }

  /**
   * Tries extracting items from all assistant containers (in reverse order)
   */
  function extractFromAllAssistantResponses(maxCount = 10) {
    const containers = findAllResponseContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const items = extractItemsFromContainer(containers[i], maxCount);
      if (items.length >= 1) {
        return items;
      }
    }
    return [];
  }

  function parseQuestionsFromText(text, maxCount = 10) {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = [];

    // Check for lines starting with numbers or labels
    for (const line of lines) {
      if (isNumberedOrPrefixed(line)) {
        const stripped = cleanItemText(line);
        if (stripped.length >= 8) {
          items.push(stripped);
        }
      }
    }

    if (items.length >= 1) {
      return items.slice(0, maxCount);
    }

    // Fallback 1: Bullet items (- , * , • )
    const bulletRegex = /^[\s\*\_\-\•]+[\-\•\*\►\▸\⁃]\s+/;
    for (const line of lines) {
      if (bulletRegex.test(line)) {
        const stripped = line.replace(bulletRegex, '').trim();
        if (stripped.length >= 12) {
          items.push(cleanItemText(stripped));
        }
      }
    }
    if (items.length >= 1) {
      return items.slice(0, maxCount);
    }

    // Fallback 2: Substantial lines (length >= 25, ignoring conversational preambles)
    const substantialLines = lines
      .map(cleanItemText)
      .filter(l => {
        if (l.length < 25) return false;
        const lower = l.toLowerCase();
        if (lower.startsWith('here are') || lower.startsWith('sure,') || lower.startsWith('certainly') || lower.startsWith('here is') || lower.startsWith('below is') || lower.startsWith('below are')) return false;
        return true;
      });

    if (substantialLines.length >= 1) {
      return substantialLines.slice(0, maxCount);
    }

    return [];
  }

  /**
   * Positions view at the top of the latest generated response
   */
  function scrollToLatestResponseTop() {
    try {
      const latest = findLatestResponseContainer();
      if (latest && latest !== document.body) {
        latest.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const config = getConfig();
      for (const sel of config.responseSelectors) {
        const elements = document.querySelectorAll(sel);
        if (elements && elements.length > 0) {
          const el = elements[elements.length - 1];
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    } catch (e) {}
  }

  /**
   * Finds all scrollable elements in the current platform's layout
   */
  function findScrollableContainers() {
    const config = getConfig();
    const found = new Set();

    // 1. Platform specific selectors
    config.scrollSelectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el && el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 0) {
            found.add(el);
          }
        });
      } catch (e) {}
    });

    // 2. Generic overflow check
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
   */
  function scrollDownSlowly(durationMs = 5000, onProgress = null) {
    return new Promise(resolve => {
      const containers = findScrollableContainers();
      const config = getConfig();

      let latestResponse = null;
      for (const sel of config.responseSelectors) {
        const elements = document.querySelectorAll(sel);
        if (elements && elements.length > 0) {
          latestResponse = elements[elements.length - 1];
          break;
        }
      }

      const containerPlans = containers.map(container => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        let startScroll = container.scrollTop;

        // Anchor near top if currently sitting at bottom
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

        containerPlans.forEach(plan => {
          const { container, startScroll, targetScroll } = plan;
          const currentMax = container.scrollHeight - container.clientHeight;
          const finalTarget = Math.max(targetScroll, currentMax);
          const currentPos = startScroll + (finalTarget - startScroll) * progress;
          container.scrollTop = currentPos;
        });

        // Window scroll fallback
        const docEl = document.scrollingElement || document.documentElement;
        const windowMax = docEl.scrollHeight - window.innerHeight;
        if (windowMax > 0) {
          window.scrollTo({ top: windowMax * progress, behavior: 'auto' });
        }

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          containerPlans.forEach(plan => {
            plan.container.scrollTop = plan.container.scrollHeight;
          });
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });

          const input = findInputElement();
          if (input) {
            try {
              input.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } catch (e) {}
          }

          if (typeof onProgress === 'function') onProgress(1.0, 0.0);
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  return {
    getPlatform,
    getConfig,
    findInputElement,
    findSendButton,
    isGenerating,
    typeMessage,
    clickSend,
    snapshotResponseState,
    findAllResponseContainers,
    findLatestResponseContainer,
    waitForResponseComplete,
    extractQuestionsFromLatestResponse,
    extractFromAllAssistantResponses,
    parseQuestionsFromText,
    scrollToLatestResponseTop,
    findScrollableContainers,
    scrollDownSlowly
  };
})();

// Alias for backward compatibility
window.GeminiDOM = window.PlatformDOM;
