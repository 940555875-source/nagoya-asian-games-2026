/* 翻译板块：拍照 OCR 识别 + 中日文字互译
 * - OCR：Tesseract.js（浏览器本地识别，不需要服务器），首次使用按需要下载约 2MB 日文识别库
 * - 翻译：优先 Google 免费接口，失败自动回退 MyMemory，界面上会标注实际使用的引擎
 */
(() => {
  "use strict";

  const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  const TESS_LANG_PATH = "https://cdn.jsdelivr.net/npm/@tesseract.js-data/jpn@1.0.0/4.0.0_best_int";
  const MAX_CHARS = 500;
  const KANA = /[぀-ヿㇰ-ㇿ]/;

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const STATUS_TEXT = {
    "loading tesseract core": "正在载入识别引擎…",
    "initializing tesseract": "正在初始化…",
    "loading language traineddata": "正在下载日文识别库（约 2MB）…",
    "initializing api": "正在准备识别…",
    "recognizing text": "正在识别文字…"
  };

  const state = { direction: "auto", workerPromise: null, busy: false };
  let progressSink = () => {};

  /* ---------- 基础工具 ---------- */
  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) { /* 继续走兜底 */ }
    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    } catch (ignored) { /* 环境不支持时静默降级 */ }
    return true;
  }

  function setProgress(value, label) {
    const wrap = $("#tl-progress");
    const bar = $("#tl-progress-bar");
    const text = $("#tl-progress-text");
    if (!wrap || !bar || !text) return;
    wrap.hidden = false;
    text.textContent = label || "";
    if (value >= 0) {
      bar.style.width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
      bar.classList.remove("is-indeterminate");
    } else {
      bar.classList.add("is-indeterminate");
    }
  }

  function hideProgress() {
    const wrap = $("#tl-progress");
    if (wrap) wrap.hidden = true;
  }

  function showResult(containerId, text, engine, directionLabel) {
    const container = $(containerId);
    if (!container) return;
    container.hidden = false;
    container.classList.remove("is-error");
    container.innerHTML = `
      <div class="tl-result__head">
        <span class="tl-result__dir">${escapeHtml(directionLabel)}</span>
        <button type="button" class="tl-result__copy" data-copy="${escapeHtml(text)}">复制</button>
      </div>
      <p class="tl-result__text">${escapeHtml(text)}</p>
      <p class="tl-result__engine">由 ${escapeHtml(engine)} 提供</p>`;
  }

  function showError(containerId, message) {
    const container = $(containerId);
    if (!container) return;
    container.hidden = false;
    container.classList.add("is-error");
    container.innerHTML = `<p class="tl-result__text">${escapeHtml(message)}</p>`;
  }

  function resultCopyHandler(containerId) {
    const container = $(containerId);
    if (!container) return;
    container.onclick = async (event) => {
      const button = event.target.closest("[data-copy]");
      if (!button) return;
      await copyText(button.dataset.copy || "");
      button.textContent = "已复制";
      window.setTimeout(() => { button.textContent = "复制"; }, 1600);
    };
  }

  /* ---------- 翻译 ---------- */
  function langCodes(direction) {
    return direction === "ja-zh" ? { from: "ja", to: "zh-CN" } : { from: "zh-CN", to: "ja" };
  }

  function detectDirection(text) {
    if (state.direction !== "auto") return state.direction;
    return KANA.test(text) ? "ja-zh" : "zh-ja";
  }

  async function viaGoogle(text, from, to) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const raw = await response.text();
    if (!raw || raw[0] === "<") throw new Error("google-unavailable");
    const data = JSON.parse(raw);
    const output = (Array.isArray(data?.[0]) ? data[0] : []).map((part) => part?.[0] || "").join("");
    if (!output.trim()) throw new Error("google-empty");
    return { text: output, engine: "Google 翻译" };
  }

  async function viaMyMemory(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${from}|${to}`)}&mt=1`;
    const response = await fetch(url);
    const data = await response.json();
    const output = String(data?.responseData?.translatedText || "");
    if (!output.trim()) throw new Error(data?.responseDetails || "mymemory-empty");
    if (/QUERY LENGTH LIMIT|USAGE LIMIT|MYMEMORY WARNING|TOO MANY REQUESTS/i.test(output)) throw new Error(output);
    return { text: output, engine: "MyMemory 翻译" };
  }

  async function translate(text, direction) {
    const { from, to } = langCodes(direction);
    try {
      return await viaGoogle(text, from, to);
    } catch (error) {
      return await viaMyMemory(text, from, to);
    }
  }

  async function runTranslate(inputId, resultId, forcedDirection) {
    if (state.busy) return;
    const source = $(inputId);
    const text = String(source?.value || "").trim();
    if (!text) {
      showError(resultId, "先输入内容，或拍照识别后再翻译。");
      return;
    }
    if (text.length > MAX_CHARS) {
      showError(resultId, `内容太长了（${text.length} 字），请分次翻译，每次不超过 ${MAX_CHARS} 字。`);
      return;
    }
    state.busy = true;
    showError(resultId, "翻译中…");
    try {
      const direction = forcedDirection || detectDirection(text);
      const { text: output, engine } = await translate(text, direction);
      const label = direction === "ja-zh" ? "日 → 中" : "中 → 日";
      showResult(resultId, output, engine, label);
    } catch (error) {
      showError(resultId, "翻译失败，请检查网络后重试。也可以直接用手机自带的相机翻译功能。");
    } finally {
      state.busy = false;
    }
  }

  /* ---------- OCR ---------- */
  function loadScript(src) {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("识别库加载失败，请检查网络"));
      document.head.appendChild(script);
    });
  }

  function getWorker() {
    if (!state.workerPromise) {
      state.workerPromise = (async () => {
        await loadScript(TESSERACT_SRC);
        return window.Tesseract.createWorker("jpn", 1, {
          langPath: TESS_LANG_PATH,
          logger: (message) => {
            const label = STATUS_TEXT[message.status] || message.status || "";
            if (message.status === "recognizing text") progressSink(message.progress ?? 0, label);
            else progressSink(-1, label);
          }
        });
      })().catch((error) => {
        state.workerPromise = null;
        throw error;
      });
    }
    return state.workerPromise;
  }

  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        if (scale >= 1) { resolve({ url, target: image }); return; }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ url, target: canvas });
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
      image.src = url;
    });
  }

  async function runOcr(file) {
    const ocrBox = $("#tl-ocr");
    const preview = $("#tl-preview");
    const previewImg = $("#tl-preview-img");
    try {
      setProgress(-1, "正在载入识别引擎…");
      const { url, target } = await prepareImage(file);
      if (preview && previewImg) {
        previewImg.src = url;
        preview.hidden = false;
      }
      const worker = await getWorker();
      const { data } = await worker.recognize(target);
      const text = String(data?.text || "").trim();
      const resultBox = $("#tl-ocr-result");
      if (!text) {
        showError("#tl-ocr-result", "这张图没能识别出文字。试试把镜头拉近、拍清楚一点，或换个光线好的角度。");
      } else if (resultBox) {
        resultBox.hidden = false;
        resultBox.classList.remove("is-error");
        resultBox.innerHTML = `<p class="tl-result__text">识别完成，共 ${text.length} 字。点上方「翻译成中文」查看译文。</p>`;
      }
      if (ocrBox) {
        ocrBox.value = text;
        ocrBox.hidden = !text;
      }
      const hint = $("#tl-ocr-hint");
      if (hint) hint.textContent = text ? "识别完成" : "识别库已就绪，可换一张再试";
    } catch (error) {
      showError("#tl-ocr-result", `识别失败：${error?.message || "未知错误"}。请检查网络（首次使用需要联网下载识别库）。`);
    } finally {
      hideProgress();
    }
  }

  /* ---------- 事件绑定 ---------- */
  function setup() {
    const imageInput = $("#tl-image");
    if (imageInput) {
      imageInput.onchange = () => {
        const file = imageInput.files?.[0];
        if (file) runOcr(file);
      };
    }

    $("#tl-ocr-translate")?.addEventListener("click", () => runTranslate("#tl-ocr", "#tl-ocr-result", "ja-zh"));
    $("#tl-go")?.addEventListener("click", () => runTranslate("#tl-input", "#tl-result", null));

    $("#tl-ocr-clear")?.addEventListener("click", () => {
      const ocrBox = $("#tl-ocr");
      if (ocrBox) { ocrBox.value = ""; ocrBox.hidden = false; }
      const preview = $("#tl-preview");
      if (preview) preview.hidden = true;
      const result = $("#tl-ocr-result");
      if (result) { result.hidden = true; result.innerHTML = ""; }
      if (imageInput) imageInput.value = "";
    });

    $("#tl-clear")?.addEventListener("click", () => {
      const input = $("#tl-input");
      if (input) input.value = "";
      const result = $("#tl-result");
      if (result) { result.hidden = true; result.innerHTML = ""; }
    });

    const swap = $("#tl-swap");
    if (swap) {
      swap.onclick = (event) => {
        const button = event.target.closest("[data-dir]");
        if (!button) return;
        state.direction = button.dataset.dir;
        swap.querySelectorAll("[data-dir]").forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
      };
    }

    resultCopyHandler("#tl-result");
    resultCopyHandler("#tl-ocr-result");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
