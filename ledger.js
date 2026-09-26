(() => {
  "use strict";

  const STORAGE_VERSION = 1;
  const DEFAULT_SETTINGS = Object.freeze({
    baseCurrency: "CNY",
    commonCurrencies: ["JPY", "HKD", "EUR", "CHF"],
    lastCurrency: "JPY" // 日本当地消费默认记日元，再按汇率自动折合人民币入账
  });
  const CATEGORIES = Object.freeze(["餐饮", "交通", "住宿", "门票", "购物", "其他"]);
  const AVATAR_COLORS = Object.freeze([
    "#D96C42", "#217D91", "#5C8E62", "#8B6AA8", "#C58B32",
    "#4F72A2", "#B85F76", "#4E8F86", "#9A6B4F", "#68798E"
  ]);

  // The picker searches every field, so the complete catalog can stay out of view
  // until a traveler asks for a particular currency.
  const SEEDED_CURRENCY_CATALOG = Object.freeze([
    ["CNY", "人民币", "Chinese Yuan", "¥", "中国 大陆 人民币 rmb yuan renminbi"],
    ["HKD", "港币", "Hong Kong Dollar", "HK$", "香港 港元 hongkong"],
    ["MOP", "澳门元", "Macanese Pataca", "MOP$", "澳门 澳币 macau pataca"],
    ["TWD", "新台币", "New Taiwan Dollar", "NT$", "台湾 台币 taiwan"],
    ["EUR", "欧元", "Euro", "€", "欧盟 欧洲 eurozone europe"],
    ["CHF", "瑞士法郎", "Swiss Franc", "CHF", "瑞士 列支敦士登 switzerland liechtenstein"],
    ["USD", "美元", "US Dollar", "$", "美国 美金 united states america usa"],
    ["GBP", "英镑", "British Pound", "£", "英国 联合王国 britain uk sterling"],
    ["JPY", "日元", "Japanese Yen", "¥", "日本 japan yen"],
    ["KRW", "韩元", "South Korean Won", "₩", "韩国 korea won"],
    ["SGD", "新加坡元", "Singapore Dollar", "S$", "新加坡 singapore 新币"],
    ["MYR", "马来西亚林吉特", "Malaysian Ringgit", "RM", "马来西亚 malaysia 马币"],
    ["THB", "泰铢", "Thai Baht", "฿", "泰国 thailand baht"],
    ["IDR", "印度尼西亚盾", "Indonesian Rupiah", "Rp", "印度尼西亚 印尼 indonesia rupiah"],
    ["PHP", "菲律宾比索", "Philippine Peso", "₱", "菲律宾 philippines peso"],
    ["VND", "越南盾", "Vietnamese Dong", "₫", "越南 vietnam dong"],
    ["KHR", "柬埔寨瑞尔", "Cambodian Riel", "៛", "柬埔寨 cambodia riel"],
    ["LAK", "老挝基普", "Lao Kip", "₭", "老挝 laos kip"],
    ["MMK", "缅甸元", "Myanmar Kyat", "K", "缅甸 myanmar burma kyat"],
    ["BND", "文莱元", "Brunei Dollar", "B$", "文莱 brunei"],
    ["INR", "印度卢比", "Indian Rupee", "₹", "印度 india rupee"],
    ["PKR", "巴基斯坦卢比", "Pakistani Rupee", "₨", "巴基斯坦 pakistan rupee"],
    ["BDT", "孟加拉塔卡", "Bangladeshi Taka", "৳", "孟加拉国 bangladesh taka"],
    ["LKR", "斯里兰卡卢比", "Sri Lankan Rupee", "Rs", "斯里兰卡 sri lanka rupee"],
    ["NPR", "尼泊尔卢比", "Nepalese Rupee", "रू", "尼泊尔 nepal rupee"],
    ["MVR", "马尔代夫拉菲亚", "Maldivian Rufiyaa", "Rf", "马尔代夫 maldives rufiyaa"],
    ["AED", "阿联酋迪拉姆", "UAE Dirham", "د.إ", "阿联酋 迪拜 dubai united arab emirates"],
    ["SAR", "沙特里亚尔", "Saudi Riyal", "﷼", "沙特阿拉伯 saudi arabia riyal"],
    ["QAR", "卡塔尔里亚尔", "Qatari Riyal", "﷼", "卡塔尔 qatar riyal"],
    ["KWD", "科威特第纳尔", "Kuwaiti Dinar", "د.ك", "科威特 kuwait dinar"],
    ["BHD", "巴林第纳尔", "Bahraini Dinar", ".د.ب", "巴林 bahrain dinar"],
    ["OMR", "阿曼里亚尔", "Omani Rial", "﷼", "阿曼 oman rial"],
    ["JOD", "约旦第纳尔", "Jordanian Dinar", "د.ا", "约旦 jordan dinar"],
    ["ILS", "以色列新谢克尔", "Israeli New Shekel", "₪", "以色列 israel shekel"],
    ["TRY", "土耳其里拉", "Turkish Lira", "₺", "土耳其 türkiye turkey lira"],
    ["GEL", "格鲁吉亚拉里", "Georgian Lari", "₾", "格鲁吉亚 georgia lari"],
    ["AMD", "亚美尼亚德拉姆", "Armenian Dram", "֏", "亚美尼亚 armenia dram"],
    ["AZN", "阿塞拜疆马纳特", "Azerbaijani Manat", "₼", "阿塞拜疆 azerbaijan manat"],
    ["KZT", "哈萨克斯坦坚戈", "Kazakhstani Tenge", "₸", "哈萨克斯坦 kazakhstan tenge"],
    ["UZS", "乌兹别克斯坦苏姆", "Uzbekistani Som", "soʻm", "乌兹别克斯坦 uzbekistan som"],
    ["RUB", "俄罗斯卢布", "Russian Ruble", "₽", "俄罗斯 russian russia ruble"],
    ["UAH", "乌克兰格里夫纳", "Ukrainian Hryvnia", "₴", "乌克兰 ukraine hryvnia"],
    ["PLN", "波兰兹罗提", "Polish Zloty", "zł", "波兰 poland zloty"],
    ["CZK", "捷克克朗", "Czech Koruna", "Kč", "捷克 czechia czech koruna"],
    ["HUF", "匈牙利福林", "Hungarian Forint", "Ft", "匈牙利 hungary forint"],
    ["RON", "罗马尼亚列伊", "Romanian Leu", "lei", "罗马尼亚 romania leu"],
    ["BGN", "保加利亚列弗", "Bulgarian Lev", "лв", "保加利亚 bulgaria lev"],
    ["RSD", "塞尔维亚第纳尔", "Serbian Dinar", "дин", "塞尔维亚 serbia dinar"],
    ["SEK", "瑞典克朗", "Swedish Krona", "kr", "瑞典 sweden krona"],
    ["NOK", "挪威克朗", "Norwegian Krone", "kr", "挪威 norway krone"],
    ["DKK", "丹麦克朗", "Danish Krone", "kr", "丹麦 denmark krone"],
    ["ISK", "冰岛克朗", "Icelandic Krona", "kr", "冰岛 iceland krona"],
    ["CAD", "加拿大元", "Canadian Dollar", "C$", "加拿大 canada 加元"],
    ["AUD", "澳大利亚元", "Australian Dollar", "A$", "澳大利亚 澳洲 australia 澳元"],
    ["NZD", "新西兰元", "New Zealand Dollar", "NZ$", "新西兰 new zealand 纽币"],
    ["MXN", "墨西哥比索", "Mexican Peso", "Mex$", "墨西哥 mexico peso"],
    ["BRL", "巴西雷亚尔", "Brazilian Real", "R$", "巴西 brazil real"],
    ["ARS", "阿根廷比索", "Argentine Peso", "AR$", "阿根廷 argentina peso"],
    ["CLP", "智利比索", "Chilean Peso", "CLP$", "智利 chile peso"],
    ["COP", "哥伦比亚比索", "Colombian Peso", "COL$", "哥伦比亚 colombia peso"],
    ["PEN", "秘鲁索尔", "Peruvian Sol", "S/", "秘鲁 peru sol"],
    ["UYU", "乌拉圭比索", "Uruguayan Peso", "$U", "乌拉圭 uruguay peso"],
    ["BOB", "玻利维亚诺", "Bolivian Boliviano", "Bs", "玻利维亚 bolivia boliviano"],
    ["ZAR", "南非兰特", "South African Rand", "R", "南非 south africa rand"],
    ["EGP", "埃及镑", "Egyptian Pound", "E£", "埃及 egypt pound"],
    ["MAD", "摩洛哥迪拉姆", "Moroccan Dirham", "د.م.", "摩洛哥 morocco dirham"],
    ["KES", "肯尼亚先令", "Kenyan Shilling", "KSh", "肯尼亚 kenya shilling"],
    ["TZS", "坦桑尼亚先令", "Tanzanian Shilling", "TSh", "坦桑尼亚 tanzania shilling"],
    ["NGN", "尼日利亚奈拉", "Nigerian Naira", "₦", "尼日利亚 nigeria naira"],
    ["GHS", "加纳塞地", "Ghanaian Cedi", "₵", "加纳 ghana cedi"],
    ["ETB", "埃塞俄比亚比尔", "Ethiopian Birr", "Br", "埃塞俄比亚 ethiopia birr"],
    ["MUR", "毛里求斯卢比", "Mauritian Rupee", "₨", "毛里求斯 mauritius rupee"],
    ["FJD", "斐济元", "Fijian Dollar", "FJ$", "斐济 fiji"],
    ["XPF", "太平洋法郎", "CFP Franc", "₣", "法属波利尼西亚 新喀里多尼亚 tahiti cfp"],
    ["XCD", "东加勒比元", "East Caribbean Dollar", "EC$", "东加勒比 caribbean"],
    ["JMD", "牙买加元", "Jamaican Dollar", "J$", "牙买加 jamaica"],
    ["DOP", "多米尼加比索", "Dominican Peso", "RD$", "多米尼加 dominican peso"],
    ["CRC", "哥斯达黎加科朗", "Costa Rican Colon", "₡", "哥斯达黎加 costa rica colon"],
    ["PAB", "巴拿马巴波亚", "Panamanian Balboa", "B/.", "巴拿马 panama balboa"],
    ["MNT", "蒙古图格里克", "Mongolian Tugrik", "₮", "蒙古 mongolia tugrik"]
  ].map(([code, nameZh, nameEn, symbol, aliases]) => ({ code, nameZh, nameEn, symbol, aliases })));

  function buildCurrencyCatalog(seed) {
    const byCode = new Map(seed.map((currency) => [currency.code, currency]));
    if (typeof Intl.supportedValuesOf !== "function" || typeof Intl.DisplayNames !== "function") {
      return Object.freeze([...byCode.values()]);
    }
    try {
      const namesZh = new Intl.DisplayNames(["zh-CN"], { type: "currency" });
      const namesEn = new Intl.DisplayNames(["en"], { type: "currency" });
      Intl.supportedValuesOf("currency").forEach((code) => {
        if (byCode.has(code)) return;
        const symbolPart = new Intl.NumberFormat("en", {
          style: "currency",
          currency: code,
          currencyDisplay: "narrowSymbol"
        }).formatToParts(0).find((part) => part.type === "currency");
        byCode.set(code, {
          code,
          nameZh: namesZh.of(code) || code,
          nameEn: namesEn.of(code) || code,
          symbol: symbolPart?.value || code,
          aliases: ""
        });
      });
    } catch {
      return Object.freeze([...byCode.values()]);
    }
    return Object.freeze([...byCode.values()].sort((first, second) => first.code.localeCompare(second.code)));
  }

  const CURRENCY_CATALOG = buildCurrencyCatalog(SEEDED_CURRENCY_CATALOG);

  const CURRENCY_BY_CODE = new Map(CURRENCY_CATALOG.map((currency) => [currency.code, currency]));
  const currencySearchText = new Map(CURRENCY_CATALOG.map((currency) => [
    currency.code,
    normalizeSearch([currency.code, currency.nameZh, currency.nameEn, currency.symbol, currency.aliases].join(" "))
  ]));

  let ledgerRoot = null;
  let ledgerTripId = "";
  let ledgerAdapter = null;
  let ledgerPersistenceMode = "local";
  let ledgerData = null;
  let initialized = false;
  let activeTab = "entry";
  let editingBillId = null;
  let openDialogName = null;
  let currencyPickerMode = "common";
  let currencyQuery = "";
  let notice = "";
  let billDraft = null;
  let editingMemberId = null;
  let editingNoteBillId = null;
  let pendingNoteSave = null;
  let noteOpenRequest = 0;
  const expandedTransfers = new Set();               // 结算页里就地展开「怎么算的」的转账序号
  let mutationQueue = Promise.resolve();

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[\s._/-]+/g, "");
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function escapeAttribute(value = "") {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function avatarInitial(name) {
    const characters = Array.from(String(name || "").trim());
    if (!characters.length) return "?";
    const firstHanIndex = characters.findIndex((character) => /\p{Script=Han}/u.test(character));
    if (firstHanIndex >= 0) {
      const firstHan = characters[firstHanIndex];
      if (["小", "阿", "老"].includes(firstHan)) {
        const nextHan = characters.slice(firstHanIndex + 1).find((character) => /\p{Script=Han}/u.test(character));
        if (nextHan) return nextHan;
      }
      return firstHan;
    }
    const latin = characters.find((character) => /[A-Za-z]/.test(character));
    return latin ? latin.toUpperCase() : characters[0].toUpperCase();
  }

  function nextAvatarColor(travelers) {
    const used = new Set(travelers.map((traveler) => traveler.color.toUpperCase()));
    return AVATAR_COLORS.find((color) => !used.has(color.toUpperCase()))
      || AVATAR_COLORS[travelers.length % AVATAR_COLORS.length];
  }

  function isValidColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function toCents(value) {
    const normalized = String(value ?? "").trim().replace(/,/g, "");
    if (!/^(?:\d+|\d*\.\d{1,2})$/.test(normalized)) return null;
    const [whole = "0", fraction = ""] = normalized.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return Number.isSafeInteger(cents) ? cents : null;
  }

  function centsToInput(cents) {
    if (!Number.isSafeInteger(cents)) return "";
    return (cents / 100).toFixed(2);
  }

  function formatMoney(cents, currencyCode) {
    const amount = Number(cents || 0) / 100;
    try {
      return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  }

  function defaultData() {
    return {
      version: STORAGE_VERSION,
      settings: deepClone(DEFAULT_SETTINGS),
      travelers: [],
      bills: [],
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeData(raw) {
    const fallback = defaultData();
    if (!raw || typeof raw !== "object") return fallback;
    const rawTravelers = Array.isArray(raw.travelers) ? raw.travelers : [];
    const usedIds = new Set();
    const travelers = rawTravelers.flatMap((traveler, index) => {
      const name = String(traveler?.name || "").trim().slice(0, 30);
      let id = String(traveler?.id || "").trim();
      if (!name) return [];
      if (!id || usedIds.has(id)) id = makeId("person");
      usedIds.add(id);
      const color = isValidColor(traveler?.color)
        ? traveler.color.toUpperCase()
        : AVATAR_COLORS[index % AVATAR_COLORS.length];
      return [{ id, name, initial: avatarInitial(name), color }];
    });
    const travelerIds = new Set(travelers.map((traveler) => traveler.id));
    const requestedBase = String(raw.settings?.baseCurrency || DEFAULT_SETTINGS.baseCurrency).toUpperCase();
    const baseCurrency = CURRENCY_BY_CODE.has(requestedBase) ? requestedBase : DEFAULT_SETTINGS.baseCurrency;
    // JPY 是本次行程的当地货币，始终保留在常用列表里（兼容早期已存的设置）
    const storedCommon = Array.isArray(raw.settings?.commonCurrencies)
      ? raw.settings.commonCurrencies
      : DEFAULT_SETTINGS.commonCurrencies;
    const commonCurrencies = [...new Set(
      ["JPY", ...storedCommon]
        .map((code) => String(code).toUpperCase())
        .filter((code) => CURRENCY_BY_CODE.has(code) && code !== baseCurrency)
    )];
    const availableCurrencies = new Set([baseCurrency, ...commonCurrencies]);
    // 没存过设置时沿用默认币种（日本行程默认记日元），否则退回本位币
    const requestedLast = String(raw.settings?.lastCurrency || fallback.settings.lastCurrency || baseCurrency).toUpperCase();
    const lastCurrency = availableCurrencies.has(requestedLast) ? requestedLast : baseCurrency;
    const bills = (Array.isArray(raw.bills) ? raw.bills : []).flatMap((bill) => {
      const originalAmountCents = Number(bill?.originalAmountCents);
      const baseAmountCents = Number(bill?.baseAmountCents);
      const currency = String(bill?.currency || baseCurrency).toUpperCase();
      const payerId = String(bill?.payerId || "");
      const participantIds = [...new Set(Array.isArray(bill?.participantIds) ? bill.participantIds.map(String) : [])]
        .filter((id) => travelerIds.has(id));
      if (!Number.isSafeInteger(originalAmountCents) || originalAmountCents <= 0) return [];
      if (!Number.isSafeInteger(baseAmountCents) || baseAmountCents <= 0) return [];
      if (!CURRENCY_BY_CODE.has(currency) || !travelerIds.has(payerId) || !participantIds.length) return [];
      const category = CATEGORIES.includes(bill?.category) ? bill.category : "其他";
      return [{
        id: String(bill.id || makeId("bill")),
        originalAmountCents,
        baseAmountCents,
        currency,
        fxRate: Number.isFinite(Number(bill?.fxRate)) ? Number(bill.fxRate) : null,
        fxDate: typeof bill?.fxDate === "string" ? bill.fxDate : "",
        category,
        note: typeof bill.note === "string" ? bill.note.trim().slice(0, 160) : "",
        orderedAt: typeof bill.orderedAt === "string" ? bill.orderedAt : "",
        payerId,
        participantIds,
        createdAt: typeof bill.createdAt === "string" ? bill.createdAt : new Date().toISOString(),
        updatedAt: typeof bill.updatedAt === "string" ? bill.updatedAt : new Date().toISOString()
      }];
    });
    return {
      version: STORAGE_VERSION,
      settings: { baseCurrency, commonCurrencies, lastCurrency },
      travelers,
      bills,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : fallback.updatedAt
    };
  }

  function createLocalStorageAdapter(tripId, options = {}) {
    const runtimeStorage = globalThis.TravelRuntimeStorage;
    if (runtimeStorage?.createAdapter) {
      return runtimeStorage.createAdapter({
        ...options,
        mode: "local",
        tripId,
        collections: ["settings", "travelers", "bills"]
      });
    }

    const storageKey = options.storageKey
      || `travel-plan:runtime:v1:${encodeURIComponent(String(tripId || "default-trip"))}`;
    let memorySnapshot = null;
    let storage = options.storage;
    if (!storage) {
      try {
        storage = globalThis.localStorage || null;
      } catch {
        storage = null;
      }
    }

    function readSnapshot() {
      if (!storage) return memorySnapshot ? deepClone(memorySnapshot) : null;
      try {
        const serialized = storage.getItem(storageKey);
        if (!serialized) return memorySnapshot ? deepClone(memorySnapshot) : null;
        const parsed = JSON.parse(serialized);
        memorySnapshot = parsed && typeof parsed === "object" ? parsed : null;
        return memorySnapshot ? deepClone(memorySnapshot) : null;
      } catch (error) {
        console.warn("TravelLedger could not read localStorage; using memory for this tab.", error);
        storage = null;
        return memorySnapshot ? deepClone(memorySnapshot) : null;
      }
    }

    function writeSnapshot(next) {
      const previous = readSnapshot() || {};
      const snapshot = {
        ...previous,
        version: STORAGE_VERSION,
        settings: deepClone(next.settings),
        travelers: deepClone(next.travelers),
        bills: deepClone(next.bills),
        updatedAt: next.updatedAt
      };
      memorySnapshot = snapshot;
      if (storage) {
        try {
          storage.setItem(storageKey, JSON.stringify(snapshot));
        } catch (error) {
          console.warn("TravelLedger could not write localStorage; using memory for this tab.", error);
          storage = null;
        }
      }
      Object.assign(next, deepClone(snapshot));
      return deepClone(snapshot);
    }

    return {
      mode: "local",
      tripId,
      storageKey,
      async load() {
        return readSnapshot();
      },
      async save(next) {
        return writeSnapshot(next);
      }
    };
  }

  function createD1Adapter(tripId, options = {}) {
    const runtimeStorage = globalThis.TravelRuntimeStorage;
    if (runtimeStorage?.createAdapter) {
      return runtimeStorage.createAdapter({
        ...options,
        mode: "d1",
        tripId,
        collections: ["settings", "travelers", "bills"]
      });
    }
    let previous = null;
    const collections = ["bills", "travelers"];
    const rawApiBase = String(options.apiBase || "/api/trip").trim();
    if (!/^\/(?!\/)/.test(rawApiBase) || rawApiBase.includes("\\") || /[?#]/.test(rawApiBase)) {
      throw new Error("D1 apiBase must be a same-origin absolute path");
    }
    const apiBase = rawApiBase.replace(/\/+$/, "") || "/";
    const endpoint = `${apiBase}/${encodeURIComponent(tripId)}?collections=bills%2Ctravelers`;
    return {
      mode: "d1",
      async load() {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        previous = await response.json();
        return previous;
      },
      async save(next) {
        const changes = [];
        for (const collection of collections) {
          const before = new Map((previous?.[collection] || []).map((item) => [item.id, item]));
          const after = new Map((next[collection] || []).map((item) => [item.id, item]));
          before.forEach((_, id) => { if (!after.has(id)) changes.push({ op: "delete", collection, id }); });
          after.forEach((value, id) => {
            if (JSON.stringify(before.get(id)) !== JSON.stringify(value)) changes.push({ op: "upsert", collection, id, value });
          });
        }
        const response = await fetch(endpoint, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ changes })
        });
        if (!response.ok) throw new Error(`API ${response.status}`);
        previous = await response.json();
        // The server is authoritative and merges record-level changes atomically.
        Object.assign(next, previous);
      }
    };
  }

  async function resolveTripConfig(root, options) {
    if (options.config && typeof options.config === "object") return options.config;
    if (globalThis.TRAVEL_PLAN_CONFIG && typeof globalThis.TRAVEL_PLAN_CONFIG === "object") {
      return globalThis.TRAVEL_PLAN_CONFIG;
    }
    if (options.configUrl === false) return {};
    const configUrl = options.configUrl || root.dataset.tripConfigUrl || "trip-data.json";
    try {
      const response = await fetch(configUrl, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        return payload?.config && typeof payload.config === "object" ? payload.config : payload;
      }
    } catch {
      // A missing optional config must never prevent the local-first ledger from opening.
    }
    return {};
  }

  function resolvePersistence(root, options, config) {
    const optionPersistence = options.persistence && typeof options.persistence === "object"
      ? options.persistence
      : {};
    const configPersistence = config?.persistence && typeof config.persistence === "object"
      ? config.persistence
      : {};
    const requestedMode = options.persistenceMode
      || optionPersistence.mode
      || root.dataset.ledgerPersistence
      || configPersistence.mode;
    const sharedCollections = Array.isArray(optionPersistence.sharedCollections)
      ? optionPersistence.sharedCollections
      : Array.isArray(configPersistence.sharedCollections)
        ? configPersistence.sharedCollections
        : [];
    const d1Requested = String(requestedMode || "").trim().toLowerCase() === "d1";
    const mode = d1Requested && sharedCollections.includes("ledger") ? "d1" : "local";
    const d1Options = {
      ...(configPersistence.d1 && typeof configPersistence.d1 === "object" ? configPersistence.d1 : {}),
      ...(optionPersistence.d1 && typeof optionPersistence.d1 === "object" ? optionPersistence.d1 : {}),
      ...(options.d1 && typeof options.d1 === "object" ? options.d1 : {})
    };
    if (configPersistence.apiBase) d1Options.apiBase = configPersistence.apiBase;
    if (optionPersistence.apiBase) d1Options.apiBase = optionPersistence.apiBase;
    const localOptions = {
      ...(configPersistence.local && typeof configPersistence.local === "object" ? configPersistence.local : {}),
      ...(optionPersistence.local && typeof optionPersistence.local === "object" ? optionPersistence.local : {})
    };
    if (options.storage) localOptions.storage = options.storage;
    if (options.storageKey) localOptions.storageKey = options.storageKey;
    return { mode, d1Options, localOptions };
  }

  async function resolveTripId(root, options) {
    const explicit = options.tripId || root.dataset.tripId || document.documentElement.dataset.tripId || document.body?.dataset.tripId;
    if (explicit) return String(explicit);
    if (globalThis.TRAVEL_PLAN_DATA?.metadata?.tripId) return String(globalThis.TRAVEL_PLAN_DATA.metadata.tripId);
    try {
      const dataUrl = options.travelDataUrl || root.dataset.travelDataUrl || "trip-data.json";
      const response = await fetch(dataUrl, { cache: "no-store" });
      if (response.ok) {
        const travelData = await response.json();
        if (travelData?.metadata?.tripId) return String(travelData.metadata.tripId);
      }
    } catch {
      // A stable path-based key still keeps unrelated trips separated offline.
    }
    const pathKey = location.pathname.replace(/[^a-z0-9\u3400-\u9fff]+/gi, "-").replace(/^-|-$/g, "");
    return pathKey || "default-trip";
  }

  function travelerById(id) {
    return ledgerData.travelers.find((traveler) => traveler.id === id);
  }

  function currencyByCode(code) {
    return CURRENCY_BY_CODE.get(code) || { code, nameZh: code, nameEn: code, symbol: code };
  }

  function availableCurrencyCodes(extraCode = "") {
    return [...new Set([
      ledgerData.settings.baseCurrency,
      ...ledgerData.settings.commonCurrencies,
      extraCode
    ].filter((code) => CURRENCY_BY_CODE.has(code)))];
  }

  /* ---------- 汇率：填外币时自动折合本位币 ---------- */
  const FX_CACHE_KEY = "nagoya-2026:fx";              // 首页「汇率」卡片的缓存，优先复用
  const FX_FALLBACK_KEY = "nagoya-2026:ledger-fx";    // 记帐自己拉到汇率时的兜底缓存
  let fxState = { base: "", rates: {}, date: "", at: 0 };
  let fxPending = new Map();
  let baseAmountTouched = false;                      // 用户手改过折合金额就不再覆盖

  function readFxEntry(key) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.payload?.rates) return null;
      const at = Date.parse(parsed.at || "");
      return { ...parsed.payload, at: Number.isFinite(at) ? at : 0 };
    } catch {
      return null;
    }
  }

  function loadFxState() {
    if (Object.keys(fxState.rates || {}).length) return fxState;
    const entry = readFxEntry(FX_CACHE_KEY) || readFxEntry(FX_FALLBACK_KEY);
    if (entry) {
      fxState = {
        base: String(entry.base || "").toUpperCase(),
        rates: entry.rates || {},
        date: String(entry.date || ""),
        at: Number(entry.at) || 0
      };
    }
    return fxState;
  }

  /* 支持正向 / 反向 / 交叉汇率，缓存里只有一张基准表也够用 */
  function rateOf(from, to) {
    if (!from || !to) return null;
    if (from === to) return 1;
    const state = loadFxState();
    const rates = state.rates || {};
    const direct = Number(rates[to]);
    const inverse = Number(rates[from]);
    if (state.base === from && Number.isFinite(direct) && direct > 0) return direct;
    if (state.base === to && Number.isFinite(inverse) && inverse > 0) return 1 / inverse;
    if (Number.isFinite(direct) && Number.isFinite(inverse) && inverse > 0) return direct / inverse;
    return null;
  }

  function formatRate(rate) {
    const value = Number(rate);
    if (!Number.isFinite(value)) return "";
    if (value >= 1) return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    if (value >= 0.01) return value.toFixed(4);
    return value.toFixed(6);
  }

  function fxDateLabel() {
    const date = loadFxState().date;
    return date ? `${date} 参考价` : "";
  }

  async function ensureFxRate(from, to) {
    const cached = rateOf(from, to);
    if (Number.isFinite(cached)) return cached;
    const key = `${from}>${to}`;
    if (fxPending.has(key)) return fxPending.get(key);
    const task = (async () => {
      try {
        const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const rate = Number(data?.rates?.[to]);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error("缺少汇率字段");
        fxState = { base: from, rates: { [to]: rate }, date: String(data.date || ""), at: Date.now() };
        try {
          globalThis.localStorage?.setItem(
            FX_FALLBACK_KEY,
            JSON.stringify({ at: new Date().toISOString(), payload: fxState })
          );
        } catch { /* 忽略存储失败 */ }
        return rate;
      } catch (error) {
        console.warn("TravelLedger 汇率获取失败", error);
        return null;
      } finally {
        fxPending.delete(key);
      }
    })();
    fxPending.set(key, task);
    return task;
  }

  function rateHintText(from, to) {
    const rate = rateOf(from, to);
    if (!Number.isFinite(rate)) return "未能获取汇率，请手动填写折合金额";
    const date = fxDateLabel();
    return `已按 1 ${from} ≈ ${formatRate(rate)} ${to} 自动换算${date ? `（${date}）` : ""}，可手动修改`;
  }

  /* 外币金额一填好就把折合本位币算出来，随手写随手入账 */
  function syncConvertedAmount(form) {
    if (!form || !ledgerData) return;
    const currency = String(form.elements.currency?.value || "").toUpperCase();
    const base = ledgerData.settings.baseCurrency;
    const input = form.querySelector('[data-ledger-field="base-amount"]');
    const hint = form.querySelector("[data-ledger-rate-hint]");
    if (!currency || currency === base || !input) return;
    const rate = rateOf(currency, base);
    if (hint) hint.textContent = rateHintText(currency, base);
    if (!Number.isFinite(rate)) return;
    const cents = toCents(form.elements.originalAmount?.value);
    if (!Number.isFinite(cents) || cents <= 0) return;
    if (baseAmountTouched && String(input.value || "").trim()) return;
    input.value = (Math.round(cents * rate) / 100).toFixed(2);
  }

  /* 汇率可能晚于记账渲染到位，到了就补算一次 */
  function primeFxRate(form) {
    if (!form || !ledgerData) return;
    const currency = String(form.elements.currency?.value || "").toUpperCase();
    const base = ledgerData.settings.baseCurrency;
    if (!currency || currency === base) return;
    syncConvertedAmount(form);
    if (Number.isFinite(rateOf(currency, base))) return;
    void ensureFxRate(currency, base).then(() => {
      if (ledgerRoot?.contains(form)) {
        syncConvertedAmount(form);
        syncSplitSummary();
      }
    });
  }

  function billShares(bill) {
    const participantIds = bill.participantIds.filter((id) => travelerById(id));
    if (!participantIds.length) return new Map();
    const share = Math.floor(bill.baseAmountCents / participantIds.length);
    let remainder = bill.baseAmountCents - share * participantIds.length;
    return new Map(participantIds.map((id) => {
      const amount = share + (remainder > 0 ? 1 : 0);
      remainder -= remainder > 0 ? 1 : 0;
      return [id, amount];
    }));
  }

  function calculateStats() {
    const members = ledgerData.travelers.map((traveler) => ({
      traveler,
      paidCents: 0,
      owedCents: 0,
      netCents: 0,
      billIds: []
    }));
    const byId = new Map(members.map((entry) => [entry.traveler.id, entry]));
    ledgerData.bills.forEach((bill) => {
      const payer = byId.get(bill.payerId);
      if (payer) {
        payer.paidCents += bill.baseAmountCents;
        payer.billIds.push(bill.id);
      }
      billShares(bill).forEach((amount, participantId) => {
        const member = byId.get(participantId);
        if (!member) return;
        member.owedCents += amount;
        if (!member.billIds.includes(bill.id)) member.billIds.push(bill.id);
      });
    });
    members.forEach((member) => {
      member.netCents = member.paidCents - member.owedCents;
    });

    const debtors = members
      .filter((member) => member.netCents < 0)
      .map((member) => ({ id: member.traveler.id, amount: -member.netCents }))
      .sort((first, second) => second.amount - first.amount || first.id.localeCompare(second.id));
    const creditors = members
      .filter((member) => member.netCents > 0)
      .map((member) => ({ id: member.traveler.id, amount: member.netCents }))
      .sort((first, second) => second.amount - first.amount || first.id.localeCompare(second.id));
    const transferMemo = new Map();
    const settle = (debtAmounts, creditAmounts) => {
      const firstDebtor = debtAmounts.findIndex((amount) => amount > 0);
      if (firstDebtor < 0) return [];
      const memoKey = `${debtAmounts.join(",")}|${creditAmounts.join(",")}`;
      if (transferMemo.has(memoKey)) return transferMemo.get(memoKey);
      const lowerBound = Math.max(
        debtAmounts.filter((amount) => amount > 0).length,
        creditAmounts.filter((amount) => amount > 0).length
      );
      let best = null;
      const triedCreditAmounts = new Set();
      for (let creditIndex = 0; creditIndex < creditAmounts.length; creditIndex += 1) {
        const creditAmount = creditAmounts[creditIndex];
        if (creditAmount <= 0 || triedCreditAmounts.has(creditAmount)) continue;
        triedCreditAmounts.add(creditAmount);
        const amountCents = Math.min(debtAmounts[firstDebtor], creditAmount);
        const nextDebts = debtAmounts.slice();
        const nextCredits = creditAmounts.slice();
        nextDebts[firstDebtor] -= amountCents;
        nextCredits[creditIndex] -= amountCents;
        const remainder = settle(nextDebts, nextCredits);
        const candidate = [{ debtorIndex: firstDebtor, creditorIndex: creditIndex, amountCents }, ...remainder];
        if (!best || candidate.length < best.length) best = candidate;
        if (best.length === lowerBound) break;
      }
      const result = best || [];
      transferMemo.set(memoKey, result);
      return result;
    };
    const transfers = settle(
      debtors.map((debtor) => debtor.amount),
      creditors.map((creditor) => creditor.amount)
    ).map((transfer) => ({
      fromId: debtors[transfer.debtorIndex].id,
      toId: creditors[transfer.creditorIndex].id,
      amountCents: transfer.amountCents
    }));
    return {
      totalCents: ledgerData.bills.reduce((sum, bill) => sum + bill.baseAmountCents, 0),
      members,
      transfers
    };
  }

  /* —— 结算链路解释：把「谁转给谁」拆回账单级欠条，方便逐笔核对 —— */

  function rawDebtEdges() {
    const edges = new Map();
    ledgerData.bills.forEach((bill) => {
      if (!travelerById(bill.payerId)) return;
      billShares(bill).forEach((amount, participantId) => {
        if (participantId === bill.payerId || !amount) return;
        const key = `${participantId}|${bill.payerId}`;
        const entry = edges.get(key)
          || { fromId: participantId, toId: bill.payerId, amountCents: 0, items: [] };
        entry.amountCents += amount;
        entry.items.push({
          billId: bill.id,
          category: bill.category,
          note: bill.note,
          amountCents: amount
        });
        edges.set(key, entry);
      });
    });
    return [...edges.values()];
  }

  /* 同一对人之间的欠条先互相抵消，得到「抵消后的欠条网络」。 */
  function netDebtEdges() {
    const raw = rawDebtEdges();
    const pairKeys = [...new Set(raw.map((edge) => [edge.fromId, edge.toId].sort().join("|")))];
    return pairKeys.flatMap((pairKey) => {
      const [first, second] = pairKey.split("|");
      const forward = raw.find((edge) => edge.fromId === first && edge.toId === second);
      const backward = raw.find((edge) => edge.fromId === second && edge.toId === first);
      const forwardCents = forward?.amountCents || 0;
      const backwardCents = backward?.amountCents || 0;
      const diff = forwardCents - backwardCents;
      if (diff === 0) return [];
      return [{
        fromId: diff > 0 ? first : second,
        toId: diff > 0 ? second : first,
        amountCents: Math.abs(diff),
        items: (diff > 0 ? forward : backward).items,
        offsetCents: Math.min(forwardCents, backwardCents)
      }];
    }).sort((first, second) => second.amountCents - first.amountCents);
  }

  /* 找一条 A → … → C 的欠条链路（取瓶颈最大的那条），用来说明「合并了哪几笔」。 */
  function findDebtChain(edges, fromId, toId) {
    const adjacency = new Map();
    edges.forEach((edge) => {
      if (!adjacency.has(edge.fromId)) adjacency.set(edge.fromId, []);
      adjacency.get(edge.fromId).push(edge);
    });
    let best = null;
    const visit = (nodeId, bottleneck, path, visited) => {
      if (nodeId === toId) {
        if (!best || bottleneck > best.bottleneck) best = { bottleneck, path: [...path] };
        return;
      }
      (adjacency.get(nodeId) || []).forEach((edge) => {
        if (visited.has(edge.toId)) return;
        const nextBottleneck = Math.min(bottleneck, edge.amountCents);
        if (best && nextBottleneck <= best.bottleneck) return;
        visited.add(edge.toId);
        path.push(edge);
        visit(edge.toId, nextBottleneck, path, visited);
        path.pop();
        visited.delete(edge.toId);
      });
    };
    visit(fromId, Infinity, [], new Set([fromId]));
    return best && best.path.length ? best : null;
  }

  /* 本笔转账时点：A 还剩多少要付、C 还剩多少要收（两者取小就是本笔金额）。 */
  function transferQueueState(stats, index) {
    const transfer = stats.transfers[index];
    if (!transfer) return null;
    const fromRemaining = stats.transfers.slice(index)
      .filter((entry) => entry.fromId === transfer.fromId)
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const toRemaining = stats.transfers.slice(index)
      .filter((entry) => entry.toId === transfer.toId)
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    return {
      transfer,
      fromRemaining,
      toRemaining,
      fromAfter: fromRemaining - transfer.amountCents,
      toAfter: toRemaining - transfer.amountCents
    };
  }

  function describeDebtItems(items) {
    if (!items.length) return "";
    const shown = items.slice(0, 4).map((item) => (
      `${item.category}${item.note ? `·${item.note}` : ""} ${formatMoney(item.amountCents, ledgerData.settings.baseCurrency)}`
    ));
    if (items.length > shown.length) shown.push(`等 ${items.length} 笔`);
    return shown.join("、");
  }

  function renderAvatar(traveler, size = "normal") {
    if (!traveler) return "";
    return `<span class="ledger-avatar ledger-avatar-${escapeAttribute(size)}" style="--ledger-avatar-color:${escapeAttribute(traveler.color)}" aria-hidden="true">${escapeHtml(traveler.initial)}</span>`;
  }

  function renderPersonChoice(traveler, type, name, selected) {
    return `
      <label class="ledger-person-choice">
        <input class="ledger-person-input" type="${type}" name="${escapeAttribute(name)}" value="${escapeAttribute(traveler.id)}" ${selected ? "checked" : ""}>
        <span class="ledger-person-visual">
          ${renderAvatar(traveler)}
          <span class="ledger-person-check" aria-hidden="true">✓</span>
        </span>
        <span class="ledger-person-name">${escapeHtml(traveler.name)}</span>
      </label>`;
  }

  function renderCurrencyOptions(selectedCode) {
    return availableCurrencyCodes(selectedCode).map((code) => {
      const currency = currencyByCode(code);
      return `<button class="ledger-currency-option" type="button" data-ledger-action="choose-bill-currency" data-ledger-code="${escapeAttribute(code)}" ${code === selectedCode ? "aria-current=\"true\"" : ""}><b>${escapeHtml(code)}</b><span>${escapeHtml(currency.nameZh)}</span></button>`;
    }).join("");
  }

  function renderBillForm() {
    const editingBill = ledgerData.bills.find((bill) => bill.id === editingBillId) || null;
    const draft = editingBill ? null : billDraft;
    const currency = editingBill?.currency || draft?.currency || ledgerData.settings.lastCurrency;
    const baseCurrency = ledgerData.settings.baseCurrency;
    const isForeign = currency !== baseCurrency;
    const selectedParticipants = new Set(
      editingBill?.participantIds
      || draft?.participantIds
      || ledgerData.travelers.map((traveler) => traveler.id)
    );
    const selectedPayerId = editingBill?.payerId || draft?.payerId || "";
    const selectedCategory = editingBill?.category || draft?.category || "餐饮";
    return `
      <section class="ledger-entry-card" aria-labelledby="ledger-bill-form-title">
        <div class="ledger-section-heading">
          <div>
            <p class="ledger-section-kicker">${editingBill ? "编辑账单" : "记一笔"}</p>
            <h2 id="ledger-bill-form-title">${editingBill ? "修改这笔账" : "记录本次花费"}</h2>
          </div>
          ${editingBill ? `<button class="ledger-text-button" type="button" data-ledger-action="cancel-edit">取消编辑</button>` : ""}
        </div>
        ${ledgerData.travelers.length ? `
          <form class="ledger-bill-form" data-ledger-form="bill" novalidate>
            <div class="ledger-amount-block">
              <label class="ledger-field ledger-field-currency">
                <span class="ledger-field-label">币种</span>
                <input type="hidden" name="currency" data-ledger-field="currency" value="${escapeAttribute(currency)}">
                <details class="ledger-currency-dropdown">
                  <summary><span data-ledger-currency-display>${escapeHtml(currency)} · ${escapeHtml(currencyByCode(currency).nameZh)}</span><span aria-hidden="true">⌄</span></summary>
                  <div class="ledger-currency-menu">${renderCurrencyOptions(currency)}</div>
                </details>
              </label>
              <label class="ledger-field ledger-field-amount">
                <span class="ledger-field-label">金额</span>
                <input class="ledger-amount-input" name="originalAmount" data-ledger-field="original-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${escapeAttribute(editingBill ? centsToInput(editingBill.originalAmountCents) : draft?.originalAmount || "")}" required>
              </label>
            </div>
            <label class="ledger-field ledger-converted-field" data-ledger-converted-field ${isForeign ? "" : "hidden"}>
              <span class="ledger-field-label">折合${escapeHtml(currencyByCode(baseCurrency).nameZh)}</span>
              <span class="ledger-converted-input-wrap">
                <span class="ledger-converted-code">${escapeHtml(baseCurrency)}</span>
                <input class="ledger-input" name="baseAmount" data-ledger-field="base-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="输入金额后自动换算" value="${escapeAttribute(editingBill && isForeign ? centsToInput(editingBill.baseAmountCents) : draft?.baseAmount || "")}" aria-label="折合${escapeAttribute(currencyByCode(baseCurrency).nameZh)}金额，输入原币金额后自动换算">
              </span>
              <small class="ledger-field-help" data-ledger-rate-hint>${escapeHtml(isForeign ? rateHintText(currency, baseCurrency) : "")}</small>
            </label>

            <fieldset class="ledger-fieldset">
              <legend class="ledger-field-label">分类</legend>
              <div class="ledger-category-grid">
                ${CATEGORIES.map((category) => `
                  <label class="ledger-category-choice">
                    <input class="ledger-category-input" type="radio" name="category" value="${escapeAttribute(category)}" ${category === selectedCategory ? "checked" : ""}>
                    <span>${escapeHtml(category)}</span>
                  </label>`).join("")}
              </div>
            </fieldset>

            <label class="ledger-field ledger-note-field">
              <span class="ledger-field-label">备注 <small>选填</small></span>
              <input class="ledger-input" type="text" name="note" maxlength="160" autocomplete="off" placeholder="例如：米兰大教堂门票" value="${escapeAttribute(editingBill?.note || draft?.note || "")}">
            </label>

            <label class="ledger-field ledger-date-field">
              <span class="ledger-field-label">下单时间 <small>选填</small></span>
              <input class="ledger-input" type="datetime-local" name="orderedAt" value="${escapeAttribute(editingBill?.orderedAt || draft?.orderedAt || "")}">
            </label>

            <fieldset class="ledger-fieldset">
              <legend class="ledger-field-label">买单人 <small>单选</small></legend>
              <div class="ledger-person-grid">
                ${ledgerData.travelers.map((traveler) => renderPersonChoice(traveler, "radio", "payerId", selectedPayerId === traveler.id)).join("")}
              </div>
            </fieldset>

            <fieldset class="ledger-fieldset">
              <div class="ledger-fieldset-heading">
                <legend class="ledger-field-label">参与分账人 <small>多选</small></legend>
                <button class="ledger-text-button" type="button" data-ledger-action="select-all-participants">全选</button>
              </div>
              <div class="ledger-person-grid">
                ${ledgerData.travelers.map((traveler) => renderPersonChoice(traveler, "checkbox", "participantIds", selectedParticipants.has(traveler.id))).join("")}
              </div>
              <p class="ledger-split-summary" data-ledger-split-summary></p>
            </fieldset>

            <p class="ledger-form-error" data-ledger-form-error role="alert"></p>
            <button class="ledger-primary-button" type="submit">${editingBill ? "保存修改" : "保存账单"}</button>
          </form>` : `
          <div class="ledger-onboarding">
            <p>先添加本次同行人，再开始记账。</p>
            <button class="ledger-primary-button" type="button" data-ledger-action="open-members">添加同行人</button>
          </div>`}
      </section>`;
  }

  function formatBillDate(value) {
    if (!value) return "未填写时间";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.replace("T", " ");
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(parsed);
  }

  function renderBillNoteControl(bill, options = {}) {
    const editing = options.editing ?? editingNoteBillId === bill.id;
    const value = options.value ?? bill.note ?? "";
    return editing ? `
      <form class="ledger-bill-note-form" data-ledger-form="bill-note" data-ledger-id="${escapeAttribute(bill.id)}">
        <span>备注：</span>
        <input name="note" maxlength="160" autocomplete="off" value="${escapeAttribute(value)}" placeholder="暂无">
        <button type="submit" aria-label="保存备注">✓</button>
        <button type="button" data-ledger-action="cancel-note-edit" aria-label="取消修改备注">×</button>
      </form>` : `
      <button class="ledger-bill-note-trigger" type="button" data-ledger-action="edit-bill-note" data-ledger-id="${escapeAttribute(bill.id)}" aria-label="编辑备注：${escapeAttribute(bill.note || "暂无")}">
        <span>备注：</span><span>${escapeHtml(bill.note || "暂无")}</span>
      </button>`;
  }

  function billRowById(id) {
    return [...(ledgerRoot?.querySelectorAll("[data-ledger-bill-id]") || [])]
      .find((row) => row.dataset.ledgerBillId === id) || null;
  }

  function replaceBillNoteControl(id, editing, value) {
    const bill = ledgerData.bills.find((entry) => entry.id === id);
    const row = billRowById(id);
    const current = row?.querySelector(".ledger-bill-note-trigger, .ledger-bill-note-form");
    if (!bill || !current) return null;
    const template = document.createElement("template");
    template.innerHTML = renderBillNoteControl(bill, { editing, value }).trim();
    const replacement = template.content.firstElementChild;
    current.replaceWith(replacement);
    return replacement;
  }

  function activeBillNoteForm() {
    return editingNoteBillId
      ? ledgerRoot?.querySelector('[data-ledger-form="bill-note"]') || null
      : null;
  }

  function focusBillNoteForm(form) {
    const input = form?.querySelector('input[name="note"]');
    input?.focus({ preventScroll: true });
    input?.select();
  }

  async function flushActiveBillNote() {
    if (pendingNoteSave) return pendingNoteSave;
    const form = activeBillNoteForm();
    if (!form) {
      editingNoteBillId = null;
      return true;
    }
    return submitBillNote(form);
  }

  async function openBillNoteEditor(id) {
    const request = ++noteOpenRequest;
    const bill = ledgerData.bills.find((entry) => entry.id === id);
    if (!bill) return;
    if (editingBillId === id) {
      const fullBillNote = ledgerRoot.querySelector('[data-ledger-form="bill"] input[name="note"]');
      fullBillNote?.scrollIntoView({ behavior: "smooth", block: "center" });
      fullBillNote?.focus({ preventScroll: true });
      fullBillNote?.select();
      return;
    }
    if (editingNoteBillId === id) {
      focusBillNoteForm(activeBillNoteForm());
      return;
    }
    if (!(await flushActiveBillNote()) || request !== noteOpenRequest) return;
    editingNoteBillId = id;
    const editor = replaceBillNoteControl(id, true, bill.note || "");
    focusBillNoteForm(editor);
  }

  function cancelBillNoteEditor() {
    noteOpenRequest += 1;
    const id = editingNoteBillId;
    editingNoteBillId = null;
    if (id) replaceBillNoteControl(id, false);
  }

  function handleDocumentPointerDown(event) {
    const form = activeBillNoteForm();
    if (!form || form.contains(event.target)) return;
    const actionTarget = event.target.closest?.("[data-ledger-action]");
    if (actionTarget?.dataset.ledgerAction === "delete-bill") {
      cancelBillNoteEditor();
      return;
    }
    const nextNote = event.target.closest?.('[data-ledger-action="edit-bill-note"]');
    if (nextNote && ledgerRoot?.contains(nextNote)) return;
    void flushActiveBillNote();
  }

  function renderBillRow(bill) {
    const payer = travelerById(bill.payerId);
    const participants = bill.participantIds.map(travelerById).filter(Boolean);
    const baseCurrency = ledgerData.settings.baseCurrency;
    return `
      <article class="ledger-bill-row" data-ledger-bill-id="${escapeAttribute(bill.id)}">
        <div class="ledger-bill-main">
          <div class="ledger-bill-title-row">
            <span class="ledger-category-mark" data-ledger-category="${escapeAttribute(bill.category)}" aria-hidden="true"></span>
            <div>
              <h3>${escapeHtml(bill.category)}</h3>
              ${renderBillNoteControl(bill)}
              ${bill.orderedAt ? `<p class="ledger-bill-date">${escapeHtml(formatBillDate(bill.orderedAt))}</p>` : ""}
            </div>
          </div>
          <div class="ledger-bill-amount">
            <strong>${escapeHtml(formatMoney(bill.originalAmountCents, bill.currency))}</strong>
            ${bill.currency !== baseCurrency ? `<span>折合 ${escapeHtml(formatMoney(bill.baseAmountCents, baseCurrency))}${Number.isFinite(Number(bill.fxRate)) ? `<small class="ledger-bill-rate">按 1 ${escapeHtml(bill.currency)} ≈ ${escapeHtml(formatRate(bill.fxRate))} ${escapeHtml(baseCurrency)}${bill.fxDate ? ` · ${escapeHtml(bill.fxDate)}` : ""}</small>` : ""}</span>` : ""}
          </div>
        </div>
        <div class="ledger-bill-people">
          <div class="ledger-bill-payer">
            <span>买单</span>
            ${renderAvatar(payer, "small")}
            <b>${escapeHtml(payer?.name || "")}</b>
          </div>
          <div class="ledger-bill-participants" aria-label="参与分账：${escapeAttribute(participants.map((person) => person.name).join("、"))}">
            <span>分账</span>
            <span class="ledger-avatar-stack">${participants.map((person) => renderAvatar(person, "tiny")).join("")}</span>
            <b>${participants.length} 人</b>
          </div>
        </div>
        <div class="ledger-row-actions">
          <button class="ledger-text-button" type="button" data-ledger-action="edit-bill" data-ledger-id="${escapeAttribute(bill.id)}">编辑账单</button>
          <button class="ledger-text-button ledger-danger-button" type="button" data-ledger-action="delete-bill" data-ledger-id="${escapeAttribute(bill.id)}">删除</button>
        </div>
      </article>`;
  }

  function renderBillList() {
    const baseCurrency = ledgerData.settings.baseCurrency;
    const totalCents = ledgerData.bills.reduce((sum, bill) => sum + bill.baseAmountCents, 0);
    const bills = [...ledgerData.bills].sort((first, second) => {
      const firstDate = first.orderedAt || first.createdAt;
      const secondDate = second.orderedAt || second.createdAt;
      return secondDate.localeCompare(firstDate);
    });
    return `
      <section class="ledger-list-section" aria-labelledby="ledger-list-title">
        <div class="ledger-section-heading ledger-list-heading">
          <div>
            <p class="ledger-section-kicker">账单明细</p>
            <h2 id="ledger-list-title">${bills.length ? `${bills.length} 笔账单` : "还没有账单"}</h2>
          </div>
          <div class="ledger-list-total">
            <span>总支出</span>
            <strong>${escapeHtml(formatMoney(totalCents, baseCurrency))}</strong>
          </div>
        </div>
        ${bills.length
          ? `<div class="ledger-bill-list">${bills.map(renderBillRow).join("")}</div>`
          : `<div class="ledger-empty-state"><p>记下第一笔花费后，账单会显示在这里。</p></div>`}
      </section>`;
  }

  function renderEntryPage() {
    return `
      <section class="ledger-tab-panel" data-ledger-panel="entry" role="tabpanel" aria-labelledby="ledger-entry-tab" ${activeTab === "entry" ? "" : "hidden"}>
        <section class="ledger-members-strip" aria-label="本次同行人">
          <div class="ledger-members-strip-heading">
            <div><strong>同行人</strong><span>${ledgerData.travelers.length} 人</span></div>
            <button class="ledger-text-button" type="button" data-ledger-action="open-members">管理</button>
          </div>
          <div class="ledger-members-inline">
            ${ledgerData.travelers.map((traveler) => `<div class="ledger-person-static">${renderAvatar(traveler)}<span>${escapeHtml(traveler.name)}</span></div>`).join("")}
            <button class="ledger-add-person" type="button" data-ledger-action="open-members" aria-label="添加同行人"><span aria-hidden="true">＋</span><small>添加</small></button>
          </div>
        </section>
        ${renderBillForm()}
        ${renderBillList()}
      </section>`;
  }

  function renderRelatedBills(member) {
    if (!member.billIds.length) return `<p class="ledger-member-empty">暂无相关账单</p>`;
    return member.billIds.map((billId) => {
      const bill = ledgerData.bills.find((entry) => entry.id === billId);
      if (!bill) return "";
      const share = billShares(bill).get(member.traveler.id) || 0;
      return `
        <div class="ledger-member-bill">
          <span>${escapeHtml(bill.category)}${bill.payerId === member.traveler.id ? " · 买单" : ""}</span>
          <span>${share ? `分摊 ${escapeHtml(formatMoney(share, ledgerData.settings.baseCurrency))}` : "未参与分摊"}</span>
        </div>`;
    }).join("");
  }

  function renderStatsPage() {
    const stats = calculateStats();
    const baseCurrency = ledgerData.settings.baseCurrency;
    /* 账单变动后转账笔数可能变少，顺手丢掉越界的展开序号。 */
    for (const index of [...expandedTransfers]) {
      if (index >= stats.transfers.length) expandedTransfers.delete(index);
    }
    return `
      <section class="ledger-tab-panel" data-ledger-panel="stats" role="tabpanel" aria-labelledby="ledger-stats-tab" ${activeTab === "stats" ? "" : "hidden"}>
        <section class="ledger-stats-overview" aria-labelledby="ledger-stats-title">
          <p class="ledger-section-kicker">账单结算</p>
          <h2 id="ledger-stats-title">${escapeHtml(formatMoney(stats.totalCents, baseCurrency))}</h2>
          <span>${ledgerData.bills.length} 笔账单 · 以 ${escapeHtml(baseCurrency)} 结算</span>
        </section>

        <section class="ledger-settlement-section" aria-labelledby="ledger-settlement-title">
          <div class="ledger-section-heading">
            <div>
              <p class="ledger-section-kicker">结算方案</p>
              <h2 id="ledger-settlement-title">谁需要转给谁</h2>
            </div>
            <span class="ledger-soft-count">${stats.transfers.length} 笔转账</span>
          </div>
          ${stats.transfers.length ? `
            <div class="ledger-transfer-list">
              ${stats.transfers.map((transfer, index) => {
                const from = travelerById(transfer.fromId);
                const to = travelerById(transfer.toId);
                const open = expandedTransfers.has(index);
                return `
                  <div class="ledger-transfer-item${open ? " is-open" : ""}">
                    <button class="ledger-transfer-row" type="button" data-ledger-action="explain-transfer" data-ledger-index="${index}" aria-expanded="${open}" aria-controls="ledger-transfer-detail-${index}" aria-label="${open ? "收起" : "查看"}${escapeAttribute(from?.name || "")} 转给 ${escapeAttribute(to?.name || "")} 的计算明细">
                      <span class="ledger-transfer-person">
                        ${renderAvatar(from)}
                        <span><strong>${escapeHtml(from?.name || "")}</strong><small>转给 ${escapeHtml(to?.name || "")}</small></span>
                      </span>
                      <span class="ledger-transfer-amount-wrap">
                        <strong class="ledger-transfer-amount">${escapeHtml(formatMoney(transfer.amountCents, baseCurrency))}</strong>
                        <small class="ledger-transfer-hint">${open ? "收起明细 ⌃" : "怎么算的 ⌄"}</small>
                      </span>
                    </button>
                    <div class="ledger-transfer-detail" id="ledger-transfer-detail-${index}" ${open ? "" : "hidden"}>
                      <div class="ledger-transfer-detail-inner">
                        <div class="ledger-detail-head">
                          <p class="ledger-detail-title">${escapeHtml(from?.name || "")} → ${escapeHtml(to?.name || "")} 怎么算的</p>
                          <p class="ledger-detail-sub">第 ${index + 1} 笔 · 共 ${stats.transfers.length} 笔转账</p>
                        </div>
                        ${open ? transferDetailTables(index) : ""}
                        ${open ? `
                          <div class="ledger-detail-actions">
                            <button type="button" data-ledger-action="zoom-transfer" data-ledger-index="${index}">放大查看</button>
                          </div>` : ""}
                      </div>
                    </div>
                  </div>`;
              }).join("")}
            </div>` : `
            <div class="ledger-empty-state"><p>${ledgerData.bills.length ? "大家已经结清，无需转账。" : "添加账单后，这里会自动生成结算单。"}</p></div>`}
        </section>

        <section class="ledger-member-stats-section" aria-labelledby="ledger-member-stats-title">
          <div class="ledger-section-heading">
            <div>
              <p class="ledger-section-kicker">成员消费明细</p>
              <h2 id="ledger-member-stats-title">每个人的收支</h2>
            </div>
          </div>
          ${stats.members.length ? `
            <div class="ledger-member-stats-list">
              ${stats.members.map((member) => `
                <details class="ledger-member-stat" open>
                  <summary class="ledger-member-stat-summary">
                    <span class="ledger-member-identity">${renderAvatar(member.traveler)}<strong>${escapeHtml(member.traveler.name)}</strong></span>
                    <span class="ledger-member-chevron" aria-hidden="true">›</span>
                  </summary>
                  <div class="ledger-member-stat-body">
                    <dl class="ledger-member-metrics">
                      <div><dt>实际支付</dt><dd>${escapeHtml(formatMoney(member.paidCents, baseCurrency))}</dd></div>
                      <div><dt>个人应分摊</dt><dd>${escapeHtml(formatMoney(member.owedCents, baseCurrency))}</dd></div>
                      <div><dt>结算结果</dt><dd class="${member.netCents > 0 ? "ledger-positive" : member.netCents < 0 ? "ledger-negative" : "ledger-neutral"}">${member.netCents > 0 ? "应收 " : member.netCents < 0 ? "应付 " : "已结清 "}${member.netCents === 0 ? "" : escapeHtml(formatMoney(Math.abs(member.netCents), baseCurrency))}</dd></div>
                    </dl>
                    <div class="ledger-member-bills">${renderRelatedBills(member)}</div>
                  </div>
                </details>`).join("")}
            </div>` : `<div class="ledger-empty-state"><p>添加同行人后，这里会显示每个人的收支。</p></div>`}
        </section>
      </section>`;
  }

  function renderMemberEditRow(traveler) {
    if (editingMemberId === traveler.id) {
      return `
        <form class="ledger-member-edit-row ledger-member-edit-row-is-open" data-ledger-form="member-edit" data-ledger-id="${escapeAttribute(traveler.id)}">
          ${renderAvatar(traveler)}
          <label class="ledger-visually-hidden" for="ledger-name-${escapeAttribute(traveler.id)}">成员姓名</label>
          <input class="ledger-input" id="ledger-name-${escapeAttribute(traveler.id)}" name="name" maxlength="30" value="${escapeAttribute(traveler.name)}" required>
          <label class="ledger-color-picker" title="修改头像颜色">
            <span class="ledger-visually-hidden">头像颜色</span>
            <input type="color" name="color" value="${escapeAttribute(traveler.color)}">
          </label>
          <button class="ledger-text-button" type="submit">完成</button>
          <button class="ledger-icon-button ledger-danger-button" type="button" data-ledger-action="delete-member" data-ledger-id="${escapeAttribute(traveler.id)}" aria-label="删除 ${escapeAttribute(traveler.name)}">删除</button>
        </form>`;
    }
    return `
      <div class="ledger-member-edit-row ledger-member-edit-row-static">
        ${renderAvatar(traveler)}
        <strong>${escapeHtml(traveler.name)}</strong>
        <span class="ledger-member-edit-actions">
          <button class="ledger-text-button" type="button" data-ledger-action="edit-member" data-ledger-id="${escapeAttribute(traveler.id)}">编辑</button>
          <button class="ledger-icon-button ledger-danger-button" type="button" data-ledger-action="delete-member" data-ledger-id="${escapeAttribute(traveler.id)}" aria-label="删除 ${escapeAttribute(traveler.name)}">删除</button>
        </span>
      </div>`;
  }

  function renderMembersDialog() {
    const suggestedColor = nextAvatarColor(ledgerData.travelers);
    return `
      <dialog class="ledger-dialog ledger-members-dialog" data-ledger-dialog="members" aria-labelledby="ledger-members-dialog-title">
        <div class="ledger-dialog-header">
          <div>
            <p class="ledger-section-kicker">同行人</p>
            <h2 id="ledger-members-dialog-title">管理本次成员</h2>
          </div>
          <button class="ledger-dialog-close" type="button" data-ledger-action="close-dialog" aria-label="关闭">×</button>
        </div>
        <div class="ledger-dialog-body">
          ${ledgerData.travelers.length ? `
            <div class="ledger-member-edit-list">
              ${ledgerData.travelers.map(renderMemberEditRow).join("")}
            </div>` : `<p class="ledger-dialog-empty">还没有同行人。</p>`}
          <form class="ledger-add-member-form" data-ledger-form="member-add">
            <div class="ledger-add-member-preview" data-ledger-member-preview style="--ledger-avatar-color:${escapeAttribute(suggestedColor)}">?</div>
            <label class="ledger-field ledger-add-member-name">
              <span class="ledger-field-label">添加成员</span>
              <input class="ledger-input" name="name" maxlength="30" placeholder="输入姓名" autocomplete="off" aria-label="添加成员姓名" required>
            </label>
            <label class="ledger-color-picker" title="选择头像颜色">
              <span class="ledger-visually-hidden">头像颜色</span>
              <input type="color" name="color" value="${escapeAttribute(suggestedColor)}" aria-label="选择头像颜色">
            </label>
            <button class="ledger-secondary-button" type="submit">添加</button>
          </form>
          <p class="ledger-dialog-note">头像文字会从姓名自动提取；颜色可以随时修改。</p>
        </div>
      </dialog>`;
  }

  function renderCurrencyChip(code) {
    const currency = currencyByCode(code);
    return `
      <span class="ledger-currency-chip">
        <b>${escapeHtml(code)}</b>
        <span>${escapeHtml(currency.nameZh)}</span>
        <button type="button" data-ledger-action="remove-common-currency" data-ledger-code="${escapeAttribute(code)}" aria-label="移除 ${escapeAttribute(currency.nameZh)}">×</button>
      </span>`;
  }

  function renderSettingsDialog() {
    const baseCurrency = currencyByCode(ledgerData.settings.baseCurrency);
    const baseLocked = ledgerData.bills.length > 0;
    return `
      <dialog class="ledger-dialog ledger-settings-dialog" data-ledger-dialog="settings" aria-labelledby="ledger-settings-dialog-title">
        <div class="ledger-dialog-header">
          <div>
            <p class="ledger-section-kicker">记账设置</p>
            <h2 id="ledger-settings-dialog-title">货币</h2>
          </div>
          <button class="ledger-dialog-close" type="button" data-ledger-action="close-dialog" aria-label="关闭">×</button>
        </div>
        <div class="ledger-dialog-body">
          <section class="ledger-setting-group">
            <div class="ledger-setting-heading">
              <div><h3>记账本位币</h3><p>统计与最终结算都使用这个币种</p></div>
            </div>
            <button class="ledger-currency-select-button" type="button" data-ledger-action="pick-base-currency" ${baseLocked ? "disabled" : ""}>
              <span class="ledger-currency-symbol">${escapeHtml(baseCurrency.symbol)}</span>
              <span><strong>${escapeHtml(baseCurrency.code)} · ${escapeHtml(baseCurrency.nameZh)}</strong><small>${escapeHtml(baseCurrency.nameEn)}</small></span>
              <span aria-hidden="true">›</span>
            </button>
            ${baseLocked ? `<p class="ledger-setting-note">已有账单后，本位币会锁定，避免历史换算金额失真。</p>` : ""}
          </section>
          <section class="ledger-setting-group">
            <div class="ledger-setting-heading">
              <div><h3>常用外币</h3><p>只在记账时显示你选中的币种</p></div>
              <button class="ledger-text-button" type="button" data-ledger-action="pick-common-currency">添加货币</button>
            </div>
            ${ledgerData.settings.commonCurrencies.length
              ? `<div class="ledger-currency-chips">${ledgerData.settings.commonCurrencies.map(renderCurrencyChip).join("")}</div>`
              : `<p class="ledger-dialog-empty">尚未添加常用外币。</p>`}
          </section>
        </div>
      </dialog>`;
  }

  function searchedCurrencies() {
    const query = normalizeSearch(currencyQuery);
    if (!query) return [];
    return CURRENCY_CATALOG
      .filter((currency) => currencySearchText.get(currency.code).includes(query))
      .slice(0, 24);
  }

  function currencyResultMarkup(currency) {
    const isBase = currency.code === ledgerData.settings.baseCurrency;
    const isSelected = currencyPickerMode === "base"
      ? isBase
      : ledgerData.settings.commonCurrencies.includes(currency.code);
    const disabled = currencyPickerMode === "common" && isBase;
    return `
      <button class="ledger-currency-result ${isSelected ? "ledger-is-selected" : ""}" type="button" data-ledger-action="choose-currency" data-ledger-code="${escapeAttribute(currency.code)}" ${disabled ? "disabled" : ""}>
        <span class="ledger-currency-symbol">${escapeHtml(currency.symbol)}</span>
        <span class="ledger-currency-result-name"><strong>${escapeHtml(currency.code)} · ${escapeHtml(currency.nameZh)}</strong><small>${escapeHtml(currency.nameEn)}</small></span>
        <span class="ledger-currency-result-state">${disabled ? "本位币" : isSelected ? "已选择" : "选择"}</span>
      </button>`;
  }

  function renderCurrencyResultsMarkup() {
    const currencies = searchedCurrencies();
    if (!normalizeSearch(currencyQuery)) {
      return `<div class="ledger-currency-empty"><p>输入货币名称开始查找</p><small>例如：港币、Hong Kong 或 HKD</small></div>`;
    }
    return currencies.length
      ? currencies.map(currencyResultMarkup).join("")
      : `<div class="ledger-currency-empty"><p>没有找到相关货币</p><small>可以尝试中文名、英文名、代码、符号或国家与地区。</small></div>`;
  }

  function renderCurrencyDialog() {
    return `
      <dialog class="ledger-dialog ledger-currency-dialog" data-ledger-dialog="currency" aria-labelledby="ledger-currency-dialog-title">
        <div class="ledger-dialog-header">
          <div>
            <p class="ledger-section-kicker">世界货币</p>
            <h2 id="ledger-currency-dialog-title">${currencyPickerMode === "base" ? "选择本位币" : "添加常用外币"}</h2>
          </div>
          <button class="ledger-dialog-close" type="button" data-ledger-action="back-to-settings" aria-label="返回设置">×</button>
        </div>
        <div class="ledger-dialog-body">
          <label class="ledger-currency-search">
            <span class="ledger-visually-hidden">搜索货币</span>
            <span aria-hidden="true">⌕</span>
            <input class="ledger-input" type="search" data-ledger-currency-search placeholder="搜索港币、Hong Kong、HKD…" value="${escapeAttribute(currencyQuery)}" autocomplete="off">
          </label>
          <p class="ledger-search-help">支持中文名、英文名、代码、符号和国家或地区</p>
          <div class="ledger-currency-results" data-ledger-currency-results>${renderCurrencyResultsMarkup()}</div>
        </div>
      </dialog>`;
  }

  function renderApp() {
    if (!ledgerRoot || !ledgerData) return;
    ledgerRoot.innerHTML = `
      <div class="ledger-app" data-ledger-trip-id="${escapeAttribute(ledgerTripId)}">
        <header class="ledger-page-header">
          <h2>旅行记账</h2>
          <div class="ledger-header-actions">
            <button class="ledger-icon-button" type="button" data-ledger-action="open-settings" aria-label="记账设置">设置</button>
          </div>
        </header>
        <nav class="ledger-tabs" role="tablist" aria-label="记账页面">
          <button id="ledger-entry-tab" class="ledger-tab ${activeTab === "entry" ? "ledger-is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === "entry"}" data-ledger-action="set-tab" data-ledger-tab="entry">记账</button>
          <button id="ledger-stats-tab" class="ledger-tab ${activeTab === "stats" ? "ledger-is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === "stats"}" data-ledger-action="set-tab" data-ledger-tab="stats">账单结算</button>
        </nav>
        <div class="ledger-live" role="status" aria-live="polite">${escapeHtml(notice)}</div>
        ${renderEntryPage()}
        ${renderStatsPage()}
        ${renderMembersDialog()}
        ${renderSettingsDialog()}
        ${renderCurrencyDialog()}
      </div>`;
    baseAmountTouched = false;
    syncSplitSummary();
    attachDialogBehavior();
    primeFxRate(ledgerRoot.querySelector('[data-ledger-form="bill"]'));
    if (openDialogName) {
      const dialog = ledgerRoot.querySelector(`[data-ledger-dialog="${openDialogName}"]`);
      if (dialog) {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        if (openDialogName === "currency") {
          const search = dialog.querySelector("[data-ledger-currency-search]");
          if (search) {
            search.focus({ preventScroll: true });
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
    }
  }

  function setNotice(message) {
    notice = message;
    const live = ledgerRoot?.querySelector(".ledger-live");
    if (live) live.textContent = message;
  }

  function setFormError(form, message) {
    const target = form.querySelector("[data-ledger-form-error]");
    if (target) target.textContent = message;
    const live = ledgerRoot?.querySelector(".ledger-live");
    if (live) live.textContent = message;
  }

  function enqueueMutation(operation) {
    const queued = mutationQueue.then(operation, operation);
    mutationQueue = queued.catch(() => {});
    return queued;
  }

  async function mutateData(mutator, options = {}) {
    return enqueueMutation(async () => {
      const next = deepClone(ledgerData);
      mutator(next);
      next.version = STORAGE_VERSION;
      next.updatedAt = new Date().toISOString();
      try {
        await Promise.resolve(ledgerAdapter.save(next, { tripId: ledgerTripId }));
        ledgerData = normalizeData(next);
        if (typeof options.afterSuccess === "function") options.afterSuccess();
        notice = options.message || "";
        renderApp();
        ledgerRoot.dispatchEvent(new CustomEvent("travel-ledger:changed", {
          bubbles: true,
          detail: { tripId: ledgerTripId, reason: options.reason || "update", data: deepClone(ledgerData) }
        }));
        return true;
      } catch (error) {
        console.error("TravelLedger could not save data", error);
        setNotice(ledgerPersistenceMode === "d1"
          ? "保存失败，请检查网络或你的云端数据库配置后重试。"
          : "本地保存失败，请检查浏览器存储空间或隐私设置后重试。");
        return false;
      }
    });
  }

  function captureBillDraft() {
    if (!ledgerRoot || editingBillId) return;
    const form = ledgerRoot.querySelector('[data-ledger-form="bill"]');
    if (!form) return;
    const formData = new FormData(form);
    billDraft = {
      currency: String(formData.get("currency") || ledgerData.settings.lastCurrency),
      originalAmount: String(formData.get("originalAmount") || ""),
      baseAmount: String(formData.get("baseAmount") || ""),
      category: String(formData.get("category") || "餐饮"),
      note: String(formData.get("note") || "").trim().slice(0, 160),
      orderedAt: String(formData.get("orderedAt") || ""),
      payerId: String(formData.get("payerId") || ""),
      participantIds: formData.getAll("participantIds").map(String)
    };
  }

  function syncSplitSummary() {
    if (!ledgerRoot || !ledgerData) return;
    const form = ledgerRoot.querySelector('[data-ledger-form="bill"]');
    const summary = form?.querySelector("[data-ledger-split-summary]");
    if (!form || !summary) return;
    const participants = [...form.querySelectorAll('input[name="participantIds"]:checked')];
    if (!participants.length) {
      summary.textContent = "请选择至少一位分账人";
      return;
    }
    const currency = form.elements.currency?.value || ledgerData.settings.baseCurrency;
    const amountField = currency === ledgerData.settings.baseCurrency
      ? form.elements.originalAmount
      : form.elements.baseAmount;
    const amountCents = toCents(amountField?.value);
    if (!amountCents || amountCents <= 0) {
      summary.textContent = `已选 ${participants.length} 人 · 按人数平分`;
      return;
    }
    const averageCents = Math.floor(amountCents / participants.length);
    summary.textContent = `已选 ${participants.length} 人 · 每人约 ${formatMoney(averageCents, ledgerData.settings.baseCurrency)}`;
  }

  function syncCurrencyField(select) {
    const form = select.closest("form");
    if (!form) return;
    const convertedField = form.querySelector("[data-ledger-converted-field]");
    const convertedInput = form.querySelector('[data-ledger-field="base-amount"]');
    const isForeign = select.value !== ledgerData.settings.baseCurrency;
    if (convertedField) convertedField.hidden = !isForeign;
    if (convertedInput) {
      convertedInput.required = false; // 折合金额由汇率自动换算，不再强制手填
      if (!isForeign) convertedInput.value = "";
    }
    baseAmountTouched = false;
    captureBillDraft();
    syncConvertedAmount(form);
    primeFxRate(form);
    syncSplitSummary();
  }

  function syncMemberPreview(form) {
    const preview = form.querySelector("[data-ledger-member-preview]");
    if (!preview) return;
    const name = form.elements.name?.value || "";
    const color = form.elements.color?.value || nextAvatarColor(ledgerData.travelers);
    preview.textContent = name.trim() ? avatarInitial(name) : "?";
    if (isValidColor(color)) preview.style.setProperty("--ledger-avatar-color", color);
  }

  function attachDialogBehavior() {
    ledgerRoot.querySelectorAll("dialog[data-ledger-dialog]").forEach((dialog) => {
      dialog.addEventListener("close", () => {
        if (dialog.dataset.ledgerDialog === "members") editingMemberId = null;
        if (openDialogName === dialog.dataset.ledgerDialog) openDialogName = null;
      });
      dialog.addEventListener("cancel", () => {
        openDialogName = null;
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
    });
  }

  function showDialog(name, { focusSearch = false } = {}) {
    if (!ledgerRoot) return;
    const dialog = ledgerRoot.querySelector(`[data-ledger-dialog="${name}"]`);
    if (!dialog) return;
    const current = ledgerRoot.querySelector("dialog[open]");
    if (current && current !== dialog) {
      openDialogName = null;
      if (typeof current.close === "function") current.close();
      else current.removeAttribute("open");
    }
    openDialogName = name;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    const focusTarget = focusSearch
      ? dialog.querySelector("[data-ledger-currency-search]")
      : dialog.querySelector("input:not([type=color]), button");
    requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
  }

  function closeDialog(dialog = ledgerRoot?.querySelector("dialog[open]")) {
    if (!dialog) {
      openDialogName = null;
      return;
    }
    if (dialog.dataset.ledgerDialog === "members") editingMemberId = null;
    openDialogName = null;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function updateCurrencyDialog(mode) {
    currencyPickerMode = mode;
    currencyQuery = "";
    const dialog = ledgerRoot.querySelector('[data-ledger-dialog="currency"]');
    if (!dialog) return;
    const title = dialog.querySelector("#ledger-currency-dialog-title");
    const search = dialog.querySelector("[data-ledger-currency-search]");
    const results = dialog.querySelector("[data-ledger-currency-results]");
    if (title) title.textContent = mode === "base" ? "选择本位币" : "添加常用外币";
    if (search) search.value = "";
    if (results) results.innerHTML = renderCurrencyResultsMarkup();
    showDialog("currency", { focusSearch: true });
  }

  function chooseBillCurrency(button) {
    const form = button.closest('[data-ledger-form="bill"]');
    const code = button.dataset.ledgerCode || "";
    if (!form || !availableCurrencyCodes(code).includes(code)) return;
    const field = form.querySelector('[data-ledger-field="currency"]');
    const display = form.querySelector("[data-ledger-currency-display]");
    const dropdown = button.closest("details");
    if (field) field.value = code;
    if (display) display.textContent = `${code} · ${currencyByCode(code).nameZh}`;
    dropdown?.removeAttribute("open");
    if (field) syncCurrencyField(field);
  }

  function isDuplicateTravelerName(name, ignoredId = "") {
    const normalized = name.trim().toLocaleLowerCase();
    return ledgerData.travelers.some((traveler) => (
      traveler.id !== ignoredId && traveler.name.trim().toLocaleLowerCase() === normalized
    ));
  }

  /* 短时间内重复记账检测：金额、分类、买单人、备注、时间越像，越可能是同一笔账记了两次。 */
  const DUPLICATE_WINDOW_HOURS = 12;
  const DUPLICATE_SCORE_THRESHOLD = 5;

  function billTimestamp(bill) {
    const source = bill?.orderedAt || bill?.createdAt || bill?.updatedAt || "";
    if (!source) return null;
    const parsed = new Date(source);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : time;
  }

  function billSimilarityScore(fields, bill, referenceTime) {
    const oldTime = billTimestamp(bill);
    if (oldTime == null) return 0;
    const hours = Math.abs(referenceTime - oldTime) / 3600000;
    if (hours > DUPLICATE_WINDOW_HOURS) return 0;
    let score = hours <= 0.5 ? 2 : hours <= 2 ? 1.5 : hours <= 6 ? 1 : 0.5;
    if (bill.currency === fields.currency && bill.originalAmountCents === fields.originalAmountCents) score += 3;
    else if (bill.baseAmountCents === fields.baseAmountCents) score += 2;
    else {
      const gap = Math.abs(bill.baseAmountCents - fields.baseAmountCents);
      if (gap <= Math.max(1, Math.round(fields.baseAmountCents * 0.01))) score += 1;
    }
    if (bill.category === fields.category) score += 1;
    if (bill.payerId && bill.payerId === fields.payerId) score += 1;
    const oldNote = normalizeSearch(bill.note);
    const newNote = normalizeSearch(fields.note);
    if (oldNote && newNote && (oldNote === newNote || oldNote.includes(newNote) || newNote.includes(oldNote))) score += 2;
    const oldSplit = bill.participantIds || [];
    const newSplit = fields.participantIds || [];
    if (oldSplit.length === newSplit.length && oldSplit.every((id) => newSplit.includes(id))) score += 0.5;
    return score;
  }

  function findSimilarBills(fields, ignoreId = "") {
    const orderedTime = fields.orderedAt ? new Date(fields.orderedAt).getTime() : NaN;
    const referenceTime = Number.isNaN(orderedTime) ? Date.now() : orderedTime;
    return ledgerData.bills
      .filter((bill) => bill.id !== ignoreId)
      .map((bill) => ({ bill, score: billSimilarityScore(fields, bill, referenceTime) }))
      .filter((entry) => entry.score >= DUPLICATE_SCORE_THRESHOLD)
      .sort((first, second) => (
        second.score - first.score
        || (billTimestamp(second.bill) || 0) - (billTimestamp(first.bill) || 0)
      ))
      .slice(0, 3)
      .map((entry) => entry.bill);
  }

  function describeBillForDuplicate(bill) {
    const payer = travelerById(bill.payerId);
    const baseCurrency = ledgerData.settings.baseCurrency;
    const parts = [
      escapeHtml(bill.category),
      escapeHtml(formatMoney(bill.originalAmountCents, bill.currency))
    ];
    if (bill.currency !== baseCurrency) parts.push(`折合 ${escapeHtml(formatMoney(bill.baseAmountCents, baseCurrency))}`);
    const meta = [formatBillDate(bill.orderedAt || bill.createdAt)];
    if (payer) meta.push(`${payer.name}买单`);
    if (bill.note) meta.push(bill.note);
    return `
      <li class="ledger-dup-row">
        <span class="ledger-dup-main">${parts.join(" · ")}</span>
        <span class="ledger-dup-meta">${escapeHtml(meta.join(" · "))}</span>
      </li>`;
  }

  async function submitBill(form) {
    if (form.dataset.ledgerSubmitting === "1") return;   // 连点两次也不会记成两笔
    const formData = new FormData(form);
    const currency = String(formData.get("currency") || "").toUpperCase();
    const originalAmountCents = toCents(formData.get("originalAmount"));
    const baseCurrencyCode = ledgerData.settings.baseCurrency;
    const isForeign = currency !== baseCurrencyCode;
    const fxRate = isForeign ? await ensureFxRate(currency, baseCurrencyCode) : null;
    let baseAmountCents = isForeign ? toCents(formData.get("baseAmount")) : originalAmountCents;
    if (isForeign && (!baseAmountCents || baseAmountCents <= 0) && Number.isFinite(fxRate)) {
      baseAmountCents = Math.round(originalAmountCents * fxRate);
    }
    const category = String(formData.get("category") || "");
    const payerId = String(formData.get("payerId") || "");
    const participantIds = [...new Set(formData.getAll("participantIds").map(String))]
      .filter((id) => travelerById(id));

    if (!availableCurrencyCodes(currency).includes(currency)) {
      setFormError(form, "请选择本次旅程使用的币种。");
      return;
    }
    if (!originalAmountCents || originalAmountCents <= 0) {
      setFormError(form, "请输入正确的账单金额，最多保留两位小数。");
      form.elements.originalAmount?.focus();
      return;
    }
    if (!baseAmountCents || baseAmountCents <= 0) {
      setFormError(form, Number.isFinite(fxRate)
        ? `请输入正确的${currencyByCode(currency).nameZh}金额。`
        : `未能获取汇率，请手动填写折合${currencyByCode(baseCurrencyCode).nameZh}的金额。`);
      (Number.isFinite(fxRate) ? form.elements.originalAmount : form.elements.baseAmount)?.focus();
      return;
    }
    if (!CATEGORIES.includes(category)) {
      setFormError(form, "请选择账单分类。");
      return;
    }
    if (!travelerById(payerId)) {
      setFormError(form, "请选择一位买单人。");
      return;
    }
    if (!participantIds.length) {
      setFormError(form, "请选择至少一位参与分账的人。");
      return;
    }

    const now = new Date().toISOString();
    const fields = {
      originalAmountCents,
      baseAmountCents,
      currency,
      fxRate: Number.isFinite(fxRate) ? fxRate : null,
      fxDate: fxDateLabel(),
      category,
      note: String(formData.get("note") || "").trim().slice(0, 160),
      orderedAt: String(formData.get("orderedAt") || ""),
      payerId,
      participantIds,
      updatedAt: now
    };
    const billBeingEdited = ledgerData.bills.find((bill) => bill.id === editingBillId);
    if (!billBeingEdited) {
      const duplicates = findSimilarBills(fields, "");
      if (duplicates.length && !(await confirmDuplicateSave(duplicates, fields))) return;
    }

    const newBillId = makeId("bill");
    const savedBillId = billBeingEdited ? billBeingEdited.id : newBillId;
    form.dataset.ledgerSubmitting = "1";
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const saved = await mutateData((next) => {
      if (billBeingEdited) {
        const index = next.bills.findIndex((bill) => bill.id === billBeingEdited.id);
        if (index >= 0) next.bills[index] = { ...next.bills[index], ...fields };
      } else {
        next.bills.push({ id: newBillId, ...fields, createdAt: now });
        next.settings.lastCurrency = currency;
      }
    }, {
      reason: billBeingEdited ? "bill-updated" : "bill-added",
      message: billBeingEdited ? "账单已更新" : "账单已保存",
      afterSuccess() {
        editingBillId = null;
        billDraft = null;
      }
    });
    form.dataset.ledgerSubmitting = "";
    if (submitButton) submitButton.disabled = false;
    if (!saved) return;

    const choice = await showBillSavedDialog({ ...fields, id: savedBillId }, {
      updated: Boolean(billBeingEdited)
    });
    if (choice === "view") revealBill(savedBillId);
    else focusBillForm();
  }

  function focusBillForm() {
    ledgerRoot?.querySelector('[data-ledger-form="bill"] [data-ledger-field="original-amount"]')
      ?.focus({ preventScroll: false });
  }

  function revealBill(id) {
    if (activeTab !== "entry") {
      activeTab = "entry";
      renderApp();
    }
    const row = billRowById(id);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.remove("ledger-bill-row--flash");
    void row.offsetWidth;
    row.classList.add("ledger-bill-row--flash");
  }

  async function submitMemberAdd(form) {
    const name = String(new FormData(form).get("name") || "").trim();
    const color = String(new FormData(form).get("color") || "").toUpperCase();
    if (!name) {
      form.elements.name?.focus();
      setNotice("请输入同行人的姓名。");
      return;
    }
    if (isDuplicateTravelerName(name)) {
      form.elements.name?.focus();
      setNotice("这位同行人已经添加过了。");
      return;
    }
    const id = makeId("person");
    const traveler = {
      id,
      name: name.slice(0, 30),
      initial: avatarInitial(name),
      color: isValidColor(color) ? color : nextAvatarColor(ledgerData.travelers)
    };
    captureBillDraft();
    if (billDraft) billDraft.participantIds = [...new Set([...billDraft.participantIds, id])];
    openDialogName = "members";
    await mutateData((next) => next.travelers.push(traveler), {
      reason: "member-added",
      message: `${traveler.name}已加入同行人`
    });
  }

  async function submitBillNote(form) {
    const id = form.dataset.ledgerId || "";
    const bill = ledgerData.bills.find((entry) => entry.id === id);
    if (!bill) return false;
    const note = String(new FormData(form).get("note") || "").trim().slice(0, 160);
    if (note === (bill.note || "")) {
      if (editingNoteBillId === id) editingNoteBillId = null;
      replaceBillNoteControl(id, false);
      return true;
    }
    if (pendingNoteSave) return pendingNoteSave;
    form.classList.add("ledger-is-saving");
    for (const control of form.elements) control.disabled = true;
    const operation = enqueueMutation(async () => {
      try {
        const latestBill = ledgerData.bills.find((entry) => entry.id === id);
        if (!latestBill) return false;
        if (note === (latestBill.note || "")) {
          if (editingNoteBillId === id) editingNoteBillId = null;
          replaceBillNoteControl(id, false);
          return true;
        }
        const now = new Date().toISOString();
        const next = deepClone(ledgerData);
        const target = next.bills.find((entry) => entry.id === id);
        if (!target) return false;
        target.note = note;
        target.updatedAt = now;
        next.version = STORAGE_VERSION;
        next.updatedAt = now;
        await Promise.resolve(ledgerAdapter.save(next, { tripId: ledgerTripId }));
        ledgerData = normalizeData(next);
        if (editingNoteBillId === id) editingNoteBillId = null;
        const fullBillNote = editingBillId === id
          ? ledgerRoot.querySelector('[data-ledger-form="bill"] input[name="note"]')
          : null;
        if (fullBillNote) fullBillNote.value = note;
        replaceBillNoteControl(id, false);
        setNotice(note ? "备注已更新" : "备注已清空");
        ledgerRoot.dispatchEvent(new CustomEvent("travel-ledger:changed", {
          bubbles: true,
          detail: { tripId: ledgerTripId, reason: "bill-note-updated", data: deepClone(ledgerData) }
        }));
        return true;
      } catch (error) {
        console.error("TravelLedger could not save note", error);
        form.classList.remove("ledger-is-saving");
        for (const control of form.elements) control.disabled = false;
        setNotice(ledgerPersistenceMode === "d1"
          ? "备注保存失败，请检查网络或你的云端数据库配置后重试。"
          : "备注本地保存失败，请检查浏览器存储空间或隐私设置后重试。");
        return false;
      }
    });
    pendingNoteSave = operation;
    operation.then(
      () => { if (pendingNoteSave === operation) pendingNoteSave = null; },
      () => { if (pendingNoteSave === operation) pendingNoteSave = null; }
    );
    return operation;
  }

  async function submitMemberEdit(form) {
    const id = form.dataset.ledgerId || "";
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const color = String(formData.get("color") || "").toUpperCase();
    if (!name) {
      form.elements.name?.focus();
      setNotice("姓名不能为空。");
      return;
    }
    if (isDuplicateTravelerName(name, id)) {
      form.elements.name?.focus();
      setNotice("已有同名的同行人，请换一个称呼。");
      return;
    }
    captureBillDraft();
    openDialogName = "members";
    await mutateData((next) => {
      const traveler = next.travelers.find((entry) => entry.id === id);
      if (!traveler) return;
      traveler.name = name.slice(0, 30);
      traveler.initial = avatarInitial(name);
      if (isValidColor(color)) traveler.color = color;
    }, { reason: "member-updated", message: "同行人信息已更新", afterSuccess() { editingMemberId = null; } });
  }

  function mountDialog({ className = "", ariaLabel = "", innerHTML = "" }) {
    const dialog = document.createElement("dialog");
    dialog.className = className ? `ledger-confirm-dialog ${className}` : "ledger-confirm-dialog";
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", ariaLabel || "提示");
    dialog.innerHTML = innerHTML;
    document.body.append(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return dialog;
  }

  function settleDialog(dialog) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (dialog.open && typeof dialog.close === "function") dialog.close();
        dialog.remove();
        resolve(value);
      };
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      dialog.addEventListener("click", (event) => {
        const choice = event.target.closest("[data-ledger-confirm], [data-ledger-saved]");
        if (choice) {
          finish(choice.dataset.ledgerConfirm === "confirm"
            ? true
            : choice.dataset.ledgerConfirm === "cancel"
              ? false
              : choice.dataset.ledgerSaved || null);
          return;
        }
        if (event.target === dialog) finish(null);
      });
      const focusTarget = dialog.querySelector('[data-ledger-confirm="cancel"], [data-ledger-saved]');
      requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    });
  }

  function confirmLedgerAction(message) {
    return settleDialog(mountDialog({
      ariaLabel: "确认删除",
      innerHTML: `<div class="ledger-confirm-card">
        <p>${escapeHtml(message)}</p>
        <div class="ledger-confirm-actions">
          <button type="button" data-ledger-confirm="cancel">取消</button>
          <button type="button" class="ledger-confirm-danger" data-ledger-confirm="confirm">确认删除</button>
        </div>
      </div>`
    })).then((value) => value === true);
  }

  /* 相近账单提醒：确认后才继续保存，取消则保留表单内容让用户核对。 */
  function confirmDuplicateSave(duplicates, fields) {
    const baseCurrency = ledgerData.settings.baseCurrency;
    const summary = fields.currency === baseCurrency
      ? formatMoney(fields.baseAmountCents, baseCurrency)
      : `${formatMoney(fields.originalAmountCents, fields.currency)}（折合 ${formatMoney(fields.baseAmountCents, baseCurrency)}）`;
    return settleDialog(mountDialog({
      className: "ledger-duplicate-dialog",
      ariaLabel: "确认是否重复记账",
      innerHTML: `<div class="ledger-confirm-card">
        <p class="ledger-confirm-title">这笔账可能重复了</p>
        <p class="ledger-confirm-text">刚要记的是 <b>${escapeHtml(fields.category)} ${escapeHtml(summary)}</b>，
          与下面${duplicates.length > 1 ? "这些" : "这笔"}账单很接近：</p>
        <ul class="ledger-dup-list">${duplicates.map(describeBillForDuplicate).join("")}</ul>
        <p class="ledger-confirm-text">如果是同一笔，请返回核对；确实是两笔，就继续保存。</p>
        <div class="ledger-confirm-actions">
          <button type="button" data-ledger-confirm="cancel">返回核对</button>
          <button type="button" class="ledger-confirm-primary" data-ledger-confirm="confirm">仍要保存</button>
        </div>
      </div>`
    })).then((value) => value === true);
  }

  /* 记账完成弹窗：把这笔账的关键信息回执给用户。 */
  function showBillSavedDialog(bill, options = {}) {
    const updated = Boolean(options.updated);
    const baseCurrency = ledgerData.settings.baseCurrency;
    const payer = travelerById(bill.payerId);
    const participants = (bill.participantIds || []).map(travelerById).filter(Boolean);
    const averageCents = participants.length
      ? Math.floor(bill.baseAmountCents / participants.length)
      : bill.baseAmountCents;
    const rows = [
      ["分类", escapeHtml(bill.category)],
      ["金额", bill.currency === baseCurrency
        ? escapeHtml(formatMoney(bill.originalAmountCents, bill.currency))
        : `${escapeHtml(formatMoney(bill.originalAmountCents, bill.currency))} · 折合 ${escapeHtml(formatMoney(bill.baseAmountCents, baseCurrency))}`],
      ["买单", escapeHtml(payer?.name || "未指定")],
      ["分账", participants.length
        ? `${escapeHtml(String(participants.length))} 人 · 每人约 ${escapeHtml(formatMoney(averageCents, baseCurrency))}`
        : "未选择"]
    ];
    if (bill.note) rows.push(["备注", escapeHtml(bill.note)]);
    return settleDialog(mountDialog({
      className: "ledger-saved-dialog",
      ariaLabel: updated ? "账单已更新" : "记账完成",
      innerHTML: `<div class="ledger-saved-card">
        <div class="ledger-saved-mark" aria-hidden="true">✓</div>
        <p class="ledger-saved-title">${updated ? "账单已更新" : "记账完成"}</p>
        <p class="ledger-saved-sub">${updated ? "修改已保存，结算会同步刷新" : "这笔花费已经记好了"}</p>
        <div class="ledger-saved-summary">
          ${rows.map(([label, value]) => `
            <div class="ledger-saved-row"><span>${label}</span><b>${value}</b></div>`).join("")}
        </div>
        <div class="ledger-saved-actions">
          <button type="button" data-ledger-saved="keep">继续记账</button>
          <button type="button" class="ledger-saved-primary" data-ledger-saved="view">查看账单</button>
        </div>
      </div>`
    }));
  }

  /* 把一笔转账拆回「净额 → 撮合 → 抵消链路 → 账单级欠条」，全部用表格列出，方便逐格核对。 */
  function transferDetailTables(index) {
    const stats = calculateStats();
    const state = transferQueueState(stats, index);
    if (!state) return "";
    const baseCurrency = ledgerData.settings.baseCurrency;
    const money = (cents) => escapeHtml(formatMoney(cents, baseCurrency));
    const { transfer, fromRemaining, toRemaining, fromAfter, toAfter } = state;
    const from = travelerById(transfer.fromId);
    const to = travelerById(transfer.toId);
    const memberById = new Map(stats.members.map((member) => [member.traveler.id, member]));
    const fromMember = memberById.get(transfer.fromId);
    const toMember = memberById.get(transfer.toId);
    const edges = netDebtEdges();
    const chain = findDebtChain(edges, transfer.fromId, transfer.toId);
    const directEdge = edges.find((edge) => edge.fromId === transfer.fromId && edge.toId === transfer.toId);
    const nameOf = (person) => escapeHtml(person?.name || "已移除");
    const itemsOf = (items) => escapeHtml(describeDebtItems(items));

    /* 统一的表格骨架：第一列当标签列，tfoot 放小计/结论。 */
    const renderTable = (columns, rows, foot) => `
      <div class="ledger-detail-table-wrap">
        <table class="ledger-detail-table">
          <thead>
            <tr>${columns.map((column) => `<th scope="col">${column}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.length
              ? rows.map((cells) => `<tr>${cells.map((cell, cellIndex) => (
                  `<td${cellIndex === 0 ? ` scope="row" class="ledger-detail-cell-label"` : ""}>${cell}</td>`
                )).join("")}</tr>`).join("")
              : `<tr><td class="ledger-detail-empty" colspan="${columns.length}">没有可列出的记录</td></tr>`}
          </tbody>
          ${foot ? `<tfoot>${foot}</tfoot>` : ""}
        </table>
      </div>`;

    /* ① 净额：实付 − 应分摊 = 净额 */
    const netRows = [fromMember, toMember].filter(Boolean).map((member) => {
      const isPayer = member.netCents < 0;
      return [
        nameOf(member.traveler),
        money(member.paidCents),
        money(member.owedCents),
        isPayer ? `<b class="is-out">应付 ${money(-member.netCents)}</b>` : `<b class="is-in">应收 ${money(member.netCents)}</b>`
      ];
    });

    /* ② 撮合：排队到这一笔时两边各剩多少，取小即为本笔金额 */
    const matchRows = [
      ["本笔前", `还需支付 ${money(fromRemaining)}`, `还需收回 ${money(toRemaining)}`],
      ["本笔金额", `<b class="is-out">付出 ${money(transfer.amountCents)}</b>`, `<b class="is-in">收回 ${money(transfer.amountCents)}</b>`],
      ["本笔后", fromAfter > 0 ? `还需支付 ${money(fromAfter)}` : "已付清", toAfter > 0 ? `还需收回 ${money(toAfter)}` : "已收清"]
    ];
    const matchFoot = `<tr>
      <th scope="row" class="ledger-detail-cell-label">本笔 = min(两方剩余)</th>
      <td colspan="2"><b>${money(transfer.amountCents)}</b></td>
    </tr>`;

    /* ③ 抵消链路：经由中间人时把链上的原始欠条逐段列出 */
    const isChained = Boolean(chain && chain.path.length >= 2);
    const chainTable = isChained
      ? renderTable(
        ["#", "欠钱的人", "收钱的人", "欠条金额", "来源账单"],
        chain.path.map((edge, step) => [
          String(step + 1),
          nameOf(travelerById(edge.fromId)),
          nameOf(travelerById(edge.toId)),
          `<b>${money(edge.amountCents)}</b>`,
          itemsOf(edge.items)
        ]),
        `<tr>
          <th scope="row" class="ledger-detail-cell-label">合并结果</th>
          <td colspan="4">${nameOf(from)} 直接转 ${nameOf(to)} <b>${money(transfer.amountCents)}</b>，少转 ${chain.path.length - 1} 笔</td>
        </tr>`
      )
      : "";

    const chainSection = isChained
      ? `
        <div class="ledger-detail-chain">
          ${[nameOf(from), ...chain.path.map((edge) => nameOf(travelerById(edge.toId)))].map((label, step) => `
            ${step === 0 ? "" : `<span class="ledger-detail-chain-arrow">→</span>`}
            <span class="ledger-detail-chain-node">${label}</span>
            ${step === 0 ? "" : `<em>${money(chain.path[step - 1].amountCents)}</em>`}
          `).join("")}
        </div>
        <p class="ledger-detail-note">
          这条链上最小的一段是 <b>${money(chain.bottleneck)}</b>：
          原本要由 ${nameOf(from)} 转给中间人、中间人再转给 ${nameOf(to)}（${chain.path.length} 笔），首尾相接后合并成一笔。
        </p>
        ${chainTable}`
      : `<p class="ledger-detail-note">${nameOf(from)} 与 ${nameOf(to)} 之间没有经由中间人的欠条链路，这笔是按两人的净额直接撮合出来的。</p>`;

    const directSection = directEdge
      ? renderTable(
        ["关系", "金额", "来源账单", "说明"],
        [[
          `${nameOf(from)} → ${nameOf(to)}`,
          `<b>${money(directEdge.amountCents)}</b>`,
          itemsOf(directEdge.items),
          isChained
            ? "两人之间的直接欠条，已并入本笔"
            : (directEdge.amountCents === transfer.amountCents ? "本笔就是按这条欠条转账" : `本笔是这条欠条的一部分`)
        ]]
      )
      : "";

    /* ④ 双方各自的全部欠条（已按同一对人互相抵消） */
    const personTable = (personId) => {
      const out = edges.filter((edge) => edge.fromId === personId);
      const incoming = edges.filter((edge) => edge.toId === personId);
      const outTotal = out.reduce((sum, edge) => sum + edge.amountCents, 0);
      const inTotal = incoming.reduce((sum, edge) => sum + edge.amountCents, 0);
      const rows = [
        ...out.map((edge) => [
          nameOf(travelerById(edge.toId)),
          `<span class="is-out">应付</span>`,
          `<b>${money(edge.amountCents)}</b>`,
          edge.offsetCents ? `已抵消反向 ${money(edge.offsetCents)}` : "—",
          itemsOf(edge.items)
        ]),
        ...incoming.map((edge) => [
          nameOf(travelerById(edge.fromId)),
          `<span class="is-in">应收</span>`,
          `<b>${money(edge.amountCents)}</b>`,
          edge.offsetCents ? `已抵消反向 ${money(edge.offsetCents)}` : "—",
          itemsOf(edge.items)
        ])
      ];
      return renderTable(
        ["对象", "方向", "金额", "已抵消", "来源账单"],
        rows,
        `<tr>
          <th scope="row" class="ledger-detail-cell-label">小计</th>
          <td colspan="4">应收 ${money(inTotal)} − 应付 ${money(outTotal)} = 净额 <b>${money(inTotal - outTotal)}</b></td>
        </tr>`
      );
    };

    /* ⑤ 总账核对 */
    const totalTransfers = stats.transfers.reduce((sum, entry) => sum + entry.amountCents, 0);
    const paidTotal = stats.members.reduce((sum, member) => sum + member.paidCents, 0);
    const owedTotal = stats.members.reduce((sum, member) => sum + member.owedCents, 0);

    return `
      <section class="ledger-detail-section">
        <h3>① 两人的净额</h3>
        ${renderTable(["成员", "实付", "应分摊", "净额"], netRows)}
        <p class="ledger-detail-note">分摊 = 每笔账单按参与人数平分（余数分给靠前的人，每人最多差 1 分）。</p>
      </section>

      <section class="ledger-detail-section">
        <h3>② 本笔金额怎么取</h3>
        ${renderTable(["", nameOf(from), nameOf(to)], matchRows, matchFoot)}
        <p class="ledger-detail-note">结账排队时取两方剩余的较小值；本笔之后没结清的部分由后面的转账补齐。</p>
      </section>

      <section class="ledger-detail-section">
        <h3>③ 抵消链路</h3>
        ${chainSection}
        ${directSection}
      </section>

      <section class="ledger-detail-section">
        <h3>④ ${nameOf(from)} 的欠条（抵消后）</h3>
        ${personTable(transfer.fromId)}
        <h3 class="ledger-detail-subheading">${nameOf(to)} 的欠条（抵消后）</h3>
        ${personTable(transfer.toId)}
      </section>

      <section class="ledger-detail-section">
        <h3>⑤ 总账核对</h3>
        ${renderTable(["项目", "金额"], [
          ["总支出", money(stats.totalCents)],
          ["实付合计", money(paidTotal)],
          ["分摊合计", money(owedTotal)],
          ["转账合计", `${money(totalTransfers)}（${stats.transfers.length} 笔）`]
        ])}
        <p class="ledger-detail-note">实付合计 = 分摊合计 = 总支出，转账合计 = 所有「应付」之和，说明账目配平。</p>
      </section>`;
  }

  /* 放大查看：把同一份表格放进弹窗，方便在小屏上完整核对。 */
  function showTransferDetail(index) {
    const stats = calculateStats();
    const transfer = stats.transfers[index];
    if (!transfer) return;
    const baseCurrency = ledgerData.settings.baseCurrency;
    const from = travelerById(transfer.fromId);
    const to = travelerById(transfer.toId);
    const nameOf = (person) => escapeHtml(person?.name || "已移除");
    return settleDialog(mountDialog({
      className: "ledger-detail-dialog",
      ariaLabel: "转账计算明细",
      innerHTML: `<div class="ledger-detail-card">
        <div class="ledger-detail-head">
          <div class="ledger-detail-people">
            ${renderAvatar(from)}<span class="ledger-detail-arrow" aria-hidden="true">→</span>${renderAvatar(to)}
          </div>
          <p class="ledger-detail-title">${nameOf(from)} 转给 ${nameOf(to)} <b>${escapeHtml(formatMoney(transfer.amountCents, baseCurrency))}</b></p>
          <p class="ledger-detail-sub">第 ${index + 1} 笔 · 共 ${stats.transfers.length} 笔转账</p>
        </div>
        ${transferDetailTables(index)}
        <div class="ledger-detail-actions">
          <button type="button" data-ledger-confirm="cancel">知道了</button>
        </div>
      </div>`
    }));
  }

  /* 结算页就地展开 / 收起某一笔转账的计算表格。 */
  function toggleTransferDetail(index) {
    const wasOpen = expandedTransfers.has(index);
    if (wasOpen) expandedTransfers.delete(index);
    else expandedTransfers.add(index);
    renderApp();
    if (!wasOpen) {
      requestAnimationFrame(() => {
        const panel = ledgerRoot?.querySelector(`#ledger-transfer-detail-${index}`);
        if (panel && typeof panel.scrollIntoView === "function") {
          panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      });
    }
  }

  async function deleteMember(id) {
    const traveler = travelerById(id);
    if (!traveler) return;
    const referenced = ledgerData.bills.some((bill) => (
      bill.payerId === id || bill.participantIds.includes(id)
    ));
    if (referenced) {
      setNotice(`${traveler.name}已有相关账单，需先处理这些账单后才能删除。`);
      return;
    }
    if (!await confirmLedgerAction(`删除同行人“${traveler.name}”？`)) return;
    captureBillDraft();
    if (billDraft) {
      billDraft.participantIds = billDraft.participantIds.filter((memberId) => memberId !== id);
      if (billDraft.payerId === id) billDraft.payerId = "";
    }
    editingMemberId = null;
    openDialogName = "members";
    await mutateData((next) => {
      next.travelers = next.travelers.filter((entry) => entry.id !== id);
    }, { reason: "member-deleted", message: `${traveler.name}已移除` });
  }

  async function deleteBill(id) {
    const bill = ledgerData.bills.find((entry) => entry.id === id);
    if (!bill || !await confirmLedgerAction("删除这笔账单？")) return;
    if (editingNoteBillId === id) editingNoteBillId = null;
    await mutateData((next) => {
      next.bills = next.bills.filter((entry) => entry.id !== id);
    }, { reason: "bill-deleted", message: "账单已删除" });
  }

  async function removeCommonCurrency(code) {
    if (!ledgerData.settings.commonCurrencies.includes(code)) return;
    captureBillDraft();
    openDialogName = "settings";
    await mutateData((next) => {
      next.settings.commonCurrencies = next.settings.commonCurrencies.filter((item) => item !== code);
      if (next.settings.lastCurrency === code) next.settings.lastCurrency = next.settings.baseCurrency;
    }, { reason: "currency-removed", message: `${currencyByCode(code).nameZh}已移除` });
  }

  async function chooseCurrency(code) {
    if (!CURRENCY_BY_CODE.has(code)) return;
    captureBillDraft();
    if (currencyPickerMode === "base") {
      if (ledgerData.bills.length) {
        setNotice("已有账单，本位币不能再修改。");
        return;
      }
      openDialogName = "settings";
      await mutateData((next) => {
        next.settings.baseCurrency = code;
        next.settings.commonCurrencies = next.settings.commonCurrencies.filter((item) => item !== code);
        next.settings.lastCurrency = code;
      }, { reason: "base-currency-changed", message: `本位币已设为${currencyByCode(code).nameZh}` });
      return;
    }

    const selected = ledgerData.settings.commonCurrencies.includes(code);
    openDialogName = "currency";
    await mutateData((next) => {
      next.settings.commonCurrencies = selected
        ? next.settings.commonCurrencies.filter((item) => item !== code)
        : [...next.settings.commonCurrencies, code];
      if (selected && next.settings.lastCurrency === code) next.settings.lastCurrency = next.settings.baseCurrency;
    }, {
      reason: selected ? "currency-removed" : "currency-added",
      message: selected ? `${currencyByCode(code).nameZh}已移除` : `${currencyByCode(code).nameZh}已加入常用外币`
    });
  }

  function editBill(id) {
    if (!ledgerData.bills.some((bill) => bill.id === id)) return;
    if (editingBillId && editingBillId !== id) {
      setNotice("请先保存或取消正在编辑的账单。");
      ledgerRoot.querySelector('[data-ledger-form="bill"] [data-ledger-field="original-amount"]')?.focus({ preventScroll: true });
      return;
    }
    captureBillDraft();
    editingBillId = id;
    activeTab = "entry";
    notice = "";
    renderApp();
    requestAnimationFrame(() => {
      ledgerRoot.querySelector(".ledger-entry-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      ledgerRoot.querySelector('[data-ledger-field="original-amount"]')?.focus({ preventScroll: true });
    });
  }

  function handleAction(button) {
    const action = button.dataset.ledgerAction;
    if (!action) return;
    if (action === "set-tab") {
      captureBillDraft();
      setActiveTab(button.dataset.ledgerTab);
    } else if (action === "open-members") {
      captureBillDraft();
      showDialog("members");
    } else if (action === "open-settings") {
      captureBillDraft();
      showDialog("settings");
    } else if (action === "edit-member") {
      captureBillDraft();
      editingMemberId = button.dataset.ledgerId || null;
      openDialogName = "members";
      renderApp();
      requestAnimationFrame(() => ledgerRoot.querySelector('[data-ledger-form="member-edit"] input[name="name"]')?.focus());
    } else if (action === "close-dialog") {
      closeDialog(button.closest("dialog"));
    } else if (action === "back-to-settings") {
      closeDialog(button.closest("dialog"));
      showDialog("settings");
    } else if (action === "pick-base-currency") {
      updateCurrencyDialog("base");
    } else if (action === "pick-common-currency") {
      updateCurrencyDialog("common");
    } else if (action === "choose-bill-currency") {
      chooseBillCurrency(button);
    } else if (action === "choose-currency") {
      chooseCurrency(button.dataset.ledgerCode || "");
    } else if (action === "remove-common-currency") {
      removeCommonCurrency(button.dataset.ledgerCode || "");
    } else if (action === "delete-member") {
      deleteMember(button.dataset.ledgerId || "");
    } else if (action === "edit-bill") {
      editBill(button.dataset.ledgerId || "");
    } else if (action === "delete-bill") {
      deleteBill(button.dataset.ledgerId || "");
    } else if (action === "edit-bill-note") {
      void openBillNoteEditor(button.dataset.ledgerId || "");
    } else if (action === "cancel-note-edit") {
      cancelBillNoteEditor();
    } else if (action === "cancel-edit") {
      editingBillId = null;
      renderApp();
    } else if (action === "explain-transfer") {
      toggleTransferDetail(Number(button.dataset.ledgerIndex || 0));
    } else if (action === "zoom-transfer") {
      showTransferDetail(Number(button.dataset.ledgerIndex || 0));
    } else if (action === "select-all-participants") {
      const form = button.closest("form");
      const inputs = [...form.querySelectorAll('input[name="participantIds"]')];
      const shouldSelectAll = inputs.some((input) => !input.checked);
      inputs.forEach((input) => { input.checked = shouldSelectAll; });
      captureBillDraft();
      syncSplitSummary();
    }
  }

  async function handleRootClick(event) {
    const button = event.target.closest("[data-ledger-action]");
    if (!button || !ledgerRoot.contains(button)) return;
    event.preventDefault();
    const action = button.dataset.ledgerAction;
    const insideNoteForm = button.closest('[data-ledger-form="bill-note"]');
    if (editingNoteBillId
      && !insideNoteForm
      && action !== "edit-bill-note"
      && action !== "cancel-note-edit"
      && !(await flushActiveBillNote())) return;
    handleAction(button);
  }

  function handleRootInput(event) {
    if (event.target.matches("[data-ledger-currency-search]")) {
      currencyQuery = event.target.value;
      const results = ledgerRoot.querySelector("[data-ledger-currency-results]");
      if (results) results.innerHTML = renderCurrencyResultsMarkup();
      return;
    }
    const memberForm = event.target.closest('[data-ledger-form="member-add"]');
    if (memberForm) syncMemberPreview(memberForm);
    if (event.target.closest('[data-ledger-form="bill"]')) {
      if (event.target.matches('[data-ledger-field="original-amount"]')) {
        baseAmountTouched = false;              // 改了原币金额 → 折合金额重新自动换算
        syncConvertedAmount(event.target.closest("form"));
      }
      if (event.target.matches('[data-ledger-field="base-amount"]')) {
        baseAmountTouched = true;               // 手改过折合金额 → 尊重用户输入
      }
      captureBillDraft();
      syncSplitSummary();
    }
  }

  function handleRootChange(event) {
    if (event.target.matches('[data-ledger-field="currency"]')) syncCurrencyField(event.target);
    if (event.target.closest('[data-ledger-form="bill"]')) {
      captureBillDraft();
      syncSplitSummary();
    }
  }

  async function handleRootSubmit(event) {
    const form = event.target.closest("form[data-ledger-form]");
    if (!form || !ledgerRoot.contains(form)) return;
    event.preventDefault();
    if (form.dataset.ledgerForm === "bill-note") {
      await submitBillNote(form);
      return;
    }
    if (editingNoteBillId && !(await flushActiveBillNote())) return;
    if (form.dataset.ledgerForm === "bill") await submitBill(form);
    if (form.dataset.ledgerForm === "member-add") await submitMemberAdd(form);
    if (form.dataset.ledgerForm === "member-edit") await submitMemberEdit(form);
  }

  function handleRootKeydown(event) {
    if (event.key === "Escape" && event.target.closest('[data-ledger-form="bill-note"]')) {
      event.preventDefault();
      cancelBillNoteEditor();
      return;
    }
    if (!event.target.matches('[role="tab"]') || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const nextTab = event.target.dataset.ledgerTab === "entry" ? "stats" : "entry";
    setActiveTab(nextTab);
    requestAnimationFrame(() => ledgerRoot.querySelector(`[data-ledger-tab="${nextTab}"]`)?.focus());
  }

  function setActiveTab(tab, options = {}) {
    const nextTab = tab === "stats" ? "stats" : "entry";
    if (editingNoteBillId && !options.skipNoteFlush) {
      void flushActiveBillNote().then((saved) => {
        if (saved) setActiveTab(nextTab, { ...options, skipNoteFlush: true });
      });
      return;
    }
    const changed = activeTab !== nextTab;
    if (changed) captureBillDraft();
    activeTab = nextTab;
    if (ledgerData && (changed || options.forceRender)) renderApp();
    if (options.updateHash !== false && changed) {
      window.dispatchEvent(new CustomEvent("travel-ledger:navigate", { detail: { tab: nextTab } }));
    }
  }

  async function init(options = {}) {
    const requestedRoot = typeof options.root === "string"
      ? document.querySelector(options.root)
      : options.root || document.querySelector("#ledger-root");
    if (!requestedRoot) return null;
    if (initialized && requestedRoot === ledgerRoot) return deepClone(ledgerData);

    ledgerRoot = requestedRoot;
    ledgerRoot.setAttribute("aria-busy", "true");
    const [resolvedTripId, tripConfig] = await Promise.all([
      resolveTripId(ledgerRoot, options),
      resolveTripConfig(ledgerRoot, options)
    ]);
    ledgerTripId = resolvedTripId;
    const persistence = resolvePersistence(ledgerRoot, options, tripConfig);
    ledgerAdapter = options.repository || options.adapter || (persistence.mode === "d1"
      ? createD1Adapter(ledgerTripId, persistence.d1Options)
      : createLocalStorageAdapter(ledgerTripId, persistence.localOptions));
    ledgerPersistenceMode = options.repository || options.adapter
      ? String(ledgerAdapter.mode || "custom")
      : persistence.mode;
    let stored = null;
    try {
      stored = await Promise.resolve(ledgerAdapter.load({ tripId: ledgerTripId }));
    } catch (error) {
      console.error("TravelLedger could not load data", error);
      notice = ledgerPersistenceMode === "d1"
        ? "共享账本暂时无法读取，请检查你的 Cloudflare D1 配置。"
        : "本地账本暂时无法读取，已打开一份空账本。";
    }
    ledgerData = normalizeData(stored);
    activeTab = location.hash === "#ledger-stats" ? "stats" : "entry";
    ledgerRoot.addEventListener("click", handleRootClick);
    ledgerRoot.addEventListener("input", handleRootInput);
    ledgerRoot.addEventListener("change", handleRootChange);
    ledgerRoot.addEventListener("submit", handleRootSubmit);
    ledgerRoot.addEventListener("keydown", handleRootKeydown);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    initialized = true;
    renderApp();
    ledgerRoot.removeAttribute("aria-busy");
    return deepClone(ledgerData);
  }

  const publicApi = {
    init,
    setActiveTab,
    createLocalStorageAdapter,
    createD1Adapter,
    getPersistenceMode() {
      return ledgerPersistenceMode;
    },
    getSnapshot() {
      return ledgerData ? deepClone(ledgerData) : null;
    }
  };
  if (typeof module === "object" && module.exports) module.exports = publicApi;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window.TravelLedger = publicApi;

  // The page controller initializes Ledger only when the module is enabled.
  // Standalone consumers can continue to call TravelLedger.init(options) explicitly.
})();
