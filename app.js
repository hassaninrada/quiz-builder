/* ============================================================
   QuizForge AI — app.js
   Bilingual (English + Urdu) | High-Quality OCR | MCQ Generator
   Powered by Hassaninrada
   ============================================================ */

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const App = {
  images: [],
  inputMode: 'both',     // 'both' | 'images' | 'text'
  langPref: 'auto',      // 'auto' | 'en' | 'ur'
  mcqLang: 'auto',       // 'auto' | 'en' | 'ur'
  detectedLang: 'en',    // detected from content
  allText: '',           // combined extracted text
  quiz: null,
  session: null,
  sessionAnswers: [],
  todos: [],
  todoFilter: 'all',
  questionCount: 100,
  timerSeconds: 30,
};

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadTodos();
  setupFileInput();
  setupDragDrop();
  setupTextarea();
  checkURLForQuiz();
  addPoweredBy();
});

function addPoweredBy() {
  // Insert powered-by bar after header
  const bar = document.createElement('div');
  bar.className = 'powered-by';
  bar.innerHTML = 'Powered by <span>Hassaninrada</span>';
  document.querySelector('.header').insertAdjacentElement('afterend', bar);

  // Also add footer
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = '⚡ <span class="brand">QuizForge AI</span> — Powered by <span class="brand">Hassaninrada</span> &nbsp;|&nbsp; No database · Works offline · English &amp; اردو';
  document.querySelector('.main').insertAdjacentElement('afterend', footer);
}

// ═══════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'share') renderSharePanel();
  if (name === 'quiz')  refreshQuizTab();
}
document.querySelectorAll('.nav-tab').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

// ═══════════════════════════════════════════════════════════
// INPUT MODE
// ═══════════════════════════════════════════════════════════
function setInputMode(mode) {
  App.inputMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-btn-' + mode).classList.add('active');

  const imgSec  = document.getElementById('image-section');
  const txtSec  = document.getElementById('text-section');
  const txtBtn  = document.getElementById('text-generate-btn-row');

  imgSec.style.display = (mode === 'both' || mode === 'images') ? 'block' : 'none';
  txtSec.style.display = (mode === 'both' || mode === 'text')   ? 'block' : 'none';
  txtBtn.style.display = (mode === 'text') ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// LANGUAGE PREFERENCE
// ═══════════════════════════════════════════════════════════
function setLang(lang) {
  App.langPref = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('lang-' + lang).classList.add('active');
}

function setMcqLang(lang) {
  App.mcqLang = lang;
  document.querySelectorAll('.count-btn[data-mcqlang]').forEach(b =>
    b.classList.toggle('active', b.dataset.mcqlang === lang));
}

// ─── Detect language from text ───────────────────────────
function detectLanguage(text) {
  if (!text || text.trim().length < 10) return 'en';
  // Count Urdu/Arabic Unicode characters
  const urduChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  const ratio = totalChars > 0 ? urduChars / totalChars : 0;
  return ratio > 0.25 ? 'ur' : 'en';
}

function updateDetectedLangUI(lang) {
  App.detectedLang = lang;
  const badge = document.getElementById('detected-lang-badge');
  const pill  = document.getElementById('lang-detected-pill');
  const label = lang === 'ur' ? '🇵🇰 اردو Detected' : '🇬🇧 English Detected';
  badge.textContent = label;
  badge.style.display = 'inline';
  if (pill) {
    pill.textContent = lang === 'ur' ? '🇵🇰 اردو' : '🇬🇧 English';
    pill.className = 'lang-detected-pill ' + lang;
  }
}

// ═══════════════════════════════════════════════════════════
// TEXTAREA (Direct Text Input)
// ═══════════════════════════════════════════════════════════
function setupTextarea() {
  const ta = document.getElementById('direct-text');
  if (!ta) return;
  ta.addEventListener('input', onTextInput);
}

function onTextInput() {
  const ta   = document.getElementById('direct-text');
  const text = ta.value.trim();
  const meta = document.getElementById('text-input-meta');
  const det  = document.getElementById('text-lang-detect');

  const words = text ? text.split(/\s+/).length : 0;
  meta.textContent = words.toLocaleString() + ' words';

  if (text.length > 30) {
    const lang = detectLanguage(text);
    App.detectedLang = lang;
    det.innerHTML = lang === 'ur'
      ? '<span style="color:#4ade80">🇵🇰 Urdu text detected — will generate Urdu MCQs</span>'
      : '<span style="color:#60a5fa">🇬🇧 English text detected — will generate English MCQs</span>';
  } else {
    det.textContent = '';
  }
}

function prepareTextForQuiz() {
  const text = document.getElementById('direct-text').value.trim();
  if (!text || text.length < 30) {
    showToast('Please enter more text (at least 30 characters)', 'error');
    return;
  }
  App.allText = text;
  const lang = detectLanguage(text);
  updateDetectedLangUI(lang);
  showExtractedPanel(text);
  show('quiz-settings-bar');
  document.getElementById('quiz-settings-bar').scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════
// FILE INPUT & DRAG-DROP
// ═══════════════════════════════════════════════════════════
function setupFileInput() {
  const input = document.getElementById('image-files-input');
  if (!input) return;
  input.addEventListener('change', e => {
    if (e.target.files.length) addImages(Array.from(e.target.files));
    input.value = '';
  });
}

function setupDragDrop() {
  document.body.addEventListener('dragover', e => { e.preventDefault(); highlightDrop(true); });
  document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) highlightDrop(false); });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    highlightDrop(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) addImages(files);
    else showToast('Please drop image files only', 'error');
  });

  const zone = document.getElementById('mega-drop-zone');
  if (zone) zone.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') document.getElementById('image-files-input').click();
  });
}

function highlightDrop(on) {
  const z = document.getElementById('mega-drop-zone');
  if (z) z.classList.toggle('dragover', on);
}

// ═══════════════════════════════════════════════════════════
// ADD IMAGES
// ═══════════════════════════════════════════════════════════
function addImages(files) {
  const MAX = 200;
  const remaining = MAX - App.images.length;
  if (remaining <= 0) { showToast('Maximum 200 images reached!', 'error'); return; }
  const toAdd = files.slice(0, remaining);
  if (files.length > remaining) showToast(`Adding ${toAdd.length} images (200 max)`);

  toAdd.forEach(file => {
    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
    const entry = { id, file, name: file.name, status: 'pending', text: '', confidence: 0, dataUrl: '' };
    App.images.push(entry);

    const reader = new FileReader();
    reader.onload = e => { entry.dataUrl = e.target.result; renderImageCard(entry); };
    reader.readAsDataURL(file);
  });

  hide('mega-drop-zone');
  show('processing-panel');
  updateActionBar();
  resetOutputPanels();
}

// ═══════════════════════════════════════════════════════════
// IMAGE CARD RENDER
// ═══════════════════════════════════════════════════════════
function renderImageCard(entry) {
  const grid = document.getElementById('image-grid');
  let card = document.getElementById('card-' + entry.id);
  if (!card) { card = document.createElement('div'); card.className = 'img-card'; card.id = 'card-' + entry.id; grid.appendChild(card); }

  const statusMap = { pending: '⏳ Pending', processing: '🔍 Reading...', done: '✅ Done', error: '❌ Error' };
  let qualityHtml = '';
  if (entry.status === 'done' && entry.confidence > 0) {
    const qClass = entry.confidence > 75 ? 'high' : entry.confidence > 50 ? 'medium' : 'low';
    const qLabel = entry.confidence > 75 ? '🟢 High Quality' : entry.confidence > 50 ? '🟡 Medium Quality' : '🔴 Low Quality';
    qualityHtml = `<div class="ocr-quality ${qClass}">${qLabel} (${Math.round(entry.confidence)}%)</div>`;
  }
  const wordCount = entry.text ? entry.text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  card.innerHTML = `
    <img class="thumb" src="${entry.dataUrl||''}" alt="${escapeHTML(entry.name)}" loading="lazy"/>
    <button class="remove-btn" onclick="removeImage('${entry.id}')" title="Remove">✕</button>
    <div class="img-info">
      <div class="img-name" title="${escapeHTML(entry.name)}">${escapeHTML(entry.name)}</div>
      <div class="img-status ${entry.status}">${statusMap[entry.status]||''}</div>
      ${entry.status==='done' ? `<div class="img-status done" style="font-size:.65rem">${wordCount} words</div>` : ''}
      ${qualityHtml}
    </div>`;
}

function removeImage(id) {
  App.images = App.images.filter(i => i.id !== id);
  const card = document.getElementById('card-' + id);
  if (card) card.remove();
  if (App.images.length === 0) { show('mega-drop-zone'); hide('processing-panel'); }
  updateActionBar();
}

function clearAllImages() {
  if (!confirm('Clear all images?')) return;
  App.images = [];
  document.getElementById('image-grid').innerHTML = '';
  show('mega-drop-zone'); hide('processing-panel');
  resetOutputPanels();
}

function updateActionBar() {
  const n    = App.images.length;
  const done = App.images.filter(i => i.status === 'done').length;
  const proc = App.images.filter(i => i.status === 'processing').length;
  document.getElementById('img-count-badge').textContent = n + (n===1?' image':' images');
  document.getElementById('ocr-summary').textContent = proc > 0
    ? `⏳ Extracting... (${done} done)`
    : done > 0 ? `✅ ${done} image${done>1?'s':''} extracted`
    : 'Ready to extract text';
}

function resetOutputPanels() {
  hide('extracted-panel');
  hide('quiz-settings-bar');
  App.allText = '';
}

// ═══════════════════════════════════════════════════════════
// BULK OCR — HIGH QUALITY
// ═══════════════════════════════════════════════════════════
async function startBulkOCR() {
  const pending = App.images.filter(i => i.status === 'pending' || i.status === 'error');
  if (!pending.length) {
    if (App.images.some(i => i.status === 'done')) { combineAndShowText(); return; }
    showToast('No images to process', 'error');
    return;
  }

  const btn = document.getElementById('extract-btn');
  btn.disabled = true; btn.textContent = '⏳ Extracting...';

  show('bulk-progress-section');
  document.getElementById('bulk-prog-fill').style.width = '0%';

  // Determine OCR language based on preference
  const ocrLang = App.langPref === 'ur' ? 'urd'
                : App.langPref === 'en' ? 'eng'
                : 'eng+urd';   // Auto = try both

  const total = pending.length;
  let done = 0;

  // Process in batches of 3 for speed
  const BATCH = 3;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    await Promise.all(batch.map(entry => ocrOneImage(entry, ocrLang)));
    done += batch.length;
    const pct = Math.round((done / total) * 100);
    document.getElementById('bulk-prog-fill').style.width = pct + '%';
    document.getElementById('bulk-prog-count').textContent = `${done} / ${total}`;
    document.getElementById('bulk-prog-label').textContent =
      done >= total ? '✅ Extraction complete!' : `🔍 Extracting text... (${done}/${total})`;
  }

  btn.disabled = false; btn.textContent = '🔄 Re-extract';
  showToast(`✅ Done! Processed ${done} images`, 'success');
  combineAndShowText();
}

// ─── OCR a single image with quality filtering ────────────
async function ocrOneImage(entry, lang) {
  entry.status = 'processing';
  renderImageCard(entry);
  updateActionBar();

  try {
    const result = await Tesseract.recognize(entry.dataUrl, lang, {
      logger: () => {}
    });

    const rawText  = result.data.text || '';
    const avgConf  = result.data.confidence || 0;
    entry.confidence = avgConf;

    // ── HIGH-QUALITY FILTER: only keep clean text ──
    entry.text = cleanOCRText(rawText, avgConf);
    entry.status = entry.text.length > 5 ? 'done' : 'error';

    if (entry.status === 'error') {
      entry.text = '';
      console.warn(`Low quality OCR for ${entry.name} (conf: ${avgConf})`);
    }

  } catch (err) {
    entry.status = 'error';
    entry.text   = '';
    console.warn('OCR error:', entry.name, err.message);
  }

  renderImageCard(entry);
  updateActionBar();
}

// ─── Clean OCR output — remove garbage ───────────────────
function cleanOCRText(raw, confidence) {
  if (!raw || raw.trim().length === 0) return '';

  let lines = raw.split('\n');

  lines = lines.map(line => {
    // Remove leading/trailing whitespace
    line = line.trim();

    // Skip very short lines (likely noise)
    if (line.length < 3) return '';

    // Skip lines that are mostly non-alphanumeric (garbage)
    const alphaNum  = (line.match(/[a-zA-Z0-9\u0600-\u06FF]/g) || []).length;
    const totalChar = line.replace(/\s/g, '').length;
    if (totalChar > 0 && alphaNum / totalChar < 0.4) return '';

    // Skip lines with too many repeated special chars (scanner artifacts)
    if (/[|_\-=~]{4,}/.test(line)) return '';

    // Skip lines that are just numbers/symbols with no words
    if (/^[\d\s\W]{1,6}$/.test(line) && !/\w{2}/.test(line)) return '';

    // Fix common OCR mistakes
    line = line
      .replace(/\s{2,}/g, ' ')     // multiple spaces → single
      .replace(/([a-z])\|([a-z])/gi, '$1l$2')  // | → l between letters
      .replace(/0(?=[a-zA-Z])|(?<=[a-zA-Z])0/g, 'o');  // 0 → o near letters

    return line;
  });

  // Remove empty lines and join
  let cleaned = lines.filter(l => l.length > 0).join('\n');

  // Remove isolated single characters on their own lines
  cleaned = cleaned.replace(/^\s*[a-zA-Z]\s*$/gm, '');

  // Remove lines that are just punctuation
  cleaned = cleaned.replace(/^[\s\W]+$/gm, '');

  // Final trim
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

// ─── Combine all extracted texts ──────────────────────────
function combineAndShowText() {
  const parts = App.images
    .filter(i => i.status === 'done' && i.text && i.text.length > 5)
    .map((i, idx) => i.text);

  // Also include direct text if entered
  const directText = (document.getElementById('direct-text')?.value || '').trim();
  if (directText) parts.push(directText);

  App.allText = parts.join('\n\n');

  if (!App.allText.trim()) {
    showToast('⚠️ No readable text found. Try clearer images.', 'error');
    return;
  }

  // Detect language
  const lang = App.langPref === 'auto' ? detectLanguage(App.allText) : App.langPref;
  updateDetectedLangUI(lang);
  showExtractedPanel(App.allText);
  show('quiz-settings-bar');
  setTimeout(() => document.getElementById('quiz-settings-bar').scrollIntoView({ behavior: 'smooth' }), 300);
}

function showExtractedPanel(text) {
  const words = text.trim().split(/\s+/).length;
  const imgs  = App.images.filter(i => i.status === 'done').length;
  const lang  = detectLanguage(text);

  let statsText = `${words.toLocaleString()} words · ${text.length.toLocaleString()} characters`;
  if (imgs > 0) statsText = `${imgs} image${imgs>1?'s':''} · ` + statsText;

  document.getElementById('extracted-stats').textContent = statsText;

  // Show preview (first 2000 chars)
  const preview = document.getElementById('extracted-text-preview');
  const previewText = text.length > 2000 ? text.slice(0, 2000) + '\n\n... (truncated for preview)' : text;
  preview.textContent = previewText;
  if (lang === 'ur') {
    preview.classList.add('urdu');
  } else {
    preview.classList.remove('urdu');
  }

  show('extracted-panel');
}

function copyAllText() {
  navigator.clipboard.writeText(App.allText).then(() => showToast('Copied!', 'success'));
}

function toggleExtracted() {
  const el = document.getElementById('extracted-text-preview');
  el.style.maxHeight = el.style.maxHeight === 'none' ? '200px' : 'none';
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
function setCount(val) {
  App.questionCount = val === 'custom' ? null : val;
  document.getElementById('custom-count-input').style.display = val === 'custom' ? 'block' : 'none';
  document.querySelectorAll('.count-btn[data-count]').forEach(b =>
    b.classList.toggle('active', b.dataset.count == val));
}
function setTimer(val) {
  App.timerSeconds = parseInt(val);
  document.querySelectorAll('.count-btn[data-timer]').forEach(b =>
    b.classList.toggle('active', b.dataset.timer == val));
}
function toggleApiKey() {
  const v = document.getElementById('ai-engine').value;
  document.getElementById('api-key-section').style.display = v === 'gemini' ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// QUIZ GENERATION
// ═══════════════════════════════════════════════════════════
async function generateQuiz() {
  // Combine image text + direct text
  const directText = (document.getElementById('direct-text')?.value || '').trim();
  if (!App.allText && directText) { App.allText = directText; }
  if (!App.allText || App.allText.trim().length < 30) {
    showToast('Please extract text from images first!', 'error'); return;
  }

  let count = App.questionCount;
  if (!count) { count = parseInt(document.getElementById('custom-count').value)||100; count = Math.min(500,Math.max(10,count)); }

  const title  = document.getElementById('quiz-title').value.trim() || 'My Quiz';
  const diff   = document.getElementById('difficulty').value;
  const optCnt = parseInt(document.getElementById('option-count').value);
  const engine = document.getElementById('ai-engine').value;
  const apiKey = document.getElementById('gemini-api-key')?.value?.trim()||'';

  if (engine === 'gemini' && !apiKey) { showToast('Enter Gemini API key', 'error'); return; }

  // Determine final language for MCQs
  const contentLang = detectLanguage(App.allText);
  const mcqLang = App.mcqLang === 'auto' ? contentLang : App.mcqLang;

  showGenOverlay(true, mcqLang === 'ur' ? 'اردو MCQs بنا رہے ہیں...' : 'Generating English MCQs...', 5);

  try {
    let questions;
    if (engine === 'gemini' && apiKey) {
      questions = await generateWithGemini(App.allText, count, diff, optCnt, apiKey, mcqLang);
    } else {
      questions = await generateBuiltIn(App.allText, count, diff, optCnt, mcqLang);
    }

    setGenProgress(95, 'Almost done...');
    await sleep(400);

    App.quiz = {
      id: uid(), title, questions: questions.slice(0, count),
      difficulty: diff, timerSeconds: App.timerSeconds, lang: mcqLang,
    };
    localStorage.setItem('quizforge_quiz', JSON.stringify(App.quiz));
    setGenProgress(100, 'Done!');
    await sleep(500);
    showGenOverlay(false);
    showToast(`✅ ${App.quiz.questions.length} ${mcqLang==='ur'?'اردو ':''}questions created!`, 'success');
    switchTab('quiz');

  } catch (err) {
    showGenOverlay(false);
    showToast('Failed: ' + err.message, 'error');
    console.error(err);
  }
}

function showGenOverlay(v, title, pct) {
  document.getElementById('gen-overlay').style.display = v ? 'flex' : 'none';
  if (title) document.getElementById('gen-title').textContent = title;
  if (pct !== undefined) setGenProgress(pct);
}
function setGenProgress(pct, title) {
  document.getElementById('gen-fill').style.width = pct + '%';
  document.getElementById('gen-pct').textContent = pct + '%';
  if (title) document.getElementById('gen-title').textContent = title;
}

// ═══════════════════════════════════════════════════════════
// BUILT-IN MCQ ENGINE
// ═══════════════════════════════════════════════════════════
async function generateBuiltIn(text, count, difficulty, optCount, lang) {
  setGenProgress(10, lang === 'ur' ? 'متن کا تجزیہ...' : 'Parsing text...');
  await sleep(100);

  const sentences  = splitSentences(text, lang);
  if (sentences.length < 3) throw new Error('Not enough readable text. Please add clearer images or more text.');

  const keywords   = extractKeywords(text, lang);
  const definitions = extractDefinitions(sentences, lang);

  setGenProgress(25, lang === 'ur' ? 'سوالات بنا رہے ہیں...' : 'Building questions...');
  await sleep(100);

  const pool = [
    ...definitions.map(d => ({ type: 'def', ...d })),
    ...sentences.map(s => ({ type: 'sent', text: s })),
  ];
  shuffle(pool);

  const questions = [];
  const used = new Set();

  for (let i = 0; i < pool.length && questions.length < count; i++) {
    const item = pool[i];
    const key = (item.text || item.full || '').slice(0, 45);
    if (used.has(key)) continue;
    used.add(key);

    let q = null;
    try {
      const r = Math.random();
      if (item.type === 'def') {
        q = makeDefQuestion(item, sentences, optCount, lang);
      } else if (r < 0.35) {
        q = makeFillBlank(item.text, keywords, optCount, lang);
      } else if (r < 0.65) {
        q = makeWhichCorrect(item.text, sentences, optCount, lang);
      } else {
        q = makeKeywordQ(item.text, keywords, sentences, optCount, lang);
      }
    } catch (_) {}

    if (q && isValidQuestion(q, optCount)) {
      q.id = questions.length + 1;
      q.difficulty = pickDifficulty(questions.length, count, difficulty);
      q.lang = lang;
      questions.push(q);
    }

    if (i % 10 === 0) {
      const pct = 25 + Math.round((questions.length / count) * 60);
      setGenProgress(Math.min(pct, 85), `${questions.length} / ${count}`);
      await sleep(5);
    }
  }

  // Fill remaining
  if (questions.length < count) {
    const extra = makeFillers(sentences, keywords, count - questions.length, optCount, questions.length + 1, difficulty, lang);
    questions.push(...extra);
  }

  setGenProgress(90, 'Finalizing...');
  await sleep(150);
  return questions.slice(0, count);
}

function isValidQuestion(q, optCount) {
  return q && q.question && q.options && q.options.length >= Math.min(optCount, 2)
      && q.correct >= 0 && q.correct < q.options.length
      && q.question.length > 5;
}

// ─── Language-aware sentence split ───────────────────────
function splitSentences(text, lang) {
  let sents;
  if (lang === 'ur') {
    // Urdu sentence enders: ۔ ؟ !
    sents = text.split(/[۔؟!.?!]+/).map(s => s.trim()).filter(s => s.length > 10);
  } else {
    sents = text.replace(/\n+/g,' ').split(/(?<=[.!?])\s+/).map(s => s.trim())
      .filter(s => s.length > 20 && s.split(/\s+/).length >= 4 && s.split(/\s+/).length < 60);
  }
  return sents;
}

// ─── Keyword extraction ────────────────────────────────────
function extractKeywords(text, lang) {
  if (lang === 'ur') {
    // For Urdu: extract words longer than 2 chars that appear frequently
    const words = text.match(/[\u0600-\u06FF]{3,}/g) || [];
    const freq = {};
    words.forEach(w => freq[w] = (freq[w]||0) + 1);
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, 80).map(([w])=>w);
  }
  const stop = new Set(['the','a','an','is','are','was','were','be','been','have','has','had',
    'do','does','did','will','would','could','should','may','might','can','to','of','in','for',
    'on','with','at','by','from','up','about','into','this','that','these','those','and','but',
    'or','if','as','so','then','when','where','how','what','which','who','not','no','all','each',
    'more','also','than','too','very','just','over','such','only','other','some','they','them',
    'their','we','our','you','your','he','she','it','his','her','i','me','its','both','few','most',
    'same','any','own','between','while','through','during','before','after','above','below',
    'still','well','even','already','often','much','many','image','page','text','line']);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq  = {};
  words.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w]||0) + 1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, 100).map(([w])=>w);
}

function extractDefinitions(sentences, lang) {
  if (lang === 'ur') {
    // Urdu definition patterns: "X کو Y کہتے ہیں" / "X یعنی Y"
    return sentences.flatMap(s => {
      const m = s.match(/^(.{4,30}?)(?:\s+کو|\s+یعنی|\s+کا مطلب)\s+(.{5,})/);
      return m ? [{ term: m[1].trim(), definition: m[2].trim(), full: s }] : [];
    });
  }
  return sentences.flatMap(s => {
    const m = s.match(/^(.{4,60}?)\s+(?:is|are|refers to|means|defined as|known as|called)\s+(.{10,})/i);
    return m ? [{ term: m[1].trim(), definition: m[2].trim(), full: s }] : [];
  });
}

// ─── Question Templates ────────────────────────────────────
const QT = {
  en: {
    def:       t  => `What is "${trunc(t, 55)}"?`,
    fill:      s  => `Fill in the blank: ${s}`,
    which:     () => `Which of the following statements is correct?`,
    keyword:   kw => `Which statement is true about "${kw}"?`,
    fakeFacts: [
      'This concept has been disproven by modern research.',
      'The opposite principle applies in this case.',
      'This process does not occur under normal conditions.',
      'This statement contradicts established theory.',
      'The relationship here is inverse, not direct.',
      'This has no significant effect in practice.',
      'None of the above conditions are applicable.',
      'This is considered negligible in most contexts.',
    ],
  },
  ur: {
    def:       t  => `"${trunc(t, 55)}" سے کیا مراد ہے؟`,
    fill:      s  => `خالی جگہ پُر کریں: ${s}`,
    which:     () => `درج ذیل میں سے کون سا جملہ درست ہے؟`,
    keyword:   kw => `"${kw}" کے بارے میں کون سا بیان درست ہے؟`,
    fakeFacts: [
      'یہ تصور جدید تحقیق سے غلط ثابت ہو چکا ہے۔',
      'اس صورت میں الٹا اصول لاگو ہوتا ہے۔',
      'یہ عمل عام حالات میں نہیں ہوتا۔',
      'یہ بیان قائم شدہ نظریے سے متصادم ہے۔',
      'یہاں تعلق براہ راست نہیں بلکہ الٹا ہے۔',
      'عملی طور پر اس کا کوئی خاص اثر نہیں ہوتا۔',
      'مذکورہ بالا میں سے کوئی بھی درست نہیں۔',
      'یہ اکثر حالات میں قابلِ توجہ نہیں ہوتا۔',
    ],
  },
};

let fakeIdx = 0;
function getFake(lang) {
  const arr = QT[lang]?.fakeFacts || QT.en.fakeFacts;
  return arr[fakeIdx++ % arr.length];
}

function makeDefQuestion(item, sentences, optCount, lang) {
  const qt = QT[lang] || QT.en;
  const question = qt.def(item.term);
  const correct  = trunc(item.definition, 130);
  const distractors = pickDistractors(correct, sentences, optCount - 1, lang);
  const opts = shuffled([correct, ...distractors]).slice(0, optCount);
  return { question, options: opts, correct: opts.indexOf(correct) };
}

function makeFillBlank(sentence, keywords, optCount, lang) {
  const words = sentence.split(/\s+/);
  let blankIdx = -1, blankWord = '';

  // Find a keyword to blank out
  for (let i = 1; i < words.length - 1; i++) {
    const clean = words[i].replace(/[^\w\u0600-\u06FF]/g, '');
    if (clean.length > 2 && keywords.includes(clean.toLowerCase())) {
      blankIdx = i; blankWord = words[i]; break;
    }
  }
  if (blankIdx === -1) {
    const cands = words.filter((w,i) => i > 0 && w.replace(/[^\w\u0600-\u06FF]/g,'').length > 3);
    if (!cands.length) return null;
    blankWord = cands[Math.floor(Math.random()*cands.length)];
    blankIdx  = words.indexOf(blankWord);
  }

  const blanked  = [...words]; blanked[blankIdx] = '_____';
  const cleanAns = blankWord.replace(/[.,;:!?()"'۔،؟]/g,'');
  const qt = QT[lang] || QT.en;
  const question = qt.fill(blanked.join(' '));
  const distractors = pickWordDistractors(cleanAns, keywords, optCount - 1);
  const opts = shuffled([cleanAns, ...distractors]).slice(0, optCount);
  const ci   = opts.indexOf(cleanAns);
  if (ci === -1) { opts[0] = cleanAns; return { question, options: opts, correct: 0 }; }
  return { question, options: opts, correct: ci };
}

function makeWhichCorrect(sentence, allSentences, optCount, lang) {
  const qt = QT[lang] || QT.en;
  const correct = trunc(sentence, 130);
  const wrong   = shuffled(allSentences.filter(s=>s!==sentence)).slice(0, optCount-1).map(s=>trunc(s,130));
  while (wrong.length < optCount - 1) wrong.push(getFake(lang));
  const opts = shuffled([correct, ...wrong]).slice(0, optCount);
  return { question: qt.which(), options: opts, correct: opts.indexOf(correct) };
}

function makeKeywordQ(sentence, keywords, allSentences, optCount, lang) {
  const qt = QT[lang] || QT.en;
  const kw = keywords.find(k => sentence.toLowerCase().includes(k)) || keywords[0];
  if (!kw) return makeWhichCorrect(sentence, allSentences, optCount, lang);
  const correct = trunc(sentence, 130);
  const wrong   = shuffled(allSentences.filter(s=>s!==sentence)).slice(0, optCount-1).map(s=>trunc(s,130));
  while (wrong.length < optCount - 1) wrong.push(getFake(lang));
  const opts = shuffled([correct, ...wrong]).slice(0, optCount);
  return { question: qt.keyword(kw), options: opts, correct: opts.indexOf(correct) };
}

function makeFillers(sentences, keywords, needed, optCount, startId, difficulty, lang) {
  const qs = [];
  for (let i = 0; i < needed * 4 && qs.length < needed; i++) {
    const s = sentences[i % Math.max(1, sentences.length)];
    if (!s) continue;
    const q = makeFillBlank(s, keywords, optCount, lang) || makeWhichCorrect(s, sentences, optCount, lang);
    if (q && isValidQuestion(q, optCount)) {
      q.id = startId + qs.length;
      q.difficulty = pickDifficulty(qs.length, needed, difficulty);
      q.lang = lang;
      qs.push(q);
    }
  }
  return qs;
}

function pickDistractors(correct, sentences, count, lang) {
  const pool = new Set();
  shuffled(sentences).forEach(s => { if (pool.size < count) { const t=trunc(s,130); if(t!==correct) pool.add(t); } });
  while (pool.size < count) pool.add(getFake(lang));
  return [...pool].slice(0, count);
}

function pickWordDistractors(word, keywords, count) {
  const others = keywords.filter(k => k !== word.toLowerCase() && k.length > 2);
  shuffle(others);
  const result = [];
  for (let i = 0; result.length < count; i++) result.push(others[i % Math.max(1,others.length)] || 'term');
  return [...new Set(result)].slice(0, count);
}

function pickDifficulty(idx, total, setting) {
  if (setting !== 'mixed') return setting;
  const r = idx / Math.max(1, total);
  return r < 0.33 ? 'easy' : r < 0.66 ? 'medium' : 'hard';
}

// ═══════════════════════════════════════════════════════════
// GEMINI API GENERATION
// ═══════════════════════════════════════════════════════════
async function generateWithGemini(text, count, difficulty, optCount, apiKey, lang) {
  const labels = ['A','B','C','D','E'].slice(0, optCount);
  const BATCH  = 25;
  const all    = [];

  const langInstr = lang === 'ur'
    ? 'IMPORTANT: Generate ALL questions and answers in URDU language (اردو). Use proper Urdu script.'
    : 'Generate ALL questions and answers in ENGLISH.';

  for (let b = 0; b < Math.ceil(count/BATCH); b++) {
    const bSize = Math.min(BATCH, count - all.length);
    setGenProgress(15 + Math.round((b / Math.ceil(count/BATCH)) * 72),
      `Gemini: batch ${b+1}...`);

    const prompt = `You are an expert exam question creator.
${langInstr}
Generate EXACTLY ${bSize} multiple-choice questions from the text below.
Difficulty: ${difficulty}. Each question has ${optCount} options (${labels.join(', ')}).

Return ONLY a valid JSON array. Each object must have:
- "question": string
- "options": array of exactly ${optCount} strings
- "correct": 0-based integer index of correct answer

Text:
"""
${text.slice(0, 9000)}
"""

Return ONLY the JSON array. No markdown code blocks. No explanation. No extra text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:8192} }) }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message||'Gemini API error'); }
    const data  = await res.json();
    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const parsed = JSON.parse(clean);
    parsed.forEach((q,i) => {
      q.id = all.length + i + 1;
      q.difficulty = pickDifficulty(all.length + i, count, difficulty);
      q.lang = lang;
    });
    all.push(...parsed);
  }
  return all.slice(0, count);
}

// ═══════════════════════════════════════════════════════════
// QUIZ TAB
// ═══════════════════════════════════════════════════════════
function refreshQuizTab() {
  if (!App.quiz) {
    const saved = localStorage.getItem('quizforge_quiz');
    if (saved) try { App.quiz = JSON.parse(saved); } catch(_) {}
  }
  hide('no-quiz-state'); hide('quiz-ready-state'); hide('quiz-inprogress'); hide('quiz-results');

  if (!App.quiz) { show('no-quiz-state'); return; }

  const isUrdu = App.quiz.lang === 'ur';
  document.getElementById('quiz-display-title').textContent  = App.quiz.title;
  document.getElementById('quiz-display-title').className    = 'quiz-title-display' + (isUrdu?' urdu':'');
  document.getElementById('quiz-lang-flag').textContent      = isUrdu ? '🇵🇰' : '🇬🇧';
  document.getElementById('quiz-lang-badge').textContent     = isUrdu ? '🇵🇰 اردو' : '🇬🇧 English';
  document.getElementById('q-total').textContent             = App.quiz.questions.length;
  document.getElementById('q-timer-display').textContent     = App.quiz.timerSeconds > 0 ? App.quiz.timerSeconds+'s' : '∞';
  show('quiz-ready-state');
}

// ═══════════════════════════════════════════════════════════
// QUIZ SESSION
// ═══════════════════════════════════════════════════════════
let _timer = null;

function startQuiz() {
  App.sessionAnswers = [];
  App.session = {
    questions: shuffled(App.quiz.questions),
    current: 0, score: 0, correct: 0, wrong: 0, skipped: 0, _answered: false
  };
  hide('quiz-ready-state'); show('quiz-inprogress');
  document.getElementById('total-q-num').textContent = App.session.questions.length;
  loadQuestion();
}

function loadQuestion() {
  const s = App.session;
  if (!s || s.current >= s.questions.length) { finishQuiz(); return; }
  const q = s.questions[s.current];
  s._answered = false;

  document.getElementById('current-q-num').textContent = s.current + 1;
  document.getElementById('live-score').textContent    = s.score;
  document.getElementById('quiz-prog-fill').style.width = ((s.current / s.questions.length) * 100) + '%';

  const isUrdu = q.lang === 'ur' || App.quiz.lang === 'ur';
  document.getElementById('q-number-label').textContent = isUrdu
    ? `سوال ${s.current + 1} · ${getDifficultyLabel(q.difficulty, isUrdu)}`
    : `Question ${s.current + 1} · ${capFirst(q.difficulty||'medium')}`;

  const qText = document.getElementById('question-text');
  qText.textContent = q.question;
  qText.className = 'q-text' + (isUrdu ? ' urdu-q' : '');

  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  const labels = ['A','B','C','D','E'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (isUrdu ? ' urdu-opt' : '');
    btn.innerHTML = `<span class="option-label">${labels[i]}</span><span class="${isUrdu?'urdu':''}" style="${isUrdu?'flex:1;text-align:right':''}">${escapeHTML(opt)}</span>`;
    btn.onclick = () => chooseAnswer(i);
    grid.appendChild(btn);
  });

  clearInterval(_timer);
  const timerEl = document.getElementById('quiz-timer');
  if (App.quiz.timerSeconds > 0) {
    let left = App.quiz.timerSeconds;
    timerEl.style.display = 'block'; timerEl.textContent = left; timerEl.classList.remove('warning');
    _timer = setInterval(() => {
      left--;
      timerEl.textContent = left;
      if (left <= 5) timerEl.classList.add('warning');
      if (left <= 0) { clearInterval(_timer); autoSkip(); }
    }, 1000);
  } else { timerEl.style.display = 'none'; }

  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = 'slide-in .28s ease'; });
}

function getDifficultyLabel(d, urdu) {
  if (urdu) return d==='easy'?'آسان':d==='hard'?'مشکل':'درمیانہ';
  return capFirst(d||'medium');
}

function chooseAnswer(idx) {
  const s = App.session;
  if (!s || s._answered) return;
  s._answered = true;
  clearInterval(_timer);

  const q = s.questions[s.current];
  const correct = idx === q.correct;

  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    if (i === idx && !correct) btn.classList.add('wrong');
  });

  if (correct) { s.correct++; s.score += 10; } else { s.wrong++; }
  App.sessionAnswers.push({ q, chosen: idx, correct });
  setTimeout(() => { s.current++; loadQuestion(); }, 1100);
}

function skipQuestion() {
  const s = App.session;
  if (!s || s._answered) return;
  s._answered = true;
  clearInterval(_timer); s.skipped++;
  const q = s.questions[s.current];
  App.sessionAnswers.push({ q, chosen: -1, correct: false });
  document.querySelectorAll('.option-btn').forEach((btn,i) => {
    btn.disabled = true; if (i===q.correct) btn.classList.add('correct');
  });
  setTimeout(() => { s.current++; loadQuestion(); }, 700);
}

function autoSkip() { if (App.session && !App.session._answered) skipQuestion(); }

function quitQuiz() {
  clearInterval(_timer);
  if (confirm('Quit and see results?')) finishQuiz();
}

function finishQuiz() {
  clearInterval(_timer);
  const s = App.session;
  const total = s.questions.length;
  const pct   = total ? Math.round((s.correct / total) * 100) : 0;
  const isUrdu = App.quiz.lang === 'ur';

  hide('quiz-inprogress'); show('quiz-results');

  let trophy='🏆', grade='';
  if      (pct>=90){trophy='🏆';grade=isUrdu?'شاندار! بہترین کارکردگی!':'Outstanding! Brilliant!'}
  else if (pct>=75){trophy='🥈';grade=isUrdu?'بہت اچھا! شاباش!':'Great job! Well done!'}
  else if (pct>=60){trophy='🥉';grade=isUrdu?'اچھی کوشش! جاری رکھیں!':'Good effort! Keep going!'}
  else if (pct>=40){trophy='📚';grade=isUrdu?'مزید مشق کریں!':'Keep practicing!'}
  else             {trophy='💪';grade=isUrdu?'ہمت نہ ہاریں! دوبارہ کوشش کریں!':'Don\'t give up! Try again!'}

  document.getElementById('results-trophy').textContent = trophy;
  document.getElementById('score-pct').textContent      = pct + '%';
  document.getElementById('res-correct').textContent    = s.correct;
  document.getElementById('res-wrong').textContent      = s.wrong;
  document.getElementById('res-skipped').textContent    = s.skipped;
  document.getElementById('results-grade').textContent  = grade;
  document.getElementById('results-grade').className    = 'results-grade' + (isUrdu?' urdu':'');

  setTimeout(() => {
    const ring  = document.getElementById('ring-fill');
    ring.style.strokeDashoffset = 314 - (pct/100)*314;
    const color = pct>=75?'#22c55e':pct>=50?'#f59e0b':'#ef4444';
    ring.style.stroke = color;
    document.getElementById('score-pct').style.color = color;
  }, 150);

  App.session = null;
}

function restartQuiz() {
  hide('quiz-results'); hide('answer-review'); refreshQuizTab();
}

function reviewAnswers() {
  const el = document.getElementById('answer-review');
  if (el.style.display!=='none'){el.style.display='none';return;}
  if (!App.sessionAnswers.length){showToast('Finish a quiz first','error');return;}
  const labels=['A','B','C','D','E'];
  document.getElementById('review-list').innerHTML = App.sessionAnswers.map((a,i)=>`
    <div class="review-item">
      <div class="review-q ${a.q.lang==='ur'?'urdu':''}"><strong>${i+1}.</strong> ${escapeHTML(a.q.question)}</div>
      <div class="review-answers">
        <span class="review-correct ${a.q.lang==='ur'?'urdu':''}">✅ ${labels[a.q.correct]}. ${escapeHTML(a.q.options[a.q.correct]||'')}</span>
        ${!a.correct?`<span class="review-wrong ${a.q.lang==='ur'?'urdu':''}">❌ ${a.chosen>=0?labels[a.chosen]+'. '+escapeHTML(a.q.options[a.chosen]||''):'Skipped'}</span>`:'<span style="color:var(--green);font-size:.78rem">✅ Correct!</span>'}
      </div>
    </div>`).join('');
  el.style.display='block';
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ═══════════════════════════════════════════════════════════
// TO-DO
// ═══════════════════════════════════════════════════════════
function loadTodos() {
  try { App.todos = JSON.parse(localStorage.getItem('quizforge_todos')||'[]'); } catch(_){App.todos=[];}
  renderTodos();
}
function saveTodos() { localStorage.setItem('quizforge_todos', JSON.stringify(App.todos)); updateTodoBadge(); }
function updateTodoBadge() {
  const n=App.todos.filter(t=>!t.done).length;
  const b=document.getElementById('todo-badge');
  b.textContent=n; b.style.display=n?'inline':'none';
}
function addTodo() {
  const txt=document.getElementById('todo-input').value.trim();
  if(!txt)return;
  App.todos.unshift({id:Date.now(),text:txt,done:false,priority:document.getElementById('todo-priority').value,createdAt:Date.now()});
  document.getElementById('todo-input').value='';
  saveTodos(); renderTodos(); showToast('Task added!','success');
}
function toggleTodo(id){const t=App.todos.find(t=>t.id===id);if(t){t.done=!t.done;saveTodos();renderTodos();}}
function deleteTodo(id){App.todos=App.todos.filter(t=>t.id!==id);saveTodos();renderTodos();}
function clearDoneTodos(){App.todos=App.todos.filter(t=>!t.done);saveTodos();renderTodos();showToast('Cleared!','success');}
function filterTodos(f){App.todoFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter===f));renderTodos();}
function renderTodos() {
  const pO={high:0,medium:1,low:2};
  let list=[...App.todos];
  if(App.todoFilter==='pending')list=list.filter(t=>!t.done);
  else if(App.todoFilter==='done')list=list.filter(t=>t.done);
  else if(App.todoFilter==='high')list=list.filter(t=>t.priority==='high');
  list.sort((a,b)=>(pO[a.priority]-pO[b.priority])||b.createdAt-a.createdAt);
  const el=document.getElementById('todo-list');
  el.innerHTML=!list.length
    ?`<div class="empty-state" style="padding:32px"><div class="empty-icon">✅</div><p style="color:var(--muted)">${App.todoFilter==='done'?'No completed tasks.':'No tasks yet!'}</p></div>`
    :list.map(t=>`
      <div class="todo-item ${t.done?'done':''}">
        <div class="todo-checkbox" onclick="toggleTodo(${t.id})">${t.done?'✓':''}</div>
        <div class="priority-dot ${t.priority}"></div>
        <span class="todo-text">${escapeHTML(t.text)}</span>
        <span style="font-size:.68rem;color:var(--dim);white-space:nowrap">${timeSince(t.createdAt)}</span>
        <button class="todo-delete" onclick="deleteTodo(${t.id})">✕</button>
      </div>`).join('');
  document.getElementById('todo-pending-count').textContent=App.todos.filter(t=>!t.done).length+' pending';
  document.getElementById('todo-done-count').textContent=App.todos.filter(t=>t.done).length+' done';
}

// ═══════════════════════════════════════════════════════════
// SHARE / QR CODE
// ═══════════════════════════════════════════════════════════
function renderSharePanel() {
  if(!App.quiz){show('no-quiz-share');hide('share-panel');return;}
  hide('no-quiz-share'); show('share-panel');
  document.getElementById('share-quiz-title').textContent=App.quiz.title;
  document.getElementById('share-quiz-count').textContent=App.quiz.questions.length+' questions';

  const payload = {
    title:App.quiz.title, difficulty:App.quiz.difficulty,
    timerSeconds:App.quiz.timerSeconds, lang:App.quiz.lang,
    questions:App.quiz.questions.map(q=>({q:q.question,o:q.options,c:q.correct,d:q.difficulty,l:q.lang}))
  };
  
  // Use LZString for massive compression (makes URLs 70% smaller)
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  const baseLink = location.href.split('#')[0];
  
  const noteEl = document.getElementById('local-file-warning');
  if (baseLink.startsWith('file://') && noteEl) {
    noteEl.style.display = 'block';
  } else if (noteEl) {
    noteEl.style.display = 'none';
  }

  const url = baseLink + '#quiz=' + encoded;
  document.getElementById('share-link-text').textContent = url;

  const qrEl = document.getElementById('qr-container');
  qrEl.innerHTML = '';
  
  if (url.length > 2500) {
    qrEl.innerHTML='<p style="color:var(--yellow);padding:12px;font-size:.8rem;border:1px solid rgba(245, 158, 11, 0.3);background:rgba(245, 158, 11, 0.1);border-radius:8px">⚠️ Quiz is too large to fit in a QR code. Please use the "Copy Link" or "WhatsApp" button below.</p>';
  } else {
    try {
      new QRCode(qrEl,{text:url,width:210,height:210,colorDark:'#1e293b',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.L});
    } catch(e) {
      qrEl.innerHTML='<p style="color:var(--yellow);padding:12px;font-size:.8rem">⚠️ Quiz too large for QR. Use the Shareable Link below.</p>';
    }
  }
}

function copyLink(){navigator.clipboard.writeText(document.getElementById('share-link-text').textContent).then(()=>showToast('Copied! 📋','success'));}
function downloadQR(){const c=document.querySelector('#qr-container canvas');if(!c){showToast('QR not ready','error');return;}const a=document.createElement('a');a.download='quiz-qr.png';a.href=c.toDataURL('image/png');a.click();showToast('QR downloaded!','success');}
function shareWhatsApp(){const l=document.getElementById('share-link-text').textContent;window.open('https://wa.me/?text='+encodeURIComponent(`📝 "${App.quiz?.title}" (${App.quiz?.questions.length} Qs)\n${l}`),'_blank');}
function shareNative(){const l=document.getElementById('share-link-text').textContent;if(navigator.share)navigator.share({title:App.quiz?.title,url:l});else copyLink();}
function importFromLink(){const r=document.getElementById('import-link').value.trim();if(!r){showToast('Paste a link first','error');return;}loadFromEncoded(r.includes('#quiz=')?r.split('#quiz=')[1]:r);}

function checkURLForQuiz(){if(location.hash.startsWith('#quiz='))loadFromEncoded(location.hash.slice(6));}
function loadFromEncoded(enc){
  try {
    let jsonStr = '';
    try { jsonStr = LZString.decompressFromEncodedURIComponent(enc); } catch(e) {}
    if (!jsonStr) jsonStr = fromBase64(enc); // fallback for older links
    
    const data=JSON.parse(jsonStr);
    App.quiz={id:uid(),title:data.title||'Shared Quiz',difficulty:data.difficulty||'mixed',
      timerSeconds:data.timerSeconds??30,lang:data.lang||'en',
      questions:data.questions.map((q,i)=>({id:i+1,question:q.q,options:q.o,correct:q.c,difficulty:q.d||'medium',lang:q.l||data.lang||'en'}))};
    localStorage.setItem('quizforge_quiz',JSON.stringify(App.quiz));
    showToast(`✅ Loaded "${App.quiz.title}" — ${App.quiz.questions.length} questions!`,'success');
    switchTab('quiz');
  } catch(e){showToast('Failed to load quiz from link','error');}
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shuffled(a){return shuffle([...a]);}
function trunc(s,n){return String(s).length>n?s.slice(0,n)+'…':s;}
function capFirst(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function escapeHTML(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function uid(){return Math.random().toString(36).slice(2,10);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function show(id){const el=document.getElementById(id);if(el)el.style.display='block';}
function hide(id){const el=document.getElementById(id);if(el)el.style.display='none';}
function timeSince(ts){const d=Date.now()-ts;return d<60000?'just now':d<3600000?Math.floor(d/60000)+'m ago':d<86400000?Math.floor(d/3600000)+'h ago':Math.floor(d/86400000)+'d ago';}

function toBase64(str){
  try{const b=new TextEncoder().encode(str);let s='';b.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  catch(e){return btoa(unescape(encodeURIComponent(str)));}
}
function fromBase64(b64){
  try{const p=b64.replace(/-/g,'+').replace(/_/g,'/');const b=atob(p);const bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);return new TextDecoder().decode(bytes);}
  catch(e){return decodeURIComponent(escape(atob(b64)));}
}

let _toastTimer;
function showToast(msg,type=''){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast show'+(type?' '+type:'');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}

















