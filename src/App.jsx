import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";

// 网站的实际内容（文字、图片）不再直接打包进这个 JS 文件里了——之前图片全是以数据的形式
// 直接写在 content.js 里，作品一多这个文件会涨到十几 MB，手机打开的时候要先把这么大一个文件
// 下载解析完才能看到页面，很容易卡死在白屏/转圈。现在改成打开网页之后单独去请求
// public/content.json 这份数据（见下面的 App 组件），核心代码本身能秒开，内容异步加载进来，
// 手机端体验会好很多。这两个变量在数据加载完成之前是空的，Portfolio 组件要等加载完了才会挂载。
let DEFAULT_TYPOGRAPHY = {};
let DEFAULT_DATA = {};

const SIDEBAR_MIN_WIDTH = 260; // 左栏最小宽度（像素）

const FONT_WEIGHT_OPTIONS = [
  { weight: 100, label: "Thin" },
  { weight: 200, label: "Extra Light" },
  { weight: 300, label: "Light" },
  { weight: 400, label: "Regular" },
  { weight: 500, label: "Medium" },
  { weight: 600, label: "SemiBold" },
  { weight: 700, label: "Bold" },
];

const FONT_CATEGORIES = [
  { key: "sans-serif", label: "Sans Serif" },
  { key: "serif", label: "Serif" },
];

// 拼出 Google Fonts css2 接口需要的查询片段，hasItalic 为 true 时会连真正的斜体字重一起请求
function buildGoogleFontQuery(familyParam, weights, hasItalic) {
  if (!hasItalic) {
    return `${familyParam}:wght@${weights.join(";")}`;
  }
  const normalPart = weights.map((w) => `0,${w}`).join(";");
  const italicPart = weights.map((w) => `1,${w}`).join(";");
  return `${familyParam}:ital,wght@${normalPart};${italicPart}`;
}

const SANS_WEIGHTS = FONT_WEIGHT_OPTIONS.map((w) => w.weight);

// 根据字体是否有真实的宽度轴（wdth），算出应该用哪种方式让"字宽"生效：
// - 有真实轴：数值落在轴的范围内就直接用 font-variation-settings；
//   低于轴能到的最小值时，轴保持在它的下限，剩下的差距用横向缩放（transform: scaleX）代码模拟接上，
//   这样滑块从 100 拉到 50 全程都有连续的视觉变化。
// - 完全没有真实轴的字体：全程都用横向缩放模拟。
function widthStyleFor(preset, widthValue) {
  const value = widthValue ?? preset.widthRange?.default ?? 100;
  const realMin = preset.realWidthMin;

  if (realMin != null) {
    const axisValue = Math.max(realMin, value);
    const extraScale = value < realMin ? value / realMin : 1;
    return {
      fontVariationSettings: `"wdth" ${axisValue}`,
      transform: extraScale !== 1 ? `scaleX(${extraScale})` : undefined,
      transformOrigin: extraScale !== 1 ? "left" : undefined,
    };
  }

  const scale = value / 100;
  return {
    transform: scale !== 1 ? `scaleX(${scale})` : undefined,
    transformOrigin: scale !== 1 ? "left" : undefined,
  };
}

const FONT_PRESETS = [
  {
    id: "ibm-plex-sans",
    label: "IBM Plex Sans",
    category: "sans-serif",
    family: "'IBM Plex Sans', -apple-system, Arial, 'PingFang SC', sans-serif",
    italic: false,
    googleFont: buildGoogleFontQuery("IBM+Plex+Sans", SANS_WEIGHTS, true),
    weights: FONT_WEIGHT_OPTIONS,
    // 这款字体在 Google Fonts 上没有真正的宽度轴，字宽用代码模拟（横向缩放）实现
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    category: "sans-serif",
    family: "'DM Sans', -apple-system, Arial, 'PingFang SC', sans-serif",
    italic: false,
    googleFont: buildGoogleFontQuery("DM+Sans", SANS_WEIGHTS, true),
    weights: FONT_WEIGHT_OPTIONS,
    // 同样没有真正的宽度轴，靠代码模拟
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "bricolage-grotesque",
    label: "Bricolage Grotesque",
    category: "sans-serif",
    family: "'Bricolage Grotesque', -apple-system, Arial, 'PingFang SC', sans-serif",
    italic: false,
    // 用 range 语法（12..96、200..800）请求，Google Fonts 才会返回真正的可变字体文件，
    // 这样字体本身内置的 wdth（宽度）轴才保得住，可以用 font-variation-settings 调用
    googleFont: "Bricolage+Grotesque:opsz,wght@12..96,200..800",
    weights: FONT_WEIGHT_OPTIONS,
    // Bricolage Grotesque 真实的宽度轴只到 75%，低于 75 的部分用代码模拟缩放继续往下走，
    // 保证滑块从 50 到 100 都有连续的视觉效果
    widthRange: { min: 50, max: 100, default: 100 },
    realWidthMin: 75,
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    category: "sans-serif",
    family: "'Space Grotesk', -apple-system, Arial, 'PingFang SC', sans-serif",
    italic: false,
    // Space Grotesk 同样没有真正的斜体字形
    googleFont: buildGoogleFontQuery("Space+Grotesk", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    // 没有真正的宽度轴，靠代码模拟
    widthRange: { min: 50, max: 100, default: 100 },
  },
  // 思源黑体系列（Google Fonts 上叫 Noto Sans SC/TC/JP），中日韩字体一般没有真正的斜体字形
  {
    id: "source-han-sans-sc",
    label: "思源黑体",
    category: "sans-serif",
    family: "'Noto Sans SC', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Sans+SC", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "source-han-sans-tc",
    label: "思源黑體",
    category: "sans-serif",
    family: "'Noto Sans TC', -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Sans+TC", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "source-han-sans-jp",
    label: "源ノ角ゴシック",
    category: "sans-serif",
    family: "'Noto Sans JP', -apple-system, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Sans+JP", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
  // 思源宋体系列（Google Fonts 上叫 Noto Serif SC/TC/JP）
  {
    id: "source-han-serif-sc",
    label: "思源宋体",
    category: "serif",
    family: "'Noto Serif SC', 'Songti SC', 'SimSun', serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Serif+SC", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "source-han-serif-tc",
    label: "思源宋體",
    category: "serif",
    family: "'Noto Serif TC', 'Songti TC', 'PMingLiU', serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Serif+TC", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
  {
    id: "source-han-serif-jp",
    label: "源ノ明朝",
    category: "serif",
    family: "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif",
    italic: false,
    googleFont: buildGoogleFontQuery("Noto+Serif+JP", SANS_WEIGHTS, false),
    weights: FONT_WEIGHT_OPTIONS,
    widthRange: { min: 50, max: 100, default: 100 },
  },
];

// 可以分别调整字体样式/字号/行距的 5 个元素
const TYPOGRAPHY_TARGETS = [
  { key: "artistName", label: "姓名" },
  { key: "year", label: "年份（左侧列表）" },
  { key: "workTitle", label: "作品名称（左侧列表）" },
  { key: "detailTitle", label: "详情页标题" },
  { key: "detailMaterials", label: "详情页材料" },
  { key: "detailDimensions", label: "详情页尺寸 / 年份" },
  { key: "infoTitle", label: "CV 页段落标题" },
  { key: "infoBodyInfo", label: "CV 页详细内容 · 信息类" },
  { key: "infoBodyExhibition", label: "CV 页详细内容 · 展览类" },
  { key: "infoExhibitionName", label: "CV 页详细内容 · 展览名称", mobileOnly: true },
  { key: "infoExhibitionLocation", label: "CV 页详细内容 · 展览地点", mobileOnly: true },
  { key: "footerLinks", label: "CV / Email / Instagram / RedNote" },
];

// 不再需要 STORAGE_KEY —— 内容改动只存在浏览器内存里，靠"导出内容"按钮导出成 content.json

// 把上传的图片压缩到合理大小，避免存储超限
function resizeImageToDataUrl(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 阿拉伯数字转罗马数字，用于系列作品自动编号（Good Medicine Tastes Bitter I, II, III...）
function toRoman(num) {
  const table = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let result = "";
  for (const [value, symbol] of table) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

// 把同一年份下的作品按 series 字段分组：
// 没有 series 的作品原样保留为单个条目；有相同 series 的作品合并成一个可折叠的分组，
// 分组的位置取该系列第一件作品在原数组中的位置，内部顺序保持原数组顺序。
function groupWorksBySeries(works) {
  const groups = [];
  const seriesIndex = new Map();
  works.forEach((w) => {
    if (w.series) {
      if (!seriesIndex.has(w.series)) {
        const group = { type: "series", series: w.series, works: [] };
        seriesIndex.set(w.series, group);
        groups.push(group);
      }
      seriesIndex.get(w.series).works.push(w);
    } else {
      groups.push({ type: "single", work: w });
    }
  });
  return groups;
}

// 把 list[fromIndex] 移动到 toIndex 的位置，其余元素顺次让位（拖拽重排用）
function reorderList(list, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

// 电脑端侧栏图标：悬停时用从中心扩张的圆形，揭示对应的反白版本图标。
function HoverRevealIcon({ src, hoverSrc }) {
  return (
    <span className="relative block h-8 w-8" aria-hidden="true">
      <img src={src} alt="" className="block h-full w-full" />
      <span className="sidebar-icon-hover-reveal absolute inset-0 pointer-events-none">
        <img src={hoverSrc} alt="" className="block h-full w-full" />
      </span>
    </span>
  );
}

function CircleRevealArrowButton({ direction, onClick, ariaLabel, title, className = "relative", style }) {
  const points = direction === "up" ? "18 15 12 9 6 15" : "15 18 9 12 15 6";
  const strokeWidth = direction === "up" ? "2.5" : "3";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`group flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-black bg-white text-black ${className}`}
      style={style}
    >
      <svg
        className="relative z-10"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points={points} />
      </svg>
      <span className="sidebar-icon-hover-reveal absolute inset-0 z-20 flex items-center justify-center bg-black text-white pointer-events-none">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points={points} />
        </svg>
      </span>
    </button>
  );
}

function Portfolio() {
  const [data, setData] = useState(DEFAULT_DATA); // 直接用 content.json 里的内容做初始值，内存里编辑
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 兼容旧数据：老版本的展览类段落，年份和展览名称是混在同一行文字里、靠空格拆开的
  // （不靠谱，比如名称本身带空格就容易拆错）。现在改成年份、名称是真正分开存的两个字段，
  // 这里做一次性自动迁移——老段落一加载就转换成新结构，不用重新编辑。
  useEffect(() => {
    setData((prev) => {
      const sections = prev.infoSections || [];
      const needsMigration = sections.some((s) => s.category === "exhibition" && !s.entries);
      if (!needsMigration) return prev;
      return {
        ...prev,
        infoSections: sections.map((s) => {
          if (s.category !== "exhibition" || s.entries) return s;
          const html = ensureHtmlBody(s.body);
          const entries = html
            .split(/<br\s*\/?>/i)
            .filter((line) => line.replace(/<[^>]+>/g, "").trim() !== "")
            .map((line) => {
              const { yearHtml, nameHtml } = splitLeadingToken(line);
              return { id: uid(), year: yearHtml.replace(/<[^>]+>/g, ""), name: nameHtml };
            });
          const { body, ...rest } = s;
          return { ...rest, entries };
        }),
      };
    });
  }, []);

  const [hasUnexportedChanges, setHasUnexportedChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [translationRegeneration, setTranslationRegeneration] = useState(null);
  const [translationMenuOpen, setTranslationMenuOpen] = useState(false);
  const translationMenuRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [navDirection, setNavDirection] = useState(null); // 'prev' | 'next' | null，只有点详情页的Previous/Next才会设置

  // ?edit=1 只会打开登录入口；编辑工具与翻译接口都要通过服务器端密码验证后才可使用。
  const [editRequested] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("edit") === "1";
  });
  // Vite 本机开发时不经过 Vercel 的服务器接口，允许 localhost 直接进入编辑模式；
  // 这个判断会在正式构建时被移除，线上域名始终需要密码登录。
  const isLocalDevelopment =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [editorAuth, setEditorAuth] = useState({ checking: editRequested, authenticated: false });
  const [editorPassword, setEditorPassword] = useState("");
  const [editorLoginError, setEditorLoginError] = useState("");
  useEffect(() => {
    if (!editRequested) return undefined;
    let cancelled = false;
    fetch("/api/editor-auth", { credentials: "same-origin" })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!cancelled) setEditorAuth({ checking: false, authenticated: response.ok && body.authenticated === true });
      })
      .catch(() => {
        if (!cancelled) setEditorAuth({ checking: false, authenticated: false });
      });
    return () => { cancelled = true; };
  }, [editRequested]);
  const submitEditorLogin = async (event) => {
    event.preventDefault();
    setEditorLoginError("");
    try {
      const response = await fetch("/api/editor-auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: editorPassword }),
      });
      if (!response.ok) throw new Error("Incorrect password");
      setEditorPassword("");
      setEditorAuth({ checking: false, authenticated: true });
    } catch {
      setEditorLoginError("密码不正确，或编辑保护尚未配置。");
    }
  };
  const canEdit = editRequested && (isLocalDevelopment || editorAuth.authenticated);

  // ---------- 语言切换：八种语言，首次访问始终默认英文 ----------
  // 第一次打开网站（浏览器里还没存过语言）默认显示英文；之后每次切换语言都会记到 localStorage 里，
  // 下次重新打开网站时会自动恢复成上次看的那个语言，不用每次都重新选。
  const LANGUAGE_OPTIONS = [
    { code: "en", label: "EN", name: "English" },
    { code: "zh", label: "简", name: "简体中文" },
    { code: "zhHant", label: "繁", name: "繁體中文" },
    { code: "de", label: "DE", name: "Deutsch" },
    { code: "es", label: "ES", name: "Español" },
    { code: "fr", label: "FR", name: "Français" },
    { code: "it", label: "IT", name: "Italiano" },
    { code: "ja", label: "日", name: "日本語" },
  ];
  const LANGUAGE_STORAGE_KEY = "portfolio-site:language";
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const validCodes = LANGUAGE_OPTIONS.map((l) => l.code);
    return validCodes.includes(saved) ? saved : "en";
  });
  // 每次语言变化都同步写入 localStorage，下次打开网站时就能读到
  const setLanguage = (code) => {
    setLanguageState(code);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      } catch {
        // 隐私模式等场景下 localStorage 可能不可用，忽略即可，不影响当次浏览
      }
    }
  };
  const isTraditional = language === "zhHant";
  const isZh = language === "zh" || isTraditional;
  const isEs = language === "es";
  const TRANSLATION_TARGETS = {
    de: { suffix: "De", source: "en", sourceLang: "EN", targetLang: "DE", titleCase: false },
    fr: { suffix: "Fr", source: "en", sourceLang: "EN", targetLang: "FR", titleCase: false },
    it: { suffix: "It", source: "en", sourceLang: "EN", targetLang: "IT", titleCase: false },
    es: { suffix: "Es", source: "en", sourceLang: "EN", targetLang: "ES", titleCase: true },
    ja: { suffix: "Ja", source: "zh", sourceLang: "ZH", targetLang: "JA", titleCase: false },
  };
  const TRANSLATION_MENU_OPTIONS = [
    { codes: ["de", "es", "fr", "it", "ja"], label: "全部语言" },
    { codes: ["de"], label: "德语" },
    { codes: ["es"], label: "西班牙语" },
    { codes: ["fr"], label: "法语" },
    { codes: ["it"], label: "意大利语" },
    { codes: ["ja"], label: "日语" },
  ];
  const [traditionalConverter, setTraditionalConverter] = useState(null);
  useEffect(() => {
    if (!isTraditional || traditionalConverter) return undefined;
    let cancelled = false;
    import("opencc-js/cn2t").then(({ default: OpenCC }) => {
      if (!cancelled) setTraditionalConverter(() => OpenCC.Converter({ from: "cn", to: "tw" }));
    });
    return () => {
      cancelled = true;
    };
  }, [isTraditional, traditionalConverter]);
  // 内容字段（标题、材料、尺寸、简介、系列名称）用语言后缀；繁体与简体共用 Zh 源文本。
  const contentLangSuffix = isZh ? "Zh" : TRANSLATION_TARGETS[language]?.suffix || "";
  // 点击语言按钮弹出的下拉菜单是否展开
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [languageMenuClosing, setLanguageMenuClosing] = useState(false);
  const languageMenuRef = useRef(null);
  const languageMenuCloseTimerRef = useRef(null);
  const [hoveredLanguageOption, setHoveredLanguageOption] = useState(null);
  const [exitingLanguageOptions, setExitingLanguageOptions] = useState([]);
  const resetLanguageOptionAnimation = () => {
    setHoveredLanguageOption(null);
    setExitingLanguageOptions([]);
  };
  const closeLanguageMenu = () => {
    if (!languageMenuOpen || languageMenuClosing) return;
    setLanguageMenuClosing(true);
    languageMenuCloseTimerRef.current = window.setTimeout(() => {
      setLanguageMenuOpen(false);
      setLanguageMenuClosing(false);
      resetLanguageOptionAnimation();
      languageMenuCloseTimerRef.current = null;
    }, 300);
  };
  const toggleLanguageMenu = () => {
    if (languageMenuOpen && !languageMenuClosing) {
      closeLanguageMenu();
      return;
    }
    if (languageMenuClosing && languageMenuCloseTimerRef.current) {
      window.clearTimeout(languageMenuCloseTimerRef.current);
      languageMenuCloseTimerRef.current = null;
    }
    resetLanguageOptionAnimation();
    setLanguageMenuClosing(false);
    setLanguageMenuOpen(true);
  };
  // 点击下拉菜单以外的地方（语言按钮本身除外）自动关闭菜单，跟"Aa 文字样式"面板是同一套逻辑
  useEffect(() => {
    if (!languageMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest("[data-language-toggle]")) return;
      if (languageMenuRef.current && !languageMenuRef.current.contains(e.target)) {
        closeLanguageMenu();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [languageMenuOpen]);
  useEffect(() => {
    if (!translationMenuOpen) return undefined;
    const closeMenu = (event) => {
      if (translationMenuRef.current && !translationMenuRef.current.contains(event.target)) {
        setTranslationMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("touchstart", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("touchstart", closeMenu);
    };
  }, [translationMenuOpen]);
  const selectLanguage = (code) => {
    setLanguage(code);
    closeLanguageMenu();
  };
  // 语言按钮上显示的是当前语言（不是切换后的语言）
  const languageButtonLabel = LANGUAGE_OPTIONS.find((l) => l.code === language)?.label || "EN";
  const languageOptionHoverClass = (code) => {
    if (hoveredLanguageOption === code) return "language-menu-option-enter";
    if (exitingLanguageOptions.includes(code)) return "language-menu-option-exit";
    return "";
  };
  // 取某个字段的当前语言版本：日语优先回退到简体中文，其他翻译优先回退英文。
  const tField = (obj, key) => {
    if (!obj) return "";
    const fallback = language === "ja" ? obj[`${key}Zh`] || obj[key] || "" : obj[key] || "";
    const value = contentLangSuffix ? obj[`${key}${contentLangSuffix}`] || fallback : fallback;
    return isTraditional && traditionalConverter && typeof value === "string"
      ? traditionalConverter(value)
      : value;
  };
  const zhText = (value) => (isTraditional && traditionalConverter ? traditionalConverter(value) : value);
  // 编辑模式下，根据当前语言决定这次改动要写回哪个字段（英文原文字段，还是对应的 xxxZh / xxxEs 字段）
  const langKey = (key) => (contentLangSuffix ? `${key}${contentLangSuffix}` : key);

  // ---------- 手机端适配 ----------
  // 屏幕比较窄的时候（大致对应手机/竖屏平板），切换成"顶部栏 + 抽屉式菜单"的移动版布局，
  // 电脑上宽屏还是维持左右两栏。
  const MOBILE_BREAKPOINT = 768;
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  // 编辑模式下可以手动切换"电脑预览 / 手机预览"，这时候不看实际屏幕宽度，直接按手动选的来，
  // 这样在电脑浏览器上也能预览、编辑手机端的样子。为 null 表示没有手动切换过，跟着屏幕宽度走。
  const [editPreviewMode, setEditPreviewMode] = useState(null); // null | 'mobile' | 'desktop'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState({}); // 手机端：年份默认折叠，key 是年份，true 才展开
  const toggleYear = (year) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  // 首次挂载时不要播放抽屉的滑入滑出过渡动画，否则页面刚打开就会看到菜单"一闪而过"
  // （因为元素一开始还没被判定为"关闭状态"，会先按默认位置画一帧，再突然过渡过去）
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (editPreviewMode !== null) {
      setIsMobile(editPreviewMode === "mobile");
      return undefined;
    }
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [editPreviewMode]);

  // ---------- 左栏宽度：直接按内容需要固定下来 ----------
  // 说明二：手风琴展开动画那一层用了 overflow: hidden（配合 grid-template-rows 做高度过渡），
  // 而 overflow:hidden 会把它内部子元素的溢出宽度"挡"在自己这一层，不会再往上传给祖先元素的
  // scrollWidth——所以不能只测量最外层容器的 scrollWidth，得直接测量每一行文字自己
  // （带 data-measure-line 标记）的 scrollWidth，再加上它相对左边缘的偏移量，
  // 这样不管中间隔了多少层 overflow:hidden 都不受影响。
  const sidebarHeaderRef = useRef(null); // 姓名 + 返回图标那一块，固定在顶部不滚动
  const isDraggingSidebarRef = useRef(false); // 正在手动拖拽调整左栏宽度的时候，暂停自动重新测量，避免两边打架闪烁
  const sidebarContentRef = useRef(null);
  const sidebarFooterRef = useRef(null);
  const mainRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);

  // 内容/编辑状态变化的过程中，如果某一帧内容临时变宽（哪怕只有一瞬间），
  // 浏览器可能会把右侧栏的横向滚动位置带偏，而且这个滚动位置不会自己弹回来——
  // 所以每次相关状态变化都强制把横向滚动重置回最左边，保证画廊不会"卡"在偏移的位置。
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollLeft = 0;
    if (sidebarContentRef.current) sidebarContentRef.current.scrollLeft = 0;
  }, [editMode, data, showInfo, selectedId]);

  // 切换到新的一页内容时（选了别的作品、进了信息页、回到画廊），把纵向滚动也重置回顶部，
  // 不然会保留上一屏的滚动位置，新页面看起来像是"从中间开始"的，还得自己往上滑。
  // ——除了一种情况：详情页左侧的"返回"按钮（以及浏览器后退键），要恢复回画廊原来
  // 滚动到的位置，不是回到顶部。
  const galleryScrollRef = useRef(0); // 离开画廊之前，记一下画廊滚动到哪了
  const restoreGalleryScrollRef = useRef(false); // 这次回画廊是不是要恢复位置（点了"返回"/浏览器后退才是true）
  const smoothGalleryScrollToTopRef = useRef(false); // 点姓名回首页时，改用平滑滚回顶部
  // 画面是不是正处在"恢复滚动位置"的过程中——这段时间内容会先隐藏起来，见下面的注释
  const [restoringScroll, setRestoringScroll] = useState(false);

  // ---------- 画廊页"回到顶部"悬浮按钮 ----------
  // 只在画廊页生效：往下滑超过一定距离后出现，点击后平滑滚回顶部（不是硬切）。
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    if (isMobile) return undefined;
    const scrollAreas = [sidebarContentRef.current, mainRef.current].filter(Boolean);
    const timers = new Map();
    const onScroll = (event) => {
      const el = event.currentTarget;
      el.classList.add("desktop-scrollbar-scrolling");
      window.clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => el.classList.remove("desktop-scrollbar-scrolling"), 700));
    };
    scrollAreas.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));
    return () => {
      scrollAreas.forEach((el) => {
        el.removeEventListener("scroll", onScroll);
        window.clearTimeout(timers.get(el));
        el.classList.remove("desktop-scrollbar-scrolling");
      });
    };
  }, [isMobile]);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const BACK_TO_TOP_THRESHOLD = 480; // 大约一屏多一点的距离，滑太浅就出现按钮反而碍事
    const onScroll = () => {
      setShowBackToTop(el.scrollTop > BACK_TO_TOP_THRESHOLD);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // 切换页面（比如从详情页返回）时立刻按当前滚动位置校正一次按钮的显示状态
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedId, showInfo]);
  const scrollGalleryToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  useLayoutEffect(() => {
    if (!mainRef.current) return;
    if (!selectedId && !showInfo && restoreGalleryScrollRef.current) {
      const target = galleryScrollRef.current;
      restoreGalleryScrollRef.current = false;

      // 画廊图片是并发异步加载进来的，谁先加载完全看网络情况，不一定按从上到下的顺序：
      // 可能后面（更靠下）的某几张图片碰巧先加载完，让页面总高度"看起来"已经够滚到目标
      // 位置了；但其实排在更靠上的某张图片其实还没加载完，一旦它稍后加载完成，会把下面
      // 的内容再往下"顶"一截，画面已经显示出来之后又悄悄挪动了一点——这也是一种没处理
      // 干净的跳动，只是比之前那种更轻微、更容易被忽略。
      // 所以判断"是否可以放心显示"，不能只看"总高度是否达标"这一瞬间的快照，还要确认
      // 页面高度已经连续稳定了一小段时间（没有新图片突然加载完撑高页面），才说明这一批
      // 图片基本都尘埃落定了，不会再有后续的位移。
      setRestoringScroll(true);
      mainRef.current.scrollTop = target;

      let rafId = null;
      const startedAt = performance.now();
      const MAX_WAIT_MS = 1800; // 兜底：真等太久（比如图片加载失败）也不能一直不显示内容
      const STABLE_FRAMES_NEEDED = 8; // 高度连续这么多帧都没再变化，才认为图片加载基本稳定了
      let lastHeight = -1;
      let stableFrameCount = 0;
      const trySettle = () => {
        const el = mainRef.current;
        if (!el) {
          setRestoringScroll(false);
          return;
        }
        const currentHeight = el.scrollHeight;
        const maxScrollable = currentHeight - el.clientHeight;
        const heightIsEnough = maxScrollable >= target;
        const timedOut = performance.now() - startedAt > MAX_WAIT_MS;
        el.scrollTop = target;

        if (heightIsEnough && currentHeight === lastHeight) {
          stableFrameCount += 1;
        } else {
          stableFrameCount = 0;
        }
        lastHeight = currentHeight;

        if ((heightIsEnough && stableFrameCount >= STABLE_FRAMES_NEEDED) || timedOut) {
          setRestoringScroll(false);
          return;
        }
        rafId = requestAnimationFrame(trySettle);
      };
      rafId = requestAnimationFrame(trySettle);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    } else if (!selectedId && !showInfo && smoothGalleryScrollToTopRef.current) {
      smoothGalleryScrollToTopRef.current = false;
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      mainRef.current.scrollTop = 0;
    }
  }, [selectedId, showInfo]);

  const recalcSidebarWidth = useCallback(() => {
    // 如果之前手动拖拽调整过宽度、并且保存下来了，就一直用这个手动设置的宽度，不再自动测量
    // （同样限制一下上下限，避免窗口变窄之后手动设置的宽度显得过大）
    if (dataRef.current?.sidebarWidthOverride) {
      const max = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth * 0.6);
      const clamped = Math.round(
        Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, dataRef.current.sidebarWidthOverride))
      );
      setSidebarWidth((prev) => (prev === clamped ? prev : clamped));
      return;
    }

    const headerEl = sidebarHeaderRef.current;
    const contentEl = sidebarContentRef.current;
    const footerEl = sidebarFooterRef.current;
    if (!contentEl) return;

    let contentWidth = 0;
    const measureWithin = (containerEl) => {
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      containerEl.querySelectorAll("[data-measure-line]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const offsetLeft = rect.left - containerRect.left;
        const required = offsetLeft + el.scrollWidth;
        if (required > contentWidth) contentWidth = required;
      });
    };
    measureWithin(headerEl);
    measureWithin(contentEl);
    contentWidth += 64; // 右侧多留一点空间，让左栏整体宽松一些

    const footerWidth = footerEl ? footerEl.scrollWidth : 0;
    // 安全上限：不管测量结果如何，左栏最多不超过窗口宽度的 60%，
    // 防止未来某个元素又出现"撑满容器又被拿来测量"的反馈循环时无限失控变宽
    const safetyMax = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth * 0.6);
    const next = Math.round(
      Math.min(safetyMax, Math.max(SIDEBAR_MIN_WIDTH, contentWidth, footerWidth))
    );
    setSidebarWidth((prev) => (prev === next ? prev : next));
  }, []);

  const goToGallery = () => {
    const alreadyOnGallery = !selectedId && !showInfo;
    if (alreadyOnGallery) {
      // 已经在首页时没有页面切换可触发 useLayoutEffect，直接平滑回到顶部。
      scrollGalleryToTop();
    } else {
      // 从作品详情或 Information 页面回首页时，等画廊渲染出来后再启动平滑滚动。
      smoothGalleryScrollToTopRef.current = true;
    }
    setSelectedId(null);
    setShowInfo(false);
    setMobileMenuOpen(false);
    setNavDirection(null);
    restoreGalleryScrollRef.current = false;
    pushNavState({ selectedId: null, showInfo: false });
  };
  const goToWork = (id, direction = null) => {
    // 如果现在正在画廊页，先记一下画廊滚动到哪了，方便详情页的"返回"按钮能回到这个位置
    if (!selectedId && !showInfo && mainRef.current) {
      galleryScrollRef.current = mainRef.current.scrollTop;
    }
    setShowInfo(false);
    setSelectedId(id);
    setMobileMenuOpen(false);
    setNavDirection(direction);
    pushNavState({ selectedId: id, showInfo: false });
  };
  // 详情页左侧"返回"按钮专用：回到画廊，并恢复到进入详情页之前画廊滚动到的那个位置，
  // 不是统一回到画廊顶部（这个跟点姓名/Index回首页的 goToGallery 是分开的，互不影响）。
  // justRestoredGallery：这次是"返回"触发的，不是第一次进画廊——画廊图片本来有个
  // 从下往上淡入的进场动画，如果每次"返回"都重新播放一遍，一大片图片同时淡入淡出，
  // 看起来就跟闪烁一样，所以这种情况下要让图片跳过这个动画，直接以最终状态显示。
  const [justRestoredGallery, setJustRestoredGallery] = useState(false);
  useEffect(() => {
    if (!justRestoredGallery) return undefined;
    const t = setTimeout(() => setJustRestoredGallery(false), 500);
    return () => clearTimeout(t);
  }, [justRestoredGallery]);
  const goBackToGallery = () => {
    restoreGalleryScrollRef.current = true;
    setJustRestoredGallery(true);
    setSelectedId(null);
    setShowInfo(false);
    setMobileMenuOpen(false);
    setNavDirection(null);
    pushNavState({ selectedId: null, showInfo: false });
  };
  const goToInfo = () => {
    // 如果现在正在画廊页，先记一下画廊滚动到哪了，方便Information页的"返回"按钮能回到这个位置
    if (!selectedId && !showInfo && mainRef.current) {
      galleryScrollRef.current = mainRef.current.scrollTop;
    }
    setSelectedId(null);
    setShowInfo(true);
    setMobileMenuOpen(false);
    setNavDirection(null);
    pushNavState({ selectedId: null, showInfo: true });
  };

  // ---------- 浏览器"后退/前进"支持 ----------
  // 上面几个跳转函数本来只是切换 React 内部状态（selectedId / showInfo），浏览器地址栏、
  // 前进后退键完全不知道页面"跳转"过。这里把每次跳转都记一笔到浏览器历史里（pushNavState），
  // 并监听 popstate 事件：点后退/前进键时，从历史记录里取出当时的页面状态直接恢复，
  // 这样后退键就能像普通网页一样，一步步退回到之前看过的页面。
  const isPopNavRef = useRef(false); // 当前这次状态变化是不是"点了后退/前进"引起的——是的话就不用再重复 push 一次历史
  const pushNavState = (state) => {
    if (isPopNavRef.current || typeof window === "undefined") return;
    window.history.pushState(state, "");
  };
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // 页面刚打开时，把当前状态（首页画廊）记成历史里的第一条，后面每次跳转都在这条基础上往后叠加
    window.history.replaceState({ selectedId: null, showInfo: false }, "");
    const onPopState = (e) => {
      isPopNavRef.current = true;
      const state = e.state || { selectedId: null, showInfo: false };
      if (!state.selectedId && !state.showInfo) {
        // 后退回的是画廊页：跟点"返回"按钮的体验保持一致，恢复到之前画廊滚动到的位置，
        // 而不是简单粗暴地跳回最顶部
        restoreGalleryScrollRef.current = true;
        setJustRestoredGallery(true);
      }
      setSelectedId(state.selectedId || null);
      setShowInfo(!!state.showInfo);
      setMobileMenuOpen(false);
      setNavDirection(null);
      // 状态恢复完成后再把标记复位，避免这次 popstate 引发的 setState 被误判成还需要再 push 一次历史
      requestAnimationFrame(() => {
        isPopNavRef.current = false;
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [typoPanelOpen, setTypoPanelOpen] = useState(false);
  const typoPanelRef = useRef(null);
  // 点击"Aa 文字样式"面板以外的地方（切换按钮本身除外，不然会跟按钮自己的开关逻辑打架）时，自动关闭面板
  useEffect(() => {
    if (!typoPanelOpen) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest("[data-typo-toggle]")) return;
      if (typoPanelRef.current && !typoPanelRef.current.contains(e.target)) {
        setTypoPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [typoPanelOpen]);
  const [openFontId, setOpenFontId] = useState(null); // 当前展开字重下拉的字体 id
  const [activeTypoTarget, setActiveTypoTarget] = useState("workTitle");
  const [expandedSeries, setExpandedSeries] = useState({}); // key: `${year}::${series}` -> boolean
  const [newSeriesForm, setNewSeriesForm] = useState(null); // 当前展开"新建系列"表单的年份，null 表示都不展开
  const [seriesDraft, setSeriesDraft] = useState({ name: "", count: 3 });
  const [customYearFormOpen, setCustomYearFormOpen] = useState(false); // "添加指定年份"这个小表单是否展开
  const [customYearInput, setCustomYearInput] = useState("");

  // ---------- 拖拽调整作品顺序 ----------
  const [dragState, setDragState] = useState(null); // { year, type: 'entry'|'member', seriesName?, index }
  const [dragOverKey, setDragOverKey] = useState(null); // 当前拖到哪一行上方，用于高亮

  const toggleSeries = (key) => {
    setExpandedSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 数据/编辑状态变化后重新量一次（内容变了，最长的那一行可能也变了）。
  // 用 useLayoutEffect 而不是 useEffect，是为了在浏览器画出这一帧之前就把宽度算好、
  // 改好，这样手风琴展开动画播放的时候，宽度已经是对的，不会出现"先窄一下再变宽"的闪烁。
  useLayoutEffect(() => {
    recalcSidebarWidth();
  }, [data, editMode, showInfo, selectedId, expandedSeries, recalcSidebarWidth]);

  // 内容区域自身尺寸变化时（比如字体异步加载完成后文字变宽）也重新量一次，
  // 窗口大小变化时重新量一次 1/4 比例应该是多宽
  useEffect(() => {
    const headerEl = sidebarHeaderRef.current;
    const contentEl = sidebarContentRef.current;
    const footerEl = sidebarFooterRef.current;
    if (!contentEl) return;

    const ro = new ResizeObserver(() => {
      if (!isDraggingSidebarRef.current) recalcSidebarWidth();
    });
    if (headerEl) ro.observe(headerEl);
    ro.observe(contentEl);
    if (footerEl) ro.observe(footerEl);
    window.addEventListener("resize", recalcSidebarWidth);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcSidebarWidth);
    };
  }, [recalcSidebarWidth]);

  // ---------- 修改只存在内存里，标记一下"有改动还没导出" ----------
  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
    setHasUnexportedChanges(true);
  }, []);

  // 把当前内容拆成两个文件导出：
  // 导出内容：把图片从"直接写在文字里"（base64）转换成真正独立的图片文件，跟 content.json
  // 一起打包成一个 zip 下载。这样浏览器打开网站的时候，图片能像正常网站一样并行加载、
  // 用得到的时候才去下载、加载过一次以后还能被浏览器缓存住，比之前那种方式快很多。
  // 已经是文件路径的图片（之前导出过、这次没改动过的）不会重复打包，只打包新增/替换过的。
  const exportContent = useCallback(async () => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");

    const extOf = (dataUrl) => {
      const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
      if (!match) return "jpg";
      const type = match[1].toLowerCase();
      return type === "jpeg" ? "jpg" : type;
    };

    const toFileRef = (value, workId, tag) => {
      if (!value || typeof value !== "string" || !value.startsWith("data:image")) return value;
      const filename = `${workId}-${tag}.${extOf(value)}`;
      imagesFolder.file(filename, value.split(",")[1], { base64: true });
      return `/images/${filename}`;
    };

    const newWorks = data.works.map((w) => ({
      ...w,
      cover: toFileRef(w.cover, w.id, "cover"),
      images: (w.images || []).map((img, i) => toFileRef(img, w.id, `img-${i}`)),
      imagesFull: (w.imagesFull || []).map((img, i) => toFileRef(img, w.id, `full-${i}`)),
    }));
    const newData = { ...data, works: newWorks };

    zip.file("content.json", JSON.stringify({ typography: data.typography, data: newData }, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-content.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setData(newData); // 当前这次编辑也同步换成路径引用，避免下次导出又把同样的图片再打包一遍
    setHasUnexportedChanges(false);
  }, [data]);

  // 重置为最初的示例数据——如果你之前保存过的内容比较旧（比如还没有系列作品分组功能时保存的），
  // 用这个可以清掉旧数据，重新看到最新的默认示例（包含 Good Medicine Tastes Bitter 系列）
  const resetToDefaultData = () => {
    const confirmed = window.confirm(
      "确定要重置吗？这会清空你目前保存的所有内容，恢复成最初的示例数据，无法撤销。"
    );
    if (!confirmed) return;
    updateData(() => DEFAULT_DATA);
    setSelectedId(null);
    setShowInfo(false);
  };

  const updateWork = (id, patch) => {
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
    syncWorkTranslations(id, patch);
  };

  // 翻译请求只从英文或简体中文编辑模式发起；密钥保留在 Vercel 的服务器环境变量中，
  // 浏览器只把需要翻译的文字交给同域的 /api/translate。
  const translationRequestRef = useRef(new Map());
  const translateText = async (value, target, { titleCase = false, html = false } = {}) => {
    if (typeof value !== "string" || !value.trim()) return value;
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value, sourceLang: target.sourceLang, targetLang: target.targetLang, titleCase, html }),
    });
    if (!response.ok) throw new Error("Translation request failed");
    const result = await response.json();
    return typeof result.translation === "string" ? result.translation : value;
  };

  const syncFieldTranslations = (requestBase, value, options, applyTranslation) => {
    Object.entries(TRANSLATION_TARGETS)
      .filter(([, target]) => target.source === language)
      .forEach(([code, target]) => {
        const requestKey = `${requestBase}:${code}`;
        const requestId = Symbol(requestKey);
        translationRequestRef.current.set(requestKey, requestId);
        void translateText(value, target, { ...options, titleCase: !!options.titleCase && target.titleCase })
          .then((translation) => {
            if (translationRequestRef.current.get(requestKey) !== requestId) return;
            applyTranslation(target.suffix, translation);
          })
          .catch(() => {});
      });
  };

  const syncWorkTranslations = (id, patch) => {
    const translatableFields = ["title", "materials", "dimensions", "description"];
    translatableFields.forEach((field) => {
      const sourceField = language === "zh" ? `${field}Zh` : field;
      if (typeof patch[sourceField] !== "string") return;
      const titleCase = field === "title" || field === "materials";
      syncFieldTranslations(`work:${id}:${field}`, patch[sourceField], { titleCase }, (suffix, translation) => {
          updateData((prev) => ({
            ...prev,
            works: prev.works.map((w) =>
              w.id === id ? { ...w, [`${field}${suffix}`]: translation } : w
            ),
          }));
      });
    });
  };

  const syncInfoSectionTranslations = (id, patch) => {
    ["title", "body"].forEach((field) => {
      const sourceField = language === "zh" ? `${field}Zh` : field;
      if (typeof patch[sourceField] !== "string") return;
      syncFieldTranslations(`info-section:${id}:${field}`, patch[sourceField], { html: true }, (suffix, translation) => {
          updateData((prev) => ({
            ...prev,
            infoSections: (prev.infoSections || []).map((section) =>
              section.id === id ? { ...section, [`${field}${suffix}`]: translation } : section
            ),
          }));
      });
    });
  };

  const syncInfoEntryTranslations = (sectionId, entryId, patch) => {
    ["name", "location"].forEach((field) => {
    const sourceField = language === "zh" ? `${field}Zh` : field;
    if (typeof patch[sourceField] !== "string") return;
    syncFieldTranslations(`info-entry:${sectionId}:${entryId}:${field}`, patch[sourceField], { html: true }, (suffix, translation) => {
        updateData((prev) => ({
          ...prev,
          infoSections: (prev.infoSections || []).map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  entries: (section.entries || []).map((entry) =>
                    entry.id === entryId ? { ...entry, [`${field}${suffix}`]: translation } : entry
                  ),
                }
              : section
          ),
        }));
    });
    });
  };

  const updateContact = (patch) => {
    updateData((prev) => ({
      ...prev,
      contact: { ...(prev.contact || {}), ...patch },
    }));
    Object.entries(patch).forEach(([field, value]) => {
      const sourceField = language === "zh" ? field.replace(/Zh$/, "") : field;
      if (!sourceField.endsWith("Label") || typeof value !== "string") return;
      syncFieldTranslations(`contact:${sourceField}`, value, {}, (suffix, translation) => {
          updateData((prev) => ({
            ...prev,
            contact: { ...(prev.contact || {}), [`${sourceField}${suffix}`]: translation },
          }));
      });
    });
  };

  // 清空旧的西班牙语字段后，以英文作为唯一来源重新翻译。翻译完成后仍需照常导出内容，
  // 才会把新生成的内容写回项目里的 content.json。
  const rebuildSpanishFromEnglish = async () => {
    if (spanishRegeneration) return;
    if (!window.confirm("这会删除当前所有西班牙语内容，并根据英文重新翻译。要继续吗？")) return;

    const jobs = [];
    const plainWorkFields = ["title", "materials", "dimensions", "description"];
    const oldData = data;
    (oldData.works || []).forEach((work) => {
      plainWorkFields.forEach((field) => {
        if (typeof work[field] !== "string" || !work[field].trim()) return;
        jobs.push({
          text: work[field],
          titleCase: field === "title" || field === "materials",
          apply: (translation) =>
            updateData((prev) => ({
              ...prev,
              works: prev.works.map((item) =>
                item.id === work.id ? { ...item, [`${field}Es`]: translation } : item
              ),
            })),
        });
      });
    });

    const seenSeries = new Set();
    (oldData.works || []).forEach((work) => {
      if (!work.series || seenSeries.has(work.series)) return;
      seenSeries.add(work.series);
      jobs.push({
        text: work.series,
        titleCase: true,
        apply: (translation) =>
          updateData((prev) => ({
            ...prev,
            works: prev.works.map((item) =>
              item.series === work.series ? { ...item, seriesEs: translation } : item
            ),
          })),
      });
    });

    (oldData.infoSections || []).forEach((section) => {
      ["title", "body"].forEach((field) => {
        if (typeof section[field] !== "string" || !section[field].trim()) return;
        jobs.push({
          text: section[field],
          html: true,
          apply: (translation) =>
            updateData((prev) => ({
              ...prev,
              infoSections: (prev.infoSections || []).map((item) =>
                item.id === section.id ? { ...item, [`${field}Es`]: translation } : item
              ),
            })),
        });
      });
      (section.entries || []).forEach((entry) => {
        if (typeof entry.name !== "string" || !entry.name.trim()) return;
        jobs.push({
          text: entry.name,
          html: true,
          apply: (translation) =>
            updateData((prev) => ({
              ...prev,
              infoSections: (prev.infoSections || []).map((item) =>
                item.id === section.id
                  ? {
                      ...item,
                      entries: (item.entries || []).map((currentEntry) =>
                        currentEntry.id === entry.id ? { ...currentEntry, nameEs: translation } : currentEntry
                      ),
                    }
                  : item
              ),
            })),
        });
      });
    });

    ["informationLabel", "emailLabel", "instagramLabel", "redNoteLabel"].forEach((field) => {
      const value = oldData.contact?.[field];
      if (typeof value !== "string" || !value.trim()) return;
      jobs.push({
        text: value,
        apply: (translation) =>
          updateData((prev) => ({
            ...prev,
            contact: { ...(prev.contact || {}), [`${field}Es`]: translation },
          })),
      });
    });

    // 先彻底删掉旧译文。翻译过程中的空白处会自动回退显示英文，不会显示旧内容。
    translationRequestRef.current.clear();
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((work) => {
        const next = { ...work };
        ["titleEs", "materialsEs", "dimensionsEs", "descriptionEs", "seriesEs"].forEach((key) => delete next[key]);
        return next;
      }),
      infoSections: (prev.infoSections || []).map((section) => {
        const next = { ...section };
        delete next.titleEs;
        delete next.bodyEs;
        if (next.entries) {
          next.entries = next.entries.map((entry) => {
            const nextEntry = { ...entry };
            delete nextEntry.nameEs;
            return nextEntry;
          });
        }
        return next;
      }),
      contact: Object.fromEntries(
        Object.entries(prev.contact || {}).filter(([key]) => !key.endsWith("LabelEs"))
      ),
    }));

    setLanguage("en");
    setSpanishRegeneration({ done: 0, total: jobs.length });
    let done = 0;
    for (const job of jobs) {
      try {
        const translation = await translateToSpanish(job.text, {
          titleCase: !!job.titleCase,
          html: !!job.html,
        });
        job.apply(translation);
      } catch {
        // 单条失败不会中断其余内容；失败字段会保持英文回退，方便稍后再次执行。
      }
      done += 1;
      setSpanishRegeneration({ done, total: jobs.length });
    }
    setSpanishRegeneration(null);
  };

  const rebuildAllTranslations = async (selectedCodes = Object.keys(TRANSLATION_TARGETS)) => {
    if (translationRegeneration) return;
    const targets = Object.entries(TRANSLATION_TARGETS)
      .filter(([code]) => selectedCodes.includes(code))
      .map(([, target]) => target);
    if (targets.length === 0) return;
    if (!window.confirm("这会删除所选语言的现有翻译，并从英文或简体中文重新生成。要继续吗？")) return;

    const sourceValue = (item, field, target) =>
      target.source === "zh" ? item?.[`${field}Zh`] : item?.[field];
    const jobs = [];
    const plainWorkFields = ["title", "materials", "dimensions", "description"];
    const oldData = data;

    targets.forEach((target) => {
      (oldData.works || []).forEach((work) => {
        plainWorkFields.forEach((field) => {
          const text = sourceValue(work, field, target);
          if (typeof text !== "string" || !text.trim()) return;
          jobs.push({
            text,
            target,
            titleCase: field === "title" || field === "materials",
            apply: (translation) => updateData((prev) => ({
              ...prev,
              works: prev.works.map((item) =>
                item.id === work.id ? { ...item, [`${field}${target.suffix}`]: translation } : item
              ),
            })),
          });
        });
      });

      const seenSeries = new Set();
      (oldData.works || []).forEach((work) => {
        const text = sourceValue(work, "series", target);
        const groupKey = target.source === "zh" ? work.series : text;
        if (!text || seenSeries.has(groupKey)) return;
        seenSeries.add(groupKey);
        jobs.push({
          text,
          target,
          titleCase: true,
          apply: (translation) => updateData((prev) => ({
            ...prev,
            works: prev.works.map((item) =>
              item.series === work.series ? { ...item, [`series${target.suffix}`]: translation } : item
            ),
          })),
        });
      });

      (oldData.infoSections || []).forEach((section) => {
        ["title", "body"].forEach((field) => {
          const text = sourceValue(section, field, target);
          if (typeof text !== "string" || !text.trim()) return;
          jobs.push({
            text, target, html: true,
            apply: (translation) => updateData((prev) => ({
              ...prev,
              infoSections: (prev.infoSections || []).map((item) =>
                item.id === section.id ? { ...item, [`${field}${target.suffix}`]: translation } : item
              ),
            })),
          });
        });
        (section.entries || []).forEach((entry) => {
          ["name", "location"].forEach((field) => {
            const text = sourceValue(entry, field, target);
            if (typeof text !== "string" || !text.trim()) return;
            jobs.push({
              text, target, html: true,
              apply: (translation) => updateData((prev) => ({
                ...prev,
                infoSections: (prev.infoSections || []).map((item) => item.id === section.id ? {
                  ...item,
                  entries: (item.entries || []).map((currentEntry) =>
                    currentEntry.id === entry.id ? { ...currentEntry, [`${field}${target.suffix}`]: translation } : currentEntry
                  ),
                } : item),
              })),
            });
          });
        });
      });

      ["informationLabel", "emailLabel", "instagramLabel", "redNoteLabel"].forEach((field) => {
        const text = sourceValue(oldData.contact, field, target);
        if (typeof text !== "string" || !text.trim()) return;
        jobs.push({
          text, target,
          apply: (translation) => updateData((prev) => ({
            ...prev,
            contact: { ...(prev.contact || {}), [`${field}${target.suffix}`]: translation },
          })),
        });
      });
    });

    const suffixes = targets.map((target) => target.suffix);
    translationRequestRef.current.clear();
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((work) => {
        const next = { ...work };
        suffixes.forEach((suffix) => ["title", "materials", "dimensions", "description", "series"].forEach((field) => delete next[`${field}${suffix}`]));
        return next;
      }),
      infoSections: (prev.infoSections || []).map((section) => {
        const next = { ...section };
        suffixes.forEach((suffix) => { delete next[`title${suffix}`]; delete next[`body${suffix}`]; });
        next.entries = (next.entries || []).map((entry) => {
          const nextEntry = { ...entry };
          suffixes.forEach((suffix) => {
            delete nextEntry[`name${suffix}`];
            delete nextEntry[`location${suffix}`];
          });
          return nextEntry;
        });
        return next;
      }),
      contact: Object.fromEntries(Object.entries(prev.contact || {}).filter(([key]) =>
        !suffixes.some((suffix) => key.endsWith(`Label${suffix}`))
      )),
    }));

    setLanguage("en");
    setTranslationRegeneration({ done: 0, total: jobs.length });
    let done = 0;
    for (const job of jobs) {
      try {
        const translation = await translateText(job.text, job.target, {
          titleCase: !!job.titleCase && job.target.titleCase,
          html: !!job.html,
        });
        job.apply(translation);
      } catch {
        // 单条失败不会影响后续翻译；重新执行即可补齐。
      }
      done += 1;
      setTranslationRegeneration({ done, total: jobs.length });
    }
    setTranslationRegeneration(null);
  };

  const updateTypography = (targetKey, patch) => {
    const fieldKey = `typography${isMobile ? "Mobile" : ""}${isZh ? "Zh" : ""}`;
    const deviceBaseKey = isMobile ? "typographyMobile" : "typography";
    updateData((prev) => {
      // 如果这个"设备+语言"组合还没单独调整过，先从同设备的英文版本复制一份出来做起点，
      // 而不是从系统默认值开始（这样调整起来更连贯，不会突然跳回默认大小）
      const basisTypography = prev[deviceBaseKey] || DEFAULT_TYPOGRAPHY;
      const prevTypography = prev[fieldKey] || basisTypography;
      const exhibitionFallback =
        prevTypography.infoBodyExhibition || basisTypography.infoBodyExhibition || DEFAULT_TYPOGRAPHY.infoBodyExhibition;
      const prevTarget = prevTypography[targetKey] || basisTypography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey] || exhibitionFallback;
      return {
        ...prev,
        [fieldKey]: {
          ...prevTypography,
          [targetKey]: { ...prevTarget, ...patch },
        },
      };
    });
  };

  const addWork = (year, position = "top") => {
    const newWork = {
      id: uid(),
      year,
      title: "新作品标题",
      date: new Date().toDateString(),
      description: "点击这里填写作品介绍。",
      cover: "https://picsum.photos/seed/" + uid() + "/700/700",
      images: [],
      tone: "#454545",
    };
    updateData((prev) => {
      if (position === "top") return { ...prev, works: [newWork, ...prev.works] };
      if (position === "bottom") return { ...prev, works: [...prev.works, newWork] };
      // "year-top"：插到这个年份现有作品块的最前面，而不是整个数组的最前面——
      // 不然在一个比较旧的年份里加作品，图片会跑到画廊最前头去，跟这个年份实际的
      //新旧位置对不上。如果这个年份原本还没有任何作品，就退回到整个数组最前面。
      const idx = prev.works.findIndex((w) => w.year === year);
      if (idx === -1) return { ...prev, works: [newWork, ...prev.works] };
      const works = [...prev.works];
      works.splice(idx, 0, newWork);
      return { ...prev, works };
    });
    goToWork(newWork.id);
  };

  // 左侧栏年份/作品是按时间从新到旧、从上到下排列的：
  // "添加新年份/新作品" 在列表最上方插入（比现有最新的年份还新一年）；
  // "添加旧年份/旧作品" 在列表最下方插入（比现有最旧的年份还旧一年）。
  // 右侧栏图片顺序跟着这个数组顺序走，新作品自然排在前面、旧作品排在后面。
  const addYear = () => {
    const existingYears = data.works.map((w) => w.year);
    const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : new Date().getFullYear();
    addWork(nextYear, "top");
  };

  const addOldYear = () => {
    const existingYears = data.works.map((w) => w.year);
    const prevYear = existingYears.length > 0 ? Math.min(...existingYears) - 1 : new Date().getFullYear();
    addWork(prevYear, "bottom");
  };

  // 添加一个指定的年份/作品，自动插入到正确的位置（数组本身是按年份从新到旧排列的）：
  // 如果这个年份已经存在，就插到那个年份块的最前面；如果是全新的年份（比如已经有
  // 2026 和 2024，想插入 2025），就自动找到第一个"比它更旧"的作品，插在那前面，
  // 这样年份还是保持从新到旧排列，2025 会正好卡在 2026 和 2024 中间。
  const addWorkAtYear = (year) => {
    const newWork = {
      id: uid(),
      year,
      title: "新作品标题",
      date: new Date().toDateString(),
      description: "点击这里填写作品介绍。",
      cover: "https://picsum.photos/seed/" + uid() + "/700/700",
      images: [],
      tone: "#454545",
    };
    updateData((prev) => {
      const exactIdx = prev.works.findIndex((w) => w.year === year);
      const works = [...prev.works];
      if (exactIdx !== -1) {
        works.splice(exactIdx, 0, newWork);
        return { ...prev, works };
      }
      const insertIdx = prev.works.findIndex((w) => w.year < year);
      if (insertIdx === -1) works.push(newWork);
      else works.splice(insertIdx, 0, newWork);
      return { ...prev, works };
    });
    goToWork(newWork.id);
  };

  // 编辑年份：把这个年份分组下所有作品的 year 字段一起改成新的年份。
  // 如果改成了一个已经存在的年份，这些作品会自然合并进那个已有的分组。
  const updateYear = (oldYear, rawValue) => {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || rawValue.trim() === "" || parsed === oldYear) return;
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) => (w.year === oldYear ? { ...w, year: parsed } : w)),
    }));
  };

  // 编辑系列名称：把这个系列下所有作品的名称一起改掉。分组用的"系列key"永远认英文名，
  // 中文/西班牙语模式下改的只是 seriesZh / seriesEs（展示用），不会影响分组；英文模式下改的是
  // 真正的 series 字段，这种情况下手风琴的展开状态也要跟着把 key 换一下，不然会意外收起来。
  const updateSeriesName = (year, oldSeriesName, rawValue) => {
    const newName = rawValue.trim();
    if (!newName) return;
    const fieldKey = contentLangSuffix ? `series${contentLangSuffix}` : "series";
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) =>
        w.year === year && w.series === oldSeriesName ? { ...w, [fieldKey]: newName } : w
      ),
    }));
    if (!contentLangSuffix && newName !== oldSeriesName) {
      setExpandedSeries((prev) => {
        const oldKey = `${year}::${oldSeriesName}`;
        if (!(oldKey in prev)) return prev;
        const newKey = `${year}::${newName}`;
        const { [oldKey]: val, ...rest } = prev;
        return { ...rest, [newKey]: val };
      });
    }
    if (language === "en" || language === "zh") {
      syncFieldTranslations(`series:${year}:${oldSeriesName}`, newName, { titleCase: true }, (suffix, translation) => {
          const seriesKey = language === "en" ? newName : oldSeriesName;
          updateData((prev) => ({
            ...prev,
            works: prev.works.map((w) =>
              w.year === year && w.series === seriesKey ? { ...w, [`series${suffix}`]: translation } : w
            ),
          }));
      });
    }
  };

  const addToSeries = (year, seriesName, existingCount) => {
    const nextNumber = existingCount + 1;
    const newWork = {
      id: uid(),
      year,
      series: seriesName,
      title: `${seriesName} ${toRoman(nextNumber)}`,
      date: new Date().toDateString(),
      description: "点击这里填写作品介绍。",
      cover: "https://picsum.photos/seed/" + uid() + "/700/700",
      images: [],
      tone: "#454545",
    };
    updateData((prev) => {
      const idx = prev.works.findIndex((w) => w.year === year);
      if (idx === -1) return { ...prev, works: [newWork, ...prev.works] };
      const works = [...prev.works];
      works.splice(idx, 0, newWork);
      return { ...prev, works };
    });
    goToWork(newWork.id);
    setExpandedSeries((prev) => ({ ...prev, [`${year}::${seriesName}`]: true }));
  };

  const addSeries = (year, rawName, rawCount) => {
    const name = rawName.trim();
    const count = Math.min(30, Math.max(1, Number(rawCount) || 1));
    if (!name) return;
    const newWorks = Array.from({ length: count }, (_, i) => ({
      id: uid(),
      year,
      series: name,
      title: `${name} ${toRoman(i + 1)}`,
      date: new Date().toDateString(),
      description: "点击这里填写作品介绍。",
      cover: "https://picsum.photos/seed/" + uid() + "/700/700",
      images: [],
      tone: "#454545",
    }));
    updateData((prev) => {
      const idx = prev.works.findIndex((w) => w.year === year);
      if (idx === -1) return { ...prev, works: [...newWorks, ...prev.works] };
      const works = [...prev.works];
      works.splice(idx, 0, ...newWorks);
      return { ...prev, works };
    });
    setExpandedSeries((prev) => ({ ...prev, [`${year}::${name}`]: true }));
    setNewSeriesForm(null);
    setSeriesDraft({ name: "", count: 3 });
  };

  const deleteWork = (id) => {
    updateData((prev) => ({
      ...prev,
      works: prev.works.filter((w) => w.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  };

  // 删除整个系列：把这个系列下所有作品一起删掉
  const deleteSeries = (year, seriesName) => {
    const removedIds = data.works
      .filter((w) => w.year === year && w.series === seriesName)
      .map((w) => w.id);
    updateData((prev) => ({
      ...prev,
      works: prev.works.filter((w) => !(w.year === year && w.series === seriesName)),
    }));
    if (removedIds.includes(selectedId)) setSelectedId(null);
  };

  // 删除整个年份：这个年份下所有作品（包括系列作品）一起删掉，删之前弹窗确认，防止手滑误删
  const deleteYear = (year) => {
    const yearWorks = data.works.filter((w) => w.year === year);
    if (yearWorks.length === 0) return;
    const confirmed = window.confirm(
      `确定要删除 ${year} 年吗？这个年份下的 ${yearWorks.length} 件作品会一起被删除，此操作无法撤销。`
    );
    if (!confirmed) return;
    const removedIds = yearWorks.map((w) => w.id);
    updateData((prev) => ({
      ...prev,
      works: prev.works.filter((w) => w.year !== year),
    }));
    if (removedIds.includes(selectedId)) setSelectedId(null);
  };

  // 把某一年里的顶层条目（单个作品 或 整个系列分组）从 fromIndex 拖到 toIndex
  const reorderEntryLevel = (year, fromIndex, toIndex) => {
    updateData((prev) => {
      const yearWorks = prev.works.filter((w) => w.year === year);
      const entries = groupWorksBySeries(yearWorks);
      const reordered = reorderList(entries, fromIndex, toIndex);

      const newOrderForYear = reordered.flatMap((e) =>
        e.type === "single" ? [e.work] : e.works
      );

      let cursor = 0;
      const newWorks = prev.works.map((w) => {
        if (w.year !== year) return w;
        const replacement = newOrderForYear[cursor];
        cursor += 1;
        return replacement;
      });

      return { ...prev, works: newWorks };
    });
  };

  // 在同一个系列内部，把作品从 fromIndex 拖到 toIndex
  const reorderSeriesMembers = (year, seriesName, fromIndex, toIndex) => {
    updateData((prev) => {
      const yearWorks = prev.works.filter((w) => w.year === year);
      const entries = groupWorksBySeries(yearWorks);
      const newEntries = entries.map((e) => {
        if (e.type !== "series" || e.series !== seriesName) return e;
        return { ...e, works: reorderList(e.works, fromIndex, toIndex) };
      });

      const newOrderForYear = newEntries.flatMap((e) =>
        e.type === "single" ? [e.work] : e.works
      );

      let cursor = 0;
      const newWorks = prev.works.map((w) => {
        if (w.year !== year) return w;
        const replacement = newOrderForYear[cursor];
        cursor += 1;
        return replacement;
      });

      return { ...prev, works: newWorks };
    });
  };

  // 生成顶层条目（单个作品 或 整个系列分组）的原生拖拽事件处理器
  const makeEntryDragHandlers = (year, entryIndex) => {
    const key = `${year}::entry::${entryIndex}`;
    return {
      draggable: editMode,
      onDragStart: (e) => {
        e.dataTransfer.effectAllowed = "move";
        setDragState({ year, type: "entry", index: entryIndex });
      },
      onDragOver: (e) => {
        if (!editMode) return;
        e.preventDefault();
        if (dragOverKey !== key) setDragOverKey(key);
      },
      onDragLeave: () => {
        if (dragOverKey === key) setDragOverKey(null);
      },
      onDrop: (e) => {
        e.preventDefault();
        setDragOverKey(null);
        if (dragState && dragState.type === "entry" && dragState.year === year) {
          reorderEntryLevel(year, dragState.index, entryIndex);
        }
        setDragState(null);
      },
      onDragEnd: () => {
        setDragState(null);
        setDragOverKey(null);
      },
      isDragOver: dragOverKey === key,
    };
  };

  // 生成系列内部单件作品的原生拖拽事件处理器
  const makeMemberDragHandlers = (year, seriesName, memberIndex) => {
    const key = `${year}::member::${seriesName}::${memberIndex}`;
    return {
      draggable: editMode,
      onDragStart: (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        setDragState({ year, type: "member", seriesName, index: memberIndex });
      },
      onDragOver: (e) => {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation();
        if (dragOverKey !== key) setDragOverKey(key);
      },
      onDragLeave: (e) => {
        e.stopPropagation();
        if (dragOverKey === key) setDragOverKey(null);
      },
      onDrop: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverKey(null);
        if (
          dragState &&
          dragState.type === "member" &&
          dragState.year === year &&
          dragState.seriesName === seriesName
        ) {
          reorderSeriesMembers(year, seriesName, dragState.index, memberIndex);
        }
        setDragState(null);
      },
      onDragEnd: (e) => {
        e.stopPropagation();
        setDragState(null);
        setDragOverKey(null);
      },
      isDragOver: dragOverKey === key,
    };
  };

  const addDetailImage = async (workId, file) => {
    const [displayUrl, fullUrl] = await Promise.all([
      resizeImageToDataUrl(file, 1200, 0.82),
      resizeImageToDataUrl(file, 2600, 0.9),
    ]);
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) =>
        w.id === workId
          ? {
              ...w,
              images: [...w.images, displayUrl],
              imagesFull: [...(w.imagesFull || w.images), fullUrl],
            }
          : w
      ),
    }));
  };

  const replaceCover = async (workId, file) => {
    const [displayUrl, fullUrl] = await Promise.all([
      resizeImageToDataUrl(file, 1200, 0.82),
      resizeImageToDataUrl(file, 2600, 0.9),
    ]);
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) => {
        if (w.id !== workId) return w;
        const images = w.images ? [...w.images] : [];
        const imagesFull = w.imagesFull ? [...w.imagesFull] : [...images];
        images[0] = displayUrl;
        imagesFull[0] = fullUrl;
        return { ...w, images, imagesFull, cover: displayUrl };
      }),
    }));
  };

  const replaceDetailImage = async (workId, index, file) => {
    const [displayUrl, fullUrl] = await Promise.all([
      resizeImageToDataUrl(file, 1200, 0.82),
      resizeImageToDataUrl(file, 2600, 0.9),
    ]);
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) => {
        if (w.id !== workId) return w;
        const images = [...w.images];
        const imagesFull = w.imagesFull ? [...w.imagesFull] : [...images];
        images[index] = displayUrl;
        imagesFull[index] = fullUrl;
        return { ...w, images, imagesFull };
      }),
    }));
  };

  const removeDetailImage = (workId, index) => {
    updateData((prev) => ({
      ...prev,
      works: prev.works.map((w) => {
        if (w.id !== workId) return w;
        const images = w.images.filter((_, i) => i !== index);
        const imagesFull = (w.imagesFull || w.images).filter((_, i) => i !== index);
        return { ...w, images, imagesFull };
      }),
    }));
  };

  // Information 页段落：每段有自己的标题+详细内容，详细内容可以选一栏或两栏显示
  const addInfoSection = (category = "info") => {
    const newSection =
      category === "exhibition"
        ? {
            id: uid(),
            category,
            title: "新展览",
            entries: [{ id: uid(), year: "2026", name: "点击这里填写展览名称", location: "点击这里填写展览地点" }],
          }
        : {
            id: uid(),
            category,
            title: "新段落标题",
            body: "点击这里填写详细内容。",
            columns: 1,
          };
    updateData((prev) => ({
      ...prev,
      infoSections: [...(prev.infoSections || []), newSection],
    }));
  };
  const updateInfoSection = (id, patch) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    syncInfoSectionTranslations(id, patch);
  };
  const deleteInfoSection = (id) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).filter((s) => s.id !== id),
    }));
  };

  // 展览类段落下面"年份 / 展览名称"这些条目的增删改——每一条都是独立的一行，
  // 年份和名称是真正分开存的两个字段，不是靠空格从一整段文字里拆出来的
  const updateInfoEntry = (sectionId, entryId, patch) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).map((s) =>
        s.id === sectionId
          ? { ...s, entries: (s.entries || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
          : s
      ),
    }));
    syncInfoEntryTranslations(sectionId, entryId, patch);
  };
  const addInfoEntry = (sectionId) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).map((s) =>
        s.id === sectionId
          ? { ...s, entries: [...(s.entries || []), { id: uid(), year: "", name: "", location: "" }] }
          : s
      ),
    }));
  };
  const deleteInfoEntry = (sectionId, entryId) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).map((s) =>
        s.id === sectionId ? { ...s, entries: (s.entries || []).filter((e) => e.id !== entryId) } : s
      ),
    }));
  };

  const yearGroups = useMemo(() => {
    if (!data) return [];
    const years = [...new Set(data.works.map((w) => w.year))].sort(
      (a, b) => b - a
    );
    return years.map((year) => ({
      year,
      works: data.works.filter((w) => w.year === year),
    }));
  }, [data]);

  const selectedIndex = data.works.findIndex((w) => w.id === selectedId);
  const selectedWork = selectedIndex >= 0 ? data.works[selectedIndex] : null;

  // 详情页底部的 Previous / Next：不循环，到第一个/最后一个就是 null（对应按钮变灰不可点）
  const detailPrevWork = selectedIndex > 0 ? data.works[selectedIndex - 1] : null;
  const detailNextWork =
    selectedIndex >= 0 && selectedIndex < data.works.length - 1
      ? data.works[selectedIndex + 1]
      : null;

  // 排版设置分成四份，按"设备（电脑/手机）× 语言（中文/英文）"两个维度独立：
  // typography（电脑·英文，也是默认基准）、typographyZh（电脑·中文）、
  // typographyMobile（手机·英文）、typographyMobileZh（手机·中文）。
  // 某一份如果还没单独调整过，依次退回同设备的英文版本，再退回系统默认值，
  // 这样不会因为"还没配置某个组合"就突然掉回一个完全不一样的默认样式。
  const typographyFieldKey = `typography${isMobile ? "Mobile" : ""}${isZh ? "Zh" : ""}`;
  const typographyDeviceBaseKey = isMobile ? "typographyMobile" : "typography";
  const typography =
    data[typographyFieldKey] || data[typographyDeviceBaseKey] || DEFAULT_TYPOGRAPHY;

  const fontOptions = FONT_PRESETS;

  // 把某个元素的排版设置转成实际可用的内联 style
  // 选中字体对应的语言标注：光靠"用哪个字体文件"选不出正确的简繁字形，
  // 思源黑体/思源宋体这类字体的简繁差异是靠 OpenType 的"本地化替换"实现的，
  // 必须同时在元素上标出 lang="zh-Hans"/"zh-Hant" 之类的语言，浏览器才会触发对应的替换。
  const CJK_LANG_BY_FONT_ID = {
    "source-han-sans-sc": "zh-Hans",
    "source-han-sans-tc": "zh-Hant",
    "source-han-sans-jp": "ja",
    "source-han-serif-sc": "zh-Hans",
    "source-han-serif-tc": "zh-Hant",
    "source-han-serif-jp": "ja",
  };
  const langFor = (targetKey) => {
    const t = typography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey] || typography.infoBodyExhibition || DEFAULT_TYPOGRAPHY.infoBodyExhibition;
    if (isZh) return isTraditional ? "zh-Hant" : CJK_LANG_BY_FONT_ID[t.fontFamily];
    if (language === "ja") return CJK_LANG_BY_FONT_ID[t.fontFamily] || "ja";
    return undefined;
  };

  const styleFor = (targetKey) => {
    const t = typography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey] || typography.infoBodyExhibition || DEFAULT_TYPOGRAPHY.infoBodyExhibition;
    const preset = fontOptions.find((f) => f.id === t.fontFamily) || fontOptions[0];

    // 中文模式下的字体规则：
    // ——选中思源黑体（简体）或思源黑體（繁体）时，用本地字体文件拼一个复合字体栈：
    //   中文标点固定用思源黑体（简体）的标点字形，英文和汉字本身都按实际选择的
    //   字体显示（选中字体自带的西文字形 + 简体/繁体字形）。
    // ——选中其他 Sans Serif / Serif 字体（没有对应本地字体文件）时，完全按选中的字体显示，
    //   不做任何覆盖。英文/西班牙语模式同样完全按选中的字体显示。
    let fontFamily = preset.family;
    if (isZh && preset.id === "source-han-sans-sc") {
      fontFamily = isTraditional
        ? "'Source Han Sans SC Punctuation', 'Source Han Sans TC Full', sans-serif"
        : "'Source Han Sans SC Punctuation', 'Source Han Sans SC Full', sans-serif";
    } else if (isZh && preset.id === "source-han-sans-tc") {
      fontFamily = "'Source Han Sans SC Punctuation', 'Source Han Sans TC Full', sans-serif";
    }

    return {
      fontSize: `${t.fontSize}px`,
      lineHeight: t.lineHeight,
      fontFamily,
      fontWeight: t.fontWeight ?? 400,
      fontStyle: t.italic ? "italic" : "normal",
      letterSpacing: `${t.letterSpacing ?? 0}px`,
      ...widthStyleFor(preset, t.fontWidth),
    };
  };

  const artistNameStyle = styleFor("artistName");
  const artistNameLang = langFor("artistName");
  const yearStyle = styleFor("year");
  const yearLang = langFor("year");
  const workTitleStyle = styleFor("workTitle");
  const workTitleLang = langFor("workTitle");
  // 左侧栏"作品跟作品之间"（不管是单独作品还是系列条目）的间距，统一用这个算出来的值，
  // 保证始终比标题换行后、行与行之间的间距更大，不管字号/行距在 Aa 面板里被调成多少。
  const workTitleLineHeightPx =
    (parseFloat(workTitleStyle.fontSize) || 15) * (parseFloat(workTitleStyle.lineHeight) || 1.3);
  const workItemSpacing = Math.round(workTitleLineHeightPx * 0.6);
  const workItemSpacingHalf = Math.round(workTitleLineHeightPx * 0.3);
  const detailTitleStyle = styleFor("detailTitle");
  const detailTitleLang = langFor("detailTitle");
  const detailMaterialsStyle = styleFor("detailMaterials");
  const detailMaterialsLang = langFor("detailMaterials");
  const detailDimensionsStyle = styleFor("detailDimensions");
  const detailDimensionsLang = langFor("detailDimensions");
  const infoTitleStyle = styleFor("infoTitle");
  const infoTitleLang = langFor("infoTitle");
  const infoBodyInfoStyle = styleFor("infoBodyInfo");
  const infoBodyInfoLang = langFor("infoBodyInfo");
  const infoBodyExhibitionStyle = styleFor("infoBodyExhibition");
  const infoBodyExhibitionLang = langFor("infoBodyExhibition");
  const infoExhibitionNameStyle = styleFor("infoExhibitionName");
  const infoExhibitionNameLang = langFor("infoExhibitionName");
  const infoExhibitionLocationStyle = styleFor("infoExhibitionLocation");
  const infoExhibitionLocationLang = langFor("infoExhibitionLocation");
  const footerLinksStyle = styleFor("footerLinks");
  const footerLinksLang = langFor("footerLinks");

  const activeTypoValue =
    typography[activeTypoTarget] || DEFAULT_TYPOGRAPHY[activeTypoTarget] || typography.infoBodyExhibition || DEFAULT_TYPOGRAPHY.infoBodyExhibition;
  const activeTypoPreset =
    fontOptions.find((f) => f.id === activeTypoValue.fontFamily) || fontOptions[0];

  // 内置预设里如果标了 googleFont，就去 Google Fonts 加载对应的字重
  const googleFontFamilies = FONT_PRESETS.filter((f) => f.googleFont).map((f) => f.googleFont);

  const showPhoneFrame = canEdit && editPreviewMode === "mobile";

  const appRoot = (
    <div
      className={`w-full ${showPhoneFrame ? "h-full" : "app-root-viewport-height"} flex ${
        isMobile ? "flex-col" : "flex-row"
      } bg-white text-neutral-900 overflow-hidden relative`}
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      {editRequested && !isLocalDevelopment && !editorAuth.authenticated && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/95 px-6">
          {editorAuth.checking ? (
            <p className="text-sm text-neutral-500">正在验证编辑权限…</p>
          ) : (
            <form onSubmit={submitEditorLogin} className="w-full max-w-xs space-y-4">
              <div>
                <h2 className="text-xl font-bold">编辑登录</h2>
                <p className="mt-1 text-sm text-neutral-500">请输入仅你本人使用的编辑密码。</p>
              </div>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={editorPassword}
                onChange={(event) => setEditorPassword(event.target.value)}
                className="w-full rounded-full border-2 border-black px-4 py-2 text-sm outline-none"
                placeholder="编辑密码"
              />
              {editorLoginError && <p className="text-xs text-red-600">{editorLoginError}</p>}
              <button type="submit" className="w-full rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                进入编辑页面
              </button>
            </form>
          )}
        </div>
      )}
      {!showPhoneFrame && (
        <style>{`
          .app-root-viewport-height {
            height: 100vh; /* 不支持 100dvh 的老浏览器兜底，先按这个算 */
            height: 100dvh; /* 手机浏览器（尤其是 Chrome）的地址栏/底部工具栏会动态收起展开，
              100vh 只按"工具栏完全收起"时候的最大高度来算；工具栏还显示着的时候，页面实际
              可视区域比 100vh 矮一截，靠 100vh 这个容器定位在底部的元素（比如"回到顶部"
              悬浮按钮）就会被算到工具栏底下，肉眼完全看不到。100dvh 会跟着工具栏的展开/
              收起实时变化，永远贴合当前真正能看到的区域，不会被工具栏挡住。 */
          }
          .sidebar-icon-hover-reveal {
            clip-path: circle(0% at 50% 50%);
            transition: clip-path 280ms ease-out;
          }
          .group:hover .sidebar-icon-hover-reveal,
          .group:focus-visible .sidebar-icon-hover-reveal {
            clip-path: circle(75% at 50% 50%);
          }
          .language-toggle-hover-reveal {
            clip-path: circle(0% at 50% 50%);
            transition: clip-path 280ms ease-out;
          }
          .language-toggle:hover .language-toggle-hover-reveal,
          .language-toggle:focus-visible .language-toggle-hover-reveal {
            clip-path: circle(90% at 50% 50%);
          }
          .language-menu-option-hover {
            left: -15px;
            width: calc(100% + 30px);
            transform: translateX(110%);
          }
          .language-menu-option-enter {
            animation: language-menu-option-enter 240ms ease-out forwards;
          }
          .language-menu-option-exit {
            animation: language-menu-option-exit 240ms ease-in forwards;
          }
          @keyframes language-menu-option-enter {
            from { transform: translateX(-110%); }
            to { transform: translateX(0); }
          }
          @keyframes language-menu-option-exit {
            from { transform: translateX(0); }
            to { transform: translateX(110%); }
          }
          .language-menu-reveal {
            animation: language-menu-reveal 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes language-menu-reveal {
            from { max-height: 0; }
            to { max-height: 280px; }
          }
          .language-menu-retract {
            animation: language-menu-retract 300ms cubic-bezier(0.7, 0, 0.84, 0) both;
          }
          @keyframes language-menu-retract {
            from { max-height: 280px; }
            to { max-height: 0; }
          }
          .language-menu-option:hover .language-menu-option-label,
          .language-menu-option:focus-visible .language-menu-option-label {
            color: white;
          }
          .desktop-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
          }
          .desktop-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .desktop-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
          .desktop-scrollbar.desktop-scrollbar-scrolling {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.35) transparent;
          }
          .desktop-scrollbar.desktop-scrollbar-scrolling::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.35);
            border-radius: 999px;
          }
          @media (prefers-reduced-motion: reduce) {
            .sidebar-icon-hover-reveal,
            .language-toggle-hover-reveal { transition: none; }
            .language-menu-option-enter,
            .language-menu-option-exit,
            .language-menu-reveal,
            .language-menu-retract { animation-duration: 0ms; }
          }
        `}</style>
      )}
      {googleFontFamilies.length > 0 && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${googleFontFamilies
            .map((f) => `family=${f}`)
            .join("&")}&display=swap`}
        />
      )}

      {/* 画廊页"回到顶部"悬浮按钮：只在画廊页（不是详情页/Information页）且往下滑了一段
          距离之后才出现，点击平滑滚回顶部。放在 appRoot 这一层（自带 relative + overflow-hidden），
          这样手机预览的模拟边框里也会正确显示在边框内部，不会跑到边框外面去。 */}
      {!selectedId && !showInfo && showBackToTop && (
        isMobile ? (
          <button
            onClick={scrollGalleryToTop}
          aria-label={isZh ? zhText("回到顶部") : isEs ? "Volver arriba" : "Back to top"}
          title={isZh ? zhText("回到顶部") : isEs ? "Volver arriba" : "Back to top"}
            className="absolute right-6 z-20 w-11 h-11 rounded-full flex items-center justify-center bg-neutral-900 text-white shadow-lg"
            style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        ) : (
          <CircleRevealArrowButton
            direction="up"
            onClick={scrollGalleryToTop}
            ariaLabel={isZh ? zhText("回到顶部") : isEs ? "Volver arriba" : "Back to top"}
            title={isZh ? zhText("回到顶部") : isEs ? "Volver arriba" : "Back to top"}
            className="absolute right-6 z-20"
            style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          />
        )
      )}

      {/* 顶部工具按钮：中英文切换所有人都能看到；编辑相关的按钮只有网址带 ?edit=1 才会显示 */}
      {!isMobile && (
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
          {canEdit && editMode && (
            <>
              <div ref={translationMenuRef} className="relative">
                <button
                  onClick={() => setTranslationMenuOpen((open) => !open)}
                  disabled={!!translationRegeneration}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50"
                >
                  {translationRegeneration
                    ? `翻译中 ${translationRegeneration.done}/${translationRegeneration.total}`
                    : "重新生成翻译 ▾"}
                </button>
                {translationMenuOpen && !translationRegeneration && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-32 overflow-hidden rounded-lg border border-black bg-white text-left">
                    {TRANSLATION_MENU_OPTIONS.map((option, index) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setTranslationMenuOpen(false);
                          rebuildAllTranslations(option.codes);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs font-bold text-black hover:bg-black hover:text-white ${
                          index === 1 ? "border-t border-black" : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={resetToDefaultData}
                title="清空当前内容，恢复成最初的示例数据"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                重置为默认数据
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={exportContent}
              title="把当前内容导出成一个 zip 压缩包（content.json + images 文件夹），解压后放进项目的 public 文件夹替换掉旧的"
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                hasUnexportedChanges
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              导出内容{hasUnexportedChanges ? "（有改动）" : ""}
            </button>
          )}
          {canEdit && editMode && (
            <button
              onClick={() => setTypoPanelOpen((v) => !v)}
              data-typo-toggle="true"
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                typoPanelOpen
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Aa 文字样式
            </button>
          )}
          {canEdit && (
            <div className="flex items-center rounded-full bg-neutral-100 p-0.5 text-xs font-bold">
              <button
                onClick={() => setEditPreviewMode("desktop")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  isMobile ? "text-neutral-500 hover:text-neutral-900" : "bg-neutral-900 text-white"
                }`}
              >
                电脑预览
              </button>
              <button
                onClick={() => setEditPreviewMode("mobile")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  isMobile ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                手机预览
              </button>
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setEditMode((v) => !v);
                setTypoPanelOpen(false);
                setEditPreviewMode(null);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                editMode
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {editMode ? "完成编辑" : "编辑页面"}
            </button>
          )}
          <div className="relative">
            <button
              onClick={toggleLanguageMenu}
              data-language-toggle="true"
              className="language-toggle relative overflow-hidden rounded-full border-2 border-black bg-white px-[10px] py-[3px] text-[15px] leading-5 font-bold text-black"
            >
              <span className="relative z-10">{languageButtonLabel}</span>
              <span className="language-toggle-hover-reveal absolute inset-0 z-20 flex items-center justify-center bg-black text-white" aria-hidden="true">
                {languageButtonLabel}
              </span>
            </button>
            {languageMenuOpen && (
              <div
                ref={languageMenuRef}
                className={`${languageMenuClosing ? "language-menu-retract" : "language-menu-reveal"} absolute top-9 right-0 z-30 inline-flex w-max flex-col overflow-hidden rounded-[15px] border-2 border-black bg-white`}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => selectLanguage(opt.code)}
                    onMouseEnter={() => {
                      setHoveredLanguageOption(opt.code);
                      setExitingLanguageOptions((prev) => prev.filter((code) => code !== opt.code));
                    }}
                    onMouseLeave={() => {
                      setHoveredLanguageOption(null);
                      setExitingLanguageOptions((prev) =>
                        prev.includes(opt.code) ? prev : [...prev, opt.code]
                      );
                    }}
                    className={`language-menu-option relative flex h-[34px] items-center px-[18px] text-left text-lg leading-none ${
                      opt.code === language
                        ? "font-bold"
                        : ""
                    }`}
                  >
                    <span className="language-menu-option-label relative z-30 text-black">{opt.name}</span>
                    <span
                      aria-hidden="true"
                      className={`language-menu-option-hover pointer-events-none absolute inset-y-0 z-20 rounded-full bg-black ${languageOptionHoverClass(opt.code)}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {typoPanelOpen && (
        <div
          ref={typoPanelRef}
          className={`${
            showPhoneFrame ? "fixed top-32 right-6 z-[200]" : "absolute top-12 right-3 z-30"
          } w-72 max-h-[80vh] overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg p-4 space-y-4`}
        >
          <div className="text-xs font-bold px-2 py-1 rounded bg-neutral-100 text-neutral-600 inline-block">
            {zhText("正在编辑：")}{isMobile ? zhText("手机端") : zhText("电脑端")} · {isZh ? zhText("中文") : "英文"}
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-2">调整对象</div>
            <select
              value={activeTypoTarget}
              onChange={(e) => setActiveTypoTarget(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded-md border border-neutral-300 bg-white"
            >
              {TYPOGRAPHY_TARGETS.filter((t) =>
                (isMobile || !t.mobileOnly) && !(isMobile && t.key === "infoBodyExhibition")
              ).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>字号</span>
              <span>{activeTypoValue.fontSize}px</span>
            </div>
            <input
              type="range"
              min={11}
              max={40}
              step={1}
              value={activeTypoValue.fontSize}
              onChange={(e) =>
                updateTypography(activeTypoTarget, { fontSize: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>行距</span>
              <span>{activeTypoValue.lineHeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={activeTypoValue.lineHeight}
              onChange={(e) =>
                updateTypography(activeTypoTarget, { lineHeight: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="text-xs text-neutral-500 mb-2">字体样式</div>
            {FONT_CATEGORIES.map((cat) => {
              const items = fontOptions.filter((f) => f.category === cat.key);
              return (
                <div key={cat.key} className="mb-3 last:mb-0">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                    {cat.label}
                  </div>
                  {items.length === 0 ? (
                    <div className="text-[11px] text-neutral-300 italic px-2 py-1.5 border border-dashed border-neutral-200 rounded-md">
                      暂无字体，之后可以加进来
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {items.map((preset) => {
                        const isSelected = activeTypoValue.fontFamily === preset.id;
                        const isOpen = openFontId === preset.id;
                        return (
                          <div key={preset.id}>
                            <button
                              onClick={() => {
                                if (preset.weights) {
                                  setOpenFontId(isOpen ? null : preset.id);
                                  if (!isSelected) {
                                    updateTypography(activeTypoTarget, {
                                      fontFamily: preset.id,
                                      fontWeight: activeTypoValue.fontWeight ?? 400,
                                    });
                                  }
                                } else {
                                  updateTypography(activeTypoTarget, {
                                    fontFamily: preset.id,
                                    italic: !!preset.italic,
                                  });
                                }
                              }}
                              style={{ fontFamily: preset.family }}
                              className={`w-full flex items-center justify-between text-left text-sm px-2 py-1.5 rounded-md border transition-colors ${
                                isSelected
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-200 hover:border-neutral-400"
                              }`}
                            >
                              <span>{preset.label}</span>
                              {preset.weights && (
                                <span
                                  className={`text-[10px] transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                  aria-hidden
                                >
                                  ▾
                                </span>
                              )}
                            </button>

                            {preset.weights && isOpen && (
                              <div className="mt-1 ml-2 pl-2 border-l border-neutral-200 space-y-1">
                                {preset.weights.map((w) => (
                                  <button
                                    key={w.weight}
                                    onClick={() =>
                                      updateTypography(activeTypoTarget, {
                                        fontFamily: preset.id,
                                        fontWeight: w.weight,
                                      })
                                    }
                                    style={{ fontFamily: preset.family, fontWeight: w.weight }}
                                    className={`w-full text-left text-sm px-2 py-1 rounded-md border transition-colors ${
                                      isSelected && (activeTypoValue.fontWeight ?? 400) === w.weight
                                        ? "border-neutral-900 bg-neutral-100"
                                        : "border-transparent hover:border-neutral-200"
                                    }`}
                                  >
                                    {w.label} <span className="text-neutral-400">({w.weight})</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">斜体</span>
            <button
              onClick={() => updateTypography(activeTypoTarget, { italic: !activeTypoValue.italic })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                activeTypoValue.italic ? "bg-neutral-900" : "bg-neutral-200"
              }`}
              aria-pressed={!!activeTypoValue.italic}
              title="切换斜体"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  activeTypoValue.italic ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>字间距</span>
              <span>{(activeTypoValue.letterSpacing ?? 0).toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min={-2}
              max={10}
              step={0.5}
              value={activeTypoValue.letterSpacing ?? 0}
              onChange={(e) =>
                updateTypography(activeTypoTarget, { letterSpacing: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>字宽</span>
              <span>{activeTypoValue.fontWidth ?? activeTypoPreset.widthRange?.default ?? 100}%</span>
            </div>
            <input
              type="range"
              min={activeTypoPreset.widthRange?.min ?? 50}
              max={activeTypoPreset.widthRange?.max ?? 100}
              step={1}
              value={activeTypoValue.fontWidth ?? activeTypoPreset.widthRange?.default ?? 100}
              onChange={(e) =>
                updateTypography(activeTypoTarget, { fontWidth: Number(e.target.value) })
              }
              className="w-full"
            />
            <div className="mt-1 text-[11px] text-neutral-300 leading-snug">
              {activeTypoPreset.realWidthMin != null
                ? `${activeTypoPreset.realWidthMin}%~100% 用字体自带的真实宽度轴，低于 ${activeTypoPreset.realWidthMin}% 的部分用代码模拟延续效果`
                : "这款字体没有真实的宽度轴，字宽变化是代码模拟出来的效果"}
            </div>
          </div>

          <div
            className="pt-2 border-t border-neutral-100 text-neutral-400"
            style={{
              fontSize: `${activeTypoValue.fontSize}px`,
              lineHeight: activeTypoValue.lineHeight,
              fontFamily: activeTypoPreset.family,
              fontWeight: activeTypoValue.fontWeight ?? 400,
              fontStyle: activeTypoValue.italic ? "italic" : "normal",
              letterSpacing: `${activeTypoValue.letterSpacing ?? 0}px`,
              ...widthStyleFor(activeTypoPreset, activeTypoValue.fontWidth),
            }}
          >
            预览文字 Preview Aa
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>右侧栏图片间距</span>
              <span>{data.imageGap ?? 16}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={48}
              step={2}
              value={data.imageGap ?? 16}
              onChange={(e) =>
                updateData((prev) => ({ ...prev, imageGap: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {editMode && (
        <span className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-[11px] text-neutral-400">
          {hasUnexportedChanges ? "有改动还没导出，记得点导出内容" : "暂无未导出的改动"}
        </span>
      )}

      {/* ---------- 手机端顶部栏：姓名 + 语言切换 + 菜单按钮，只在窄屏时显示 ---------- */}
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-3 flex-shrink-0 relative z-30 bg-white">
          {selectedWork ? (
            <div className="flex items-center gap-8 -ml-2">
              <button onClick={goBackToGallery} aria-label="返回" className="p-2">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button onClick={goToGallery} aria-label="首页" className="p-2">
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-8 min-w-0">
              <Editable
                as="span"
                editMode={editMode}
                value={data.artistName}
                onChange={(v) => updateData((prev) => ({ ...prev, artistName: v }))}
                onClick={goToGallery}
                className="font-bold tracking-tight whitespace-nowrap"
                style={artistNameStyle}
                lang={artistNameLang}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={toggleLanguageMenu}
                data-language-toggle="true"
                className="language-toggle relative overflow-hidden rounded-full border-2 border-black bg-white px-[10px] py-[3px] text-[15px] leading-5 font-bold text-black"
              >
                <span className="relative z-10">{languageButtonLabel}</span>
                <span className="language-toggle-hover-reveal absolute inset-0 z-20 flex items-center justify-center bg-black text-white" aria-hidden="true">
                  {languageButtonLabel}
                </span>
              </button>
              {languageMenuOpen && (
                <div
                  ref={languageMenuRef}
                  className={`${languageMenuClosing ? "language-menu-retract" : "language-menu-reveal"} absolute top-9 right-0 z-30 inline-flex w-max flex-col overflow-hidden rounded-[15px] border-2 border-black bg-white`}
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => selectLanguage(opt.code)}
                      onMouseEnter={() => {
                        setHoveredLanguageOption(opt.code);
                        setExitingLanguageOptions((prev) => prev.filter((code) => code !== opt.code));
                      }}
                      onMouseLeave={() => {
                        setHoveredLanguageOption(null);
                        setExitingLanguageOptions((prev) =>
                          prev.includes(opt.code) ? prev : [...prev, opt.code]
                        );
                      }}
                      className={`language-menu-option relative flex h-[34px] items-center px-[14px] text-left text-lg leading-none ${
                        opt.code === language
                          ? "bg-black font-bold"
                          : ""
                      }`}
                    >
                      <span className={`language-menu-option-label relative z-30 ${opt.code === language ? "text-white" : "text-black"}`}>
                        {opt.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`language-menu-option-hover pointer-events-none absolute inset-y-0 z-20 rounded-full bg-black ${languageOptionHoverClass(opt.code)}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canEdit && !editMode && !showPhoneFrame && (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 whitespace-nowrap"
              >
                编辑页面
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开菜单"
              className="flex flex-col gap-1.5 p-2 -mr-2"
            >
              <span className="block w-5 h-0.5 bg-neutral-900" />
              <span className="block w-5 h-0.5 bg-neutral-900" />
              <span className="block w-5 h-0.5 bg-neutral-900" />
            </button>
          </div>
        </div>
      )}

      {isMobile && canEdit && (
        <div
          className={`flex items-center gap-2 px-3 py-2 bg-neutral-50 overflow-x-auto ${
            showPhoneFrame ? "fixed top-6 right-6 z-[200] rounded-xl shadow-lg" : "flex-shrink-0"
          }`}
        >
          <div className="flex items-center rounded-full bg-neutral-100 p-0.5 text-xs font-bold flex-shrink-0">
            <button
              onClick={() => setEditPreviewMode("desktop")}
              className={`px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                isMobile ? "text-neutral-500" : "bg-neutral-900 text-white"
              }`}
            >
              电脑预览
            </button>
            <button
              onClick={() => setEditPreviewMode("mobile")}
              className={`px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                isMobile ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              手机预览
            </button>
          </div>
          <button
            onClick={exportContent}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex-shrink-0 whitespace-nowrap ${
              hasUnexportedChanges
                ? "bg-amber-100 text-amber-700"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            导出内容{hasUnexportedChanges ? "（有改动）" : ""}
          </button>
          {showPhoneFrame && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-900 text-white flex-shrink-0 whitespace-nowrap"
            >
              编辑页面
            </button>
          )}
        </div>
      )}

      {/* 手机端编辑工具栏：单独占一行，走正常的文档流，不会跟顶部栏重叠盖住按钮。
          只有编辑模式下才出现，平时访客看到的手机端顶部栏跟以前一样干净。 */}
      {isMobile && canEdit && editMode && (
        <div
          className={`flex items-center gap-2 px-3 py-2 bg-neutral-50 overflow-x-auto ${
            showPhoneFrame ? "fixed top-20 right-6 z-[200] rounded-xl shadow-lg" : "flex-shrink-0"
          }`}
        >
          <button
            onClick={() => setTypoPanelOpen((v) => !v)}
            data-typo-toggle="true"
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex-shrink-0 whitespace-nowrap ${
              typoPanelOpen
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Aa 文字样式
          </button>
          <select
            value=""
            disabled={!!translationRegeneration}
            onChange={(event) => {
              const option = TRANSLATION_MENU_OPTIONS.find((item) => item.label === event.target.value);
              if (option) rebuildAllTranslations(option.codes);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 disabled:opacity-50 flex-shrink-0 whitespace-nowrap appearance-none"
          >
            <option value="" disabled>
              {translationRegeneration
                ? `翻译中 ${translationRegeneration.done}/${translationRegeneration.total}`
                : "重新生成翻译 ▾"}
            </option>
            {TRANSLATION_MENU_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditMode(false);
              setTypoPanelOpen(false);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-900 text-white flex-shrink-0 whitespace-nowrap"
          >
            完成编辑
          </button>
        </div>
      )}

      {/* ---------- 左侧：姓名 + 年份 + 作品列表 ---------- */}
      {/* 电脑上是常驻的左栏；手机上变成点击菜单按钮才弹出的全屏抽屉，用 transform 做滑入滑出动画，
          始终挂载在页面里（不再是条件渲染），这样开关的时候才有过渡动画，而不是瞬间出现/消失 */}
      <aside
        className={
          isMobile
            ? `${showPhoneFrame ? "absolute" : "fixed"} inset-0 z-40 bg-white flex flex-col ${
                hasMounted ? "transition-transform duration-300 ease-in-out" : ""
              } ${mobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"}`
            : "relative flex-shrink-0 h-full flex flex-col"
        }
        style={
          isMobile
            ? {
                // 这几条跟上面 className 里写的是同一件事，只是额外用内联样式再保险一遍——
                // 网页刚打开的一瞬间，Tailwind 的样式表还没来得及生效，光靠上面那些
                // class 名字是不会有任何视觉效果的，这个菜单本该"藏在屏幕右边看不见"，
                // 那一瞬间就会变成正常显示在页面里，能看到内容"裸奔"一下。内联样式不用
                // 等 Tailwind 编译，浏览器一读到就会立刻生效，从第一帧画面开始就是对的。
                position: showPhoneFrame ? "absolute" : "fixed",
                inset: 0,
                zIndex: 40,
                backgroundColor: "#fff",
                transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
              }
            : { width: sidebarWidth }
        }
      >
        {isMobile && (
          <div className="flex items-center justify-between px-3 py-3 flex-shrink-0">
            <span
              className="text-5xl font-bold tracking-tight"
              style={{
                fontFamily: isZh
                  ? "'Noto Sans JP', -apple-system, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif"
                  : "'IBM Plex Sans', -apple-system, Arial, 'PingFang SC', sans-serif",
              }}
            >
              {isZh ? zhText("索引") : isEs ? "Índice" : "Index"}
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="关闭菜单"
              className="relative p-2 -mr-2 w-12 h-12 flex items-center justify-center"
            >
              <span className="absolute w-7 h-0.5 bg-neutral-900 rotate-45" />
              <span className="absolute w-7 h-0.5 bg-neutral-900 -rotate-45" />
            </button>
          </div>
        )}

        {/* 姓名 + 返回图标：单独固定在顶部，不随下面的年份/作品列表滚动 */}
        {!isMobile && (
          <div ref={sidebarHeaderRef} className="flex-shrink-0 px-6 pt-8">
            <div className="w-full flex items-center justify-between mb-8 -mr-6">
              <Editable
                as="h1"
                editMode={editMode}
                value={data.artistName}
                onChange={(v) => updateData((prev) => ({ ...prev, artistName: v }))}
                onClick={goToGallery}
                className="tracking-tight inline-block whitespace-nowrap"
                style={artistNameStyle}
                lang={artistNameLang}
                data-measure-line="true"
              />
              {(selectedWork || showInfo) && (
                <CircleRevealArrowButton
                  direction="back"
                  onClick={goBackToGallery}
                  ariaLabel={isZh ? zhText("返回") : isEs ? "Atrás" : "Back"}
                  title={isZh ? zhText("返回") : isEs ? "Atrás" : "Back"}
                />
              )}
            </div>
          </div>
        )}

          <div
            ref={sidebarContentRef}
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-6 ${!isMobile ? "desktop-scrollbar" : ""} ${
              isMobile ? "px-4 pt-2" : "pl-6 pr-2 pt-0"
            }`}
          >

          {yearGroups.map((group) => {
            const entries = groupWorksBySeries(group.works);
            const yearOpen = !isMobile || expandedYears[group.year] !== false;
            return (
              <div key={group.year} className="mb-4 group/year">
                <div className="relative flex items-center gap-1 mb-2">
                {isMobile ? (
                  <button
                    onClick={() => !editMode && toggleYear(group.year)}
                    className="relative flex-1 min-w-0 flex items-center justify-between"
                  >
                    <span style={yearStyle} lang={yearLang} data-measure-line="true">
                      {editMode ? (
                        <Editable
                          as="span"
                          editMode={editMode}
                          value={String(group.year)}
                          onChange={(v) => updateYear(group.year, v)}
                          className="inline-block whitespace-nowrap"
                        />
                      ) : (
                        group.year
                      )}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      width={Math.round((parseFloat(yearStyle.fontSize) || 20) * 0.7)}
                      height={Math.round((parseFloat(yearStyle.fontSize) || 20) * 0.7)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-neutral-400 transition-transform flex-shrink-0"
                      style={{ transform: yearOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ) : (
                  <Editable
                    as="h2"
                    editMode={editMode}
                    value={String(group.year)}
                    onChange={(v) => updateYear(group.year, v)}
                    className="whitespace-nowrap inline-block"
                    style={yearStyle}
                    lang={yearLang}
                    data-measure-line="true"
                  />
                )}
                {editMode && (
                  <button
                    onClick={() => deleteYear(group.year)}
                    className="opacity-0 group-hover/year:opacity-100 text-neutral-300 hover:text-red-500 text-xs transition-opacity shrink-0"
                    title="删除这个年份（连同这个年份下所有作品）"
                  >
                    ✕
                  </button>
                )}
                </div>
                <AccordionContent isOpen={yearOpen}>
                <ul>
                  {entries.map((entry, entryIndex) => {
                    if (entry.type === "single") {
                      const w = entry.work;
                      return (
                        <WorkListItem
                          key={w.id}
                          w={w}
                          displayTitle={tField(w, "title")}
                          selectedId={selectedId}
                          editMode={editMode}
                          bodyTextStyle={workTitleStyle}
                          bodyTextLang={workTitleLang}
                          underlineEnabled={!isMobile}
                          onSelect={() => goToWork(w.id)}
                          onChangeTitle={(v) => updateWork(w.id, { [langKey("title")]: v })}
                          onDelete={() => deleteWork(w.id)}
                          dragHandlers={makeEntryDragHandlers(group.year, entryIndex)}
                        />
                      );
                    }

                    // entry.type === "series"：可折叠的系列分组
                    const seriesKey = `${group.year}::${entry.series}`;
                    const isOpen = !!expandedSeries[seriesKey];
                    const displaySeriesName = contentLangSuffix
                      ? entry.works[0]?.[`series${contentLangSuffix}`] || entry.series
                      : entry.series;
                    const { isDragOver: headerIsDragOver, ...headerDragProps } =
                      makeEntryDragHandlers(group.year, entryIndex);
                    return (
                      <li key={seriesKey} style={{ marginBottom: workItemSpacing }}>
                        <div
                          {...headerDragProps}
                          className={`flex items-center gap-1 group rounded transition-colors ${
                            headerIsDragOver ? "bg-neutral-100" : ""
                          } ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <span
                            className={`text-neutral-300 text-xs select-none shrink-0 ${
                              editMode ? "" : "invisible"
                            }`}
                            aria-hidden
                          >
                            ⠿
                          </span>
                          <button
                            onClick={() => !editMode && toggleSeries(seriesKey)}
                            style={workTitleStyle}
                            lang={workTitleLang}
                            className="relative flex items-center min-w-0 text-left text-neutral-800"
                          >
                            <span className="absolute -left-3 inset-y-0 flex items-center" aria-hidden>
                              <svg
                                viewBox="0 0 24 24"
                                width={Math.round((parseFloat(workTitleStyle.fontSize) || 15) * 0.7)}
                                height={Math.round((parseFloat(workTitleStyle.fontSize) || 15) * 0.7)}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-transform"
                                style={{
                                  fontStyle: "normal",
                                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                                }}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </span>
                            {editMode ? (
                              <Editable
                                as="span"
                                editMode={editMode}
                                value={displaySeriesName}
                                onChange={(v) => updateSeriesName(group.year, entry.series, v)}
                                className="min-w-0"
                              />
                            ) : (
                              <AnimatedSidebarUnderline
                                enabled={!isMobile}
                              >
                                {displaySeriesName}
                              </AnimatedSidebarUnderline>
                            )}
                          </button>
                          {editMode && (
                            <button
                              onClick={() => deleteSeries(group.year, entry.series)}
                              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 text-xs transition-opacity shrink-0"
                              title="删除整个系列"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <AccordionContent isOpen={isOpen}>
                          <ul className="ml-1.5" style={{ paddingTop: workItemSpacingHalf }}>
                            {entry.works.map((w, memberIndex) => (
                              <WorkListItem
                                key={w.id}
                                w={w}
                                displayTitle={tField(w, "title")}
                                selectedId={selectedId}
                                editMode={editMode}
                                bodyTextStyle={workTitleStyle}
                                bodyTextLang={workTitleLang}
                                underlineEnabled={!isMobile}
                                onSelect={() => goToWork(w.id)}
                                onChangeTitle={(v) => updateWork(w.id, { [langKey("title")]: v })}
                                onDelete={() => deleteWork(w.id)}
                                dragHandlers={makeMemberDragHandlers(
                                  group.year,
                                  entry.series,
                                  memberIndex
                                )}
                              />
                            ))}
                            {editMode && (
                              <li>
                                <button
                                  onClick={() =>
                                    addToSeries(group.year, entry.series, entry.works.length)
                                  }
                                  className="mt-1 text-xs text-neutral-400"
                                >
                                  + 添加下一件（自动编号）
                                </button>
                              </li>
                            )}
                          </ul>
                        </AccordionContent>
                      </li>
                    );
                  })}
                </ul>
                {editMode && (
                  <div className="mt-2 flex flex-col items-start gap-1">
                    <button
                      onClick={() => addWork(group.year, "year-top")}
                      className="text-xs text-neutral-400"
                    >
                      + 在 {group.year} 年添加作品
                    </button>
                    <button
                      onClick={() => {
                        setSeriesDraft({ name: "", count: 3 });
                        setNewSeriesForm(newSeriesForm === group.year ? null : group.year);
                      }}
                      className="text-xs text-neutral-400"
                    >
                      + 新建系列作品
                    </button>

                    {newSeriesForm === group.year && (
                      <div className="w-full mt-1 p-3 rounded-lg border border-neutral-200 bg-neutral-50 space-y-2">
                        <input
                          type="text"
                          autoFocus
                          value={seriesDraft.name}
                          onChange={(e) =>
                            setSeriesDraft((d) => ({ ...d, name: e.target.value }))
                          }
                          placeholder="系列名称，例如 Good Medicine Tastes Bitter"
                          className="w-full text-xs px-2 py-1.5 rounded border border-neutral-300 focus:outline-none focus:border-neutral-900 bg-white"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-neutral-500">初始数量</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={seriesDraft.count}
                            onChange={(e) =>
                              setSeriesDraft((d) => ({ ...d, count: e.target.value }))
                            }
                            className="w-16 text-xs px-2 py-1 rounded border border-neutral-300 bg-white"
                          />
                          <span className="text-xs text-neutral-400">
                            会自动生成 I、II、III… 依次编号
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() =>
                              addSeries(group.year, seriesDraft.name, seriesDraft.count)
                            }
                            disabled={!seriesDraft.name.trim()}
                            className="text-xs font-bold px-3 py-1 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            创建系列
                          </button>
                          <button
                            onClick={() => setNewSeriesForm(null)}
                            className="text-xs px-3 py-1 rounded-full text-neutral-500"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </AccordionContent>
              </div>
            );
          })}

          {editMode && (
            <div className="flex flex-col items-start gap-1">
              <button onClick={addYear} className="text-xs text-neutral-400">
                + 添加新年份 / 新作品
              </button>
              <button onClick={addOldYear} className="text-xs text-neutral-400">
                + 添加旧年份 / 旧作品
              </button>
              {customYearFormOpen ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="number"
                    autoFocus
                    value={customYearInput}
                    onChange={(e) => setCustomYearInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const parsed = Number(customYearInput);
                      if (!Number.isInteger(parsed)) return;
                      addWorkAtYear(parsed);
                      setCustomYearInput("");
                      setCustomYearFormOpen(false);
                    }}
                    placeholder="比如 2025"
                    className="w-20 text-xs px-1.5 py-0.5 rounded border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                  <button
                    onClick={() => {
                      const parsed = Number(customYearInput);
                      if (!Number.isInteger(parsed)) return;
                      addWorkAtYear(parsed);
                      setCustomYearInput("");
                      setCustomYearFormOpen(false);
                    }}
                    className="text-xs font-bold text-neutral-600 hover:text-neutral-900"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setCustomYearFormOpen(false);
                      setCustomYearInput("");
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCustomYearFormOpen(true)}
                  className="text-xs text-neutral-400"
                  title="比如已经有 2026 和 2024，想插入 2025，就用这个"
                >
                  + 添加指定年份 / 作品（插入到对应位置）
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={sidebarFooterRef} className="flex-shrink-0 w-full bg-white">
          {isMobile ? (
            <div className="flex items-center justify-center gap-x-10 px-3 py-3">
              <button
                onClick={goToInfo}
                aria-label="CV"
                title="CV"
              >
                <img src="/icons/cv.svg" alt="" className="h-8 w-8" />
              </button>
              <a
                href={`mailto:${data.contact?.email || ""}`}
                aria-label="Email"
                title="Email"
              >
                <img src="/icons/email.svg" alt="" className="h-8 w-8" />
              </a>
              <a
                href={data.contact?.instagram || "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
              >
                <img src="/icons/instagram.svg" alt="" className="h-8 w-8" />
              </a>
              <a
                href={data.contact?.redNote || "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="RedNote"
                title="RedNote"
              >
                <img src="/icons/rednote.svg" alt="" className="h-8 w-8" />
              </a>
            </div>
          ) : (
            <div
              className="px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-neutral-500"
              style={footerLinksStyle}
              lang={footerLinksLang}
            >
              <button
                onClick={() => !editMode && goToInfo()}
                className={`group ${showInfo ? "text-neutral-900 underline underline-offset-2" : ""}`}
                aria-label="CV"
                title="CV"
              >
                <HoverRevealIcon src="/icons/cv.svg" hoverSrc="/icons/cv-hover.svg" />
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="group"
                  aria-label="Email"
                  title="Email"
                  onClick={() => {
                    if (!editMode && data.contact?.email) {
                      window.location.href = `mailto:${data.contact.email}`;
                    }
                  }}
                >
                  <HoverRevealIcon src="/icons/email.svg" hoverSrc="/icons/email-hover.svg" />
                </button>
                {editMode && (
                  <input
                    type="text"
                    value={data.contact?.email || ""}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), email: e.target.value },
                      }))
                    }
                    placeholder="邮箱地址"
                    className="w-24 flex-shrink-0 text-[10px] text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="group"
                  aria-label="Instagram"
                  title="Instagram"
                  onClick={() => {
                    if (!editMode && data.contact?.instagram) {
                      window.open(data.contact.instagram, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <HoverRevealIcon src="/icons/instagram.svg" hoverSrc="/icons/instagram-hover.svg" />
                </button>
                {editMode && (
                  <input
                    type="text"
                    value={data.contact?.instagram || ""}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), instagram: e.target.value },
                      }))
                    }
                    placeholder="Instagram 链接"
                    className="w-24 flex-shrink-0 text-[10px] text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="group"
                  aria-label="RedNote"
                  title="RedNote"
                  onClick={() => {
                    if (!editMode && data.contact?.redNote) {
                      window.open(data.contact.redNote, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <HoverRevealIcon src="/icons/rednote.svg" hoverSrc="/icons/rednote-hover.svg" />
                </button>
                {editMode && (
                  <input
                    type="text"
                    value={data.contact?.redNote || ""}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), redNote: e.target.value },
                      }))
                    }
                    placeholder="小红书链接"
                    className="w-24 flex-shrink-0 text-[10px] text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 拖拽调整左栏宽度的分隔条：只在编辑模式下显示，拖拽松手后会把这个宽度记下来保存，
          以后就一直用这个手动设置的宽度，不再自动测量；双击可以清除手动设置、恢复自动宽度 */}
      {!isMobile && canEdit && editMode && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isDraggingSidebarRef.current = true;
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMouseMove = (moveEvent) => {
              const delta = moveEvent.clientX - startX;
              const max = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth * 0.6);
              const next = Math.round(
                Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta))
              );
              setSidebarWidth(next);
            };
            const onMouseUp = (upEvent) => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("mouseup", onMouseUp);
              const delta = upEvent.clientX - startX;
              const max = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth * 0.6);
              const finalWidth = Math.round(
                Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta))
              );
              updateData((prev) => ({ ...prev, sidebarWidthOverride: finalWidth }));
              // 数据更新之后再解除拖拽标记，避免中间那一帧 ResizeObserver 抢先重新算了一次导致跳动
              requestAnimationFrame(() => {
                isDraggingSidebarRef.current = false;
              });
            };
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
          }}
          onDoubleClick={() => {
            // 双击清除手动设置的宽度，恢复成自动根据内容测量宽度
            updateData((prev) => {
              const { sidebarWidthOverride, ...rest } = prev;
              return rest;
            });
            requestAnimationFrame(() => recalcSidebarWidth());
          }}
          title="拖拽调整左栏宽度，双击恢复自动宽度"
          className="w-1 flex-shrink-0 cursor-col-resize bg-transparent hover:bg-neutral-300 active:bg-neutral-400 transition-colors relative z-10"
        >
          <div className="absolute inset-y-0 left-0 -right-1" />
        </div>
      )}

      {/* ---------- 右侧：画廊网格 / 详情页 / 艺术家信息（占剩余约 3/4 宽度） ---------- */}
      <main
        ref={mainRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${!isMobile ? "desktop-scrollbar" : ""} ${
          isMobile ? "min-h-0 w-full" : "h-full"
        }`}
        style={{
          // 正在恢复画廊滚动位置的这一小段时间里先隐身，等确认真的定位到正确位置了
          // 再快速淡入显示，避免用户看到"先跳到别的图片、再跳回来"的过程
          opacity: restoringScroll ? 0 : 1,
          transition: restoringScroll ? "none" : "opacity 150ms ease-out",
        }}
      >
        {showInfo ? (
          <InfoView
            sections={data.infoSections || []}
            editMode={editMode}
            titleStyle={infoTitleStyle}
            titleLang={infoTitleLang}
            bodyInfoStyle={infoBodyInfoStyle}
            bodyInfoLang={infoBodyInfoLang}
            bodyExhibitionStyle={infoBodyExhibitionStyle}
            bodyExhibitionLang={infoBodyExhibitionLang}
            exhibitionNameStyle={infoExhibitionNameStyle}
            exhibitionNameLang={infoExhibitionNameLang}
            exhibitionLocationStyle={infoExhibitionLocationStyle}
            exhibitionLocationLang={infoExhibitionLocationLang}
            isZh={isZh}
            tField={tField}
            langKey={langKey}
            onUpdateSection={updateInfoSection}
            onAddSection={addInfoSection}
            onDeleteSection={deleteInfoSection}
            onUpdateEntry={updateInfoEntry}
            onAddEntry={addInfoEntry}
            onDeleteEntry={deleteInfoEntry}
            isMobile={isMobile}
          />
        ) : !selectedWork ? (
          <>
            {isMobile && (
              <div
                className="px-3 pt-5 pb-10 flex flex-col gap-1 text-2xl"
                style={{ fontFamily: "'IBM Plex Sans', -apple-system, Arial, 'PingFang SC', sans-serif" }}
              >
                <button
                  onClick={() => !editMode && goToInfo()}
                  className="flex items-center gap-2 font-bold text-neutral-900 text-left"
                >
                  <MobileLinkArrow />
                  <Editable
                    as="span"
                    editMode={editMode}
                    value={tField(data.contact || {}, "informationLabel") || "Information"}
                    onChange={(v) => updateContact({ [langKey("informationLabel")]: v })}
                  />
                </button>
                <div className="flex items-center gap-2">
                  <a
                    href={editMode ? undefined : `mailto:${data.contact?.email || ""}`}
                    onClick={(e) => {
                      if (editMode) e.preventDefault();
                    }}
                    className="flex items-center gap-2 font-bold text-neutral-900"
                  >
                    <MobileLinkArrow />
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "emailLabel") || "Email"}
                      onChange={(v) => updateContact({ [langKey("emailLabel")]: v })}
                    />
                  </a>
                  {editMode && (
                    <input
                      type="text"
                      value={data.contact?.email || ""}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), email: e.target.value },
                        }))
                      }
                      placeholder="邮箱地址"
                      className="text-xs font-normal text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900 flex-1 min-w-0"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={editMode ? undefined : data.contact?.instagram || "#"}
                    target={editMode ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (editMode) e.preventDefault();
                    }}
                    className="flex items-center gap-2 font-bold text-neutral-900"
                  >
                    <MobileLinkArrow external />
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "instagramLabel") || "Instagram"}
                      onChange={(v) => updateContact({ [langKey("instagramLabel")]: v })}
                    />
                  </a>
                  {editMode && (
                    <input
                      type="text"
                      value={data.contact?.instagram || ""}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), instagram: e.target.value },
                        }))
                      }
                      placeholder="Instagram 链接"
                      className="text-xs font-normal text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900 flex-1 min-w-0"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={editMode ? undefined : data.contact?.redNote || "#"}
                    target={editMode ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (editMode) e.preventDefault();
                    }}
                    className="flex items-center gap-2 font-bold text-neutral-900"
                  >
                    <MobileLinkArrow external />
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "redNoteLabel") || "RedNote"}
                      onChange={(v) => updateContact({ [langKey("redNoteLabel")]: v })}
                    />
                  </a>
                  {editMode && (
                    <input
                      type="text"
                      value={data.contact?.redNote || ""}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), redNote: e.target.value },
                        }))
                      }
                      placeholder="小红书链接"
                      className="text-xs font-normal text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900 flex-1 min-w-0"
                    />
                  )}
                </div>
              </div>
            )}
            <GalleryGrid
              works={data.works}
              editMode={editMode}
              onSelect={goToWork}
              onReplaceCover={replaceCover}
              imageGap={data.imageGap ?? 16}
              isMobile={isMobile}
              skipReveal={justRestoredGallery}
              tField={tField}
              isZh={isZh}
              phonePreview={showPhoneFrame}
            />
          </>
        ) : (
          <DetailView
            work={selectedWork}
            displayTitle={tField(selectedWork, "title")}
            displayMaterials={tField(selectedWork, "materials")}
            displayDimensions={tField(selectedWork, "dimensions")}
            langKey={langKey}
            editMode={editMode}
            titleStyle={detailTitleStyle}
            titleLang={detailTitleLang}
            materialsStyle={detailMaterialsStyle}
            materialsLang={detailMaterialsLang}
            dimensionsStyle={detailDimensionsStyle}
            dimensionsLang={detailDimensionsLang}
            yearStyle={detailDimensionsStyle}
            yearLang={detailDimensionsLang}
            imageGap={data.imageGap ?? 16}
            onUpdate={(patch) => updateWork(selectedWork.id, patch)}
            onAddImage={(file) => addDetailImage(selectedWork.id, file)}
            onReplaceImage={(i, file) => replaceDetailImage(selectedWork.id, i, file)}
            onRemoveImage={(i) => removeDetailImage(selectedWork.id, i)}
            isMobile={isMobile}
            prevWork={detailPrevWork}
            nextWork={detailNextWork}
            onGoToWork={goToWork}
            navDirection={navDirection}
            isZh={isZh}
            isEs={isEs}
            zhText={zhText}
            onBack={goBackToGallery}
          />
        )}
      </main>
    </div>
  );

  // 手动切到"手机预览"、但实际浏览器窗口本身是宽屏的情况下，套一个模拟手机宽度的边框，
  // 这样在电脑上编辑的时候也能看到手机端真实的排版效果（如果本来就是窄屏手机在看，
  // 不需要再多套一层，直接显示就行）
  if (showPhoneFrame) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-neutral-200 overflow-auto py-6">
        <div className="relative h-[930px] w-[500px] flex-shrink-0">
          <div
            className="absolute z-10 overflow-hidden bg-white"
            style={{
              left: "9.25%",
              top: "2.18%",
              width: "81.5%",
              height: "95.64%",
              borderRadius: 40,
            }}
          >
            <div className="absolute inset-x-0 bottom-0 top-12">
              {appRoot}
            </div>
          </div>
          <img
            src="/iphone.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[210] h-full w-full"
          />
        </div>
      </div>
    );
  }

  return appRoot;
}

// 可编辑文本：非编辑模式下就是普通文字，编辑模式下点击即可修改，失焦自动保存
function MobileLinkArrow({ external = false }) {
  return external ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 flex-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19 19 5" />
      <path d="M11 5h8v8" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 flex-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h17" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

// 侧边栏里单个作品条目：普通列表和系列手风琴展开后都复用这个组件
// 手风琴展开内容：用 grid-template-rows 从 0fr 到 1fr 做平滑的高度过渡（配合透明度），
// 下面的内容会跟着一起顺滑地让位/回位，不会突然跳一下。
// 内容始终挂载在 DOM 里（不会真的卸载），宽度测量（recalcSidebarWidth）也用
// useLayoutEffect 提前同步算好，所以这里放心用 overflow-hidden 也不会裁切到文字。
function AccordionContent({ isOpen, children }) {
  return (
    <div
      className="grid min-w-0 transition-[grid-template-rows,opacity] duration-200 ease-in-out"
      style={{
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="overflow-hidden min-h-0 min-w-0">{children}</div>
    </div>
  );
}

function AnimatedSidebarUnderline({ children, active = false, enabled = false }) {
  const [hovered, setHovered] = useState(false);

  if (!enabled) return children;

  const revealed = active || hovered;
  const underlineTextStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: "-12px",
    left: 0,
    zIndex: 1,
    pointerEvents: "none",
    color: "inherit",
    textDecorationLine: "underline",
    textDecorationColor: "#000",
    textDecorationThickness: "2px",
    textUnderlineOffset: "2px",
    textDecorationSkipInk: "all",
    WebkitTextDecorationSkip: "ink",
    clipPath: revealed ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
    transition: "clip-path 240ms ease-out",
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span aria-hidden="true" style={underlineTextStyle}>
        {children}
      </span>
      {children}
    </span>
  );
}

function WorkListItem({
  w,
  displayTitle,
  selectedId,
  editMode,
  bodyTextStyle,
  bodyTextLang,
  underlineEnabled,
  onSelect,
  onChangeTitle,
  onDelete,
  dragHandlers,
}) {
  const { isDragOver, ...dragProps } = dragHandlers || {};
  // 不同作品之间的间距，要始终比同一个标题换行后、行与行之间的间距更大——
  // 不管标题字号/行距在 Aa 面板里被调成多少，这里都在"这一行文字本身的行高"基础上
  // 再额外加一截 margin-bottom，保证作品跟作品之间看起来始终是分开的一组一组，
  // 而不是跟同一个标题换行后的效果混在一起分不清。
  const titleLineHeightPx =
    (parseFloat(bodyTextStyle?.fontSize) || 15) * (parseFloat(bodyTextStyle?.lineHeight) || 1.3);
  const itemSpacing = Math.round(titleLineHeightPx * 0.6);

  return (
    <li
      {...dragProps}
      style={{ marginBottom: itemSpacing }}
      className={`flex items-center gap-1 group rounded transition-colors ${
        isDragOver ? "bg-neutral-100" : ""
      } ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <span
        className={`text-neutral-300 text-xs select-none shrink-0 ${editMode ? "" : "invisible"}`}
        aria-hidden
      >
        ⠿
      </span>
      <button
        onClick={() => !editMode && onSelect()}
        style={bodyTextStyle}
        lang={bodyTextLang}
        className={`text-left min-w-0 ${
          selectedId === w.id
            ? "text-neutral-900"
            : "text-neutral-800"
        }`}
      >
        {editMode ? (
          <Editable value={displayTitle} editMode={editMode} onChange={onChangeTitle} />
        ) : (
          <AnimatedSidebarUnderline
            active={selectedId === w.id}
            enabled={underlineEnabled}
          >
            {displayTitle}
          </AnimatedSidebarUnderline>
        )}
      </button>
      {editMode && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 text-xs transition-opacity shrink-0"
          title="删除这件作品"
        >
          ✕
        </button>
      )}
    </li>
  );
}

function Editable({ value, onChange, className = "", as = "span", editMode, style, onClick, ...rest }) {
  const ref = useRef(null);
  const Tag = as;

  const handleBlur = () => {
    const text = ref.current.innerText.trim();
    if (text !== value) onChange(text || value);
  };

  return (
    <Tag
      ref={ref}
      style={style}
      contentEditable={editMode}
      suppressContentEditableWarning
      onBlur={editMode ? handleBlur : undefined}
      onClick={!editMode && onClick ? onClick : undefined}
      onKeyDown={(e) => {
        if (editMode && e.key === "Enter" && as !== "p") {
          e.preventDefault();
          ref.current.blur();
        }
      }}
      className={
        className +
        (editMode
          ? " outline-dashed outline-1 outline-offset-2 outline-neutral-300 focus:outline-neutral-900 rounded cursor-text"
          : !editMode && onClick
          ? " cursor-pointer"
          : "")
      }
      {...rest}
    >
      {value}
    </Tag>
  );
}

// 把作品按顺序轮流分配到 N 个等宽列里，每列内部再按图片自身高度依次往下排
// 宽度阈值：右侧栏实际可用宽度达到多少时用几列，最多 6 列（超宽屏用）。
// 用容器自身的实际宽度而不是视口宽度来判断，因为左栏宽度是可变的，
// 右侧栏能用的空间不等于整个页面的宽度。
const GALLERY_COLUMN_BREAKPOINTS = [
  { minWidth: 1720, columns: 6 },
  { minWidth: 1400, columns: 5 },
  { minWidth: 1080, columns: 4 },
  { minWidth: 520, columns: 3 },
  { minWidth: 320, columns: 2 },
  { minWidth: 0, columns: 1 },
];
function getGalleryColumnCount(width) {
  const match = GALLERY_COLUMN_BREAKPOINTS.find((bp) => width >= bp.minWidth);
  return match ? match.columns : 1;
}

// 通用的"滚动进入视野时向上渐隐出现"动画：元素刚进入可视范围时，从稍微偏下、透明的状态
// 过渡到正常位置、完全不透明，只触发一次（滚回去不会消失，滚回来也不会重播）。
// 页面刚打开时，一开始就在屏幕内的图片也会播放这个动画（因为它们本来就会被判定为"进入视野"）。
// skip 为 true 时（比如从详情页"返回"画廊，不是第一次看这些图片），直接以最终状态显示，
// 不再重新播放一遍淡入动画——不然每次返回一大片图片同时淡入淡出，看起来跟闪烁一样。
function useRevealAnimation(skip = false) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(skip);

  useEffect(() => {
    if (skip) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [skip]);

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: skip ? "none" : "opacity 700ms ease-out, transform 700ms ease-out",
    },
  };
}

function distributeIntoColumns(items, numCols) {
  const cols = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => cols[i % numCols].push(item));
  return cols;
}

function GalleryGrid({
  works,
  editMode,
  onSelect,
  onReplaceCover,
  imageGap = 16,
  isMobile,
  skipReveal = false,
  tField,
  isZh,
  phonePreview = false,
}) {
  const containerRef = useRef(null);
  const [columnCount, setColumnCount] = useState(() => (isMobile ? 1 : 3));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateColumnCount = () => {
      setColumnCount(isMobile ? 1 : getGalleryColumnCount(el.clientWidth));
    };

    updateColumnCount();
    const ro = new ResizeObserver(updateColumnCount);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // 按列轮流分配：第1张进第1列、第2张进第2列、第3张进第3列，第4张再回到第1列……
  // 这样每一列内部的图片编号始终是严格递增的，整体顺序趋势跟作品顺序基本一致，
  // 只是因为每张图高度不一样，相邻列之间偶尔会有一两张的视觉顺序交错，不会完全精确对应。
  const columns = useMemo(() => distributeIntoColumns(works, columnCount), [works, columnCount]);

  // 手机端图片间距要跟页边距（px-3，12px）保持一致；桌面端还是用可以在编辑模式里调整的 imageGap
  const effectiveGap = isMobile ? 12 : imageGap;

  return (
    <div
      ref={containerRef}
      className={`${phonePreview ? "px-[10px]" : "px-3 md:px-6"} pb-6 flex`}
      style={{ paddingTop: isMobile ? 16 : 40, gap: effectiveGap }}
    >
      {columns.map((colWorks, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col min-w-0" style={{ gap: effectiveGap }}>
          {colWorks.map((w) => (
            <GalleryImage
              key={w.id}
              w={w}
              editMode={editMode}
              onSelect={onSelect}
              onReplaceCover={onReplaceCover}
              skipReveal={skipReveal}
              tField={tField}
              isZh={isZh}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GalleryImage({ w, editMode, onSelect, onReplaceCover, skipReveal, tField, isZh }) {
  const { ref, style } = useRevealAnimation(skipReveal);
  const displayTitle = tField ? tField(w, "title") : w.title;
  return (
    <div ref={ref} style={style} className="relative w-full group">
      <button
        onClick={() => !editMode && onSelect(w.id)}
        style={{ backgroundColor: w.tone }}
        className="block w-full rounded-xl overflow-hidden focus:outline-none"
      >
        <img
          src={w.images?.[0] || w.cover}
          alt={w.title}
          draggable={false}
          loading={skipReveal ? "eager" : "lazy"}
          decoding="async"
          onContextMenu={(e) => !editMode && e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="w-full h-auto object-cover opacity-95 transition-opacity duration-300 select-none pointer-events-none"
          style={{ WebkitTouchCallout: "none" }}
        />
      </button>
      {!editMode && (
        <div
          className="absolute inset-x-0 bottom-0 rounded-b-xl px-3 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0))" }}
        >
          <span
            className={`block text-left text-white text-xs ${isZh ? "" : "italic"}`}
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400 }}
          >
            {displayTitle}
          </span>
        </div>
      )}
      {editMode && (
        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold rounded-xl overflow-hidden">
          更换封面图
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onReplaceCover(w.id, e.target.files[0]);
            }}
          />
        </label>
      )}
    </div>
  );
}

// 艺术家信息页：点击左下角 "Information" 进入
// 把 **加粗** / *斜体* 这种简单标记解析成真正的 <strong>/<em>，用于非编辑模式下展示
// 把一段可能带 <br> 换行的 HTML，按行拆开；每行再拆成"第一个不带空格的词（年份）"
// 和"剩下的部分（名称）"两截，同时保留里面可能有的加粗/斜体格式（用 Range API 在真实 DOM
// 结构上做切割，而不是简单粗暴地按字符位置切字符串，这样才不会把 <strong>/<em> 标签切坏）。
// 兼容旧数据：之前的标题/正文存的是纯文本（用 \n 换行、**/* 这种简单标记），
// 现在改成存真的 HTML 了。如果读到的内容里已经有 HTML 标签、或者已经是转义过的实体符号
// （比如 &amp;），说明已经是新格式处理过的内容了，原样返回，不要再转义一遍——不然像
// "Fashion & Art" 这种带 & 的文字，转义过一次变成 "Fashion &amp; Art" 以后，
// 再被当成"老格式"重新转义，就会变成错误的 "Fashion &amp;amp; Art"。
// 否则就是没处理过的老格式，转义一下特殊字符、把 \n 换成 <br>，这样老内容不用重新编辑也能正常显示。
// 有些浏览器（尤其是 Chrome）在 contentEditable 编辑框里按 Enter 换行时，不一定老实用 <br>，
// 反而会把每一行各自包一层 <div>...</div>（有时候是 <p>...</p>）。这种结构肉眼看着也是正常换行，
// 但后面"按 <br> 拆分段落"的逻辑完全识别不出来，会把整块内容误判成只有一段，导致段间距怎么调都没用。
// 这里统一做一次标准化：把 <div>/<p> 的包裹去掉、换成 <br>，这样不管浏览器实际存的是哪种结构，
// 只要肉眼看着是换行，程序都能正确当成"新的一段"来处理。
function normalizeLineWrappers(html) {
  return html
    .replace(/<(?:div|p)[^>]*>/gi, "")
    .replace(/<\/(?:div|p)>/gi, "<br>")
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>")
    .replace(/^(?:<br\s*\/?>\s*)+/i, "")
    .replace(/(?:<br\s*\/?>\s*)+$/i, "");
}

function ensureHtmlBody(raw) {
  if (!raw) return "";
  if (/<[a-z][\s\S]*>/i.test(raw) || /&(amp|lt|gt|quot|#39|#\d+|#x[0-9a-f]+);/i.test(raw)) {
    return normalizeLineWrappers(raw);
  }
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return normalizeLineWrappers(escaped.replace(/\n/g, "<br>"));
}

// Information / CV 中的标题和正文都由 Aa 面板统一控制字号、字重、字距与行距。
// 旧内容或从其他地方粘贴进来的 HTML 可能带有 style、font、h1-h6 等固定排版，
// 会覆盖面板设置；这里清除这些固定排版，但保留加粗、斜体和换行。
function normalizeInfoTypography(raw, { title = false } = {}) {
  let html = ensureHtmlBody(raw);
  html = html
    .replace(/\s(?:style|size|face|color)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<font\b[^>]*>/gi, "")
    .replace(/<\/font>/gi, "");
  if (title) {
    html = html.replace(/<\/?h[1-6]\b[^>]*>/gi, "");
  } else {
    html = html
      .replace(/<h[1-6]\b[^>]*>/gi, "")
      .replace(/<\/h[1-6]>/gi, "<br>");
  }
  return normalizeLineWrappers(html);
}

// 旧展览数据把“展览名称、地点”写在同一个 name 字段里。移动端需要两行时，
// 优先使用新 location 字段；旧数据则尽量在斜体标题或书名号后的第一个逗号处分开。
function splitExhibitionNameAndLocation(rawName, rawLocation) {
  const name = normalizeInfoTypography(rawName);
  const location = normalizeInfoTypography(rawLocation);
  if (location) return { name, location };

  let splitAt = -1;
  const italicEnd = name.lastIndexOf("</i>");
  if (italicEnd >= 0) {
    const match = /^[，,]\s*/.exec(name.slice(italicEnd + 4));
    if (match) splitAt = italicEnd + 4;
  }
  if (splitAt < 0) {
    const bracketMatch = /》[，,]\s*/.exec(name);
    if (bracketMatch) splitAt = bracketMatch.index + 1;
  }
  if (splitAt < 0) splitAt = name.search(/[，,]/);
  if (splitAt < 0) return { name, location: "" };

  const separator = /^[，,]\s*/.exec(name.slice(splitAt));
  const locationStart = splitAt + (separator ? separator[0].length : 1);
  return {
    name: name.slice(0, splitAt),
    location: name.slice(locationStart),
  };
}

function splitLeadingToken(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const positions = [];
  let plain = "";
  let node;
  while ((node = walker.nextNode())) {
    positions.push({ node, start: plain.length });
    plain += node.nodeValue;
  }
  const match = plain.match(/^(\S+)(\s+)([\s\S]*)$/);
  if (!match) return { yearHtml: "", nameHtml: html };
  const yearEnd = match[1].length;
  const nameStart = match[1].length + match[2].length;

  const findPoint = (charIndex) => {
    for (const p of positions) {
      if (charIndex <= p.start + p.node.nodeValue.length) {
        return { node: p.node, offset: charIndex - p.start };
      }
    }
    const last = positions[positions.length - 1];
    return { node: last.node, offset: last.node.nodeValue.length };
  };

  const yearPoint = findPoint(yearEnd);
  const yearRange = document.createRange();
  yearRange.setStart(container, 0);
  yearRange.setEnd(yearPoint.node, yearPoint.offset);
  const yearDiv = document.createElement("div");
  yearDiv.appendChild(yearRange.cloneContents());

  const namePoint = findPoint(nameStart);
  const nameRange = document.createRange();
  nameRange.setStart(namePoint.node, namePoint.offset);
  nameRange.setEnd(container, container.childNodes.length);
  const nameDiv = document.createElement("div");
  nameDiv.appendChild(nameRange.cloneContents());

  return { yearHtml: yearDiv.innerHTML, nameHtml: nameDiv.innerHTML };
}

// 真正"所见即所得"的加粗/斜体编辑框：直接用浏览器自带的富文本编辑能力（contentEditable +
// execCommand），点加粗/斜体按钮的一瞬间文字就会真的变粗/变斜（不用等切到预览模式才看得到），
// 而且加粗、斜体是各自独立生效的，同一段文字可以同时又粗又斜。存的是真的 HTML
// （比如 <strong>加粗</strong>），不是自己拼的 markdown 标记，好处是浏览器自己就能正确处理
// "加粗里面套斜体"这种叠加情况，不用自己写解析逻辑。
function RichEditableField({
  value,
  onChange,
  as: Tag = "p",
  editMode,
  className,
  style,
  lang,
  showFormatButtons = true,
}) {
  const ref = useRef(null);
  const [formatState, setFormatState] = useState({ bold: false, italic: false });

  // 只有传进来的内容跟 DOM 里现在的内容真的不一样时才去重设 innerHTML——
  // 不然每次点完加粗/斜体按钮，React 重新渲染的时候会把内容"设置成同样的东西"，
  // 这个动作本身会把浏览器当前的文字选区弄丢，导致选区莫名其妙被取消掉。
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = value || "";
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value, editMode]);

  const updateFormatState = () => {
    try {
      setFormatState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
      });
    } catch (err) {
      // 极少数浏览器可能不支持 queryCommandState，安静地忽略就好，不影响正常编辑
    }
  };

  const runCommand = (command) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, null);
    onChange(el.innerHTML);
    updateFormatState();
  };

  const handleFocus = () => {
    // 让浏览器按 Enter 换行的时候用 <br>，不要用 <div>/<p> 包一层，这样换行判断更简单可靠
    document.execCommand("defaultParagraphSeparator", false, "br");
    updateFormatState();
  };

  const handleBlur = () => {
    const html = ref.current.innerHTML;
    if (html !== value) onChange(html);
  };

  if (!editMode) {
    return <Tag className={className} style={style} lang={lang} dangerouslySetInnerHTML={{ __html: value || "" }} />;
  }

  const btnClass = (active) =>
    `text-[11px] w-6 h-6 rounded border transition-colors ${
      active
        ? "bg-neutral-900 text-white border-neutral-900"
        : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <div>
      {showFormatButtons && (
        <div className="flex items-center gap-1 mb-1.5">
          <button
            onMouseDown={(e) => e.preventDefault()} // 防止点按钮的时候先把编辑框的焦点/选区弄丢了
            onClick={() => runCommand("bold")}
            className={btnClass(formatState.bold) + " font-bold"}
            title="加粗选中的文字"
          >
            B
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand("italic")}
            className={btnClass(formatState.italic) + " italic font-serif"}
            title="斜体选中的文字"
          >
            I
          </button>
        </div>
      )}
      <Tag
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={
          className +
          " outline-dashed outline-1 outline-offset-2 outline-neutral-300 focus:outline-neutral-900 rounded cursor-text"
        }
        style={style}
        lang={lang}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseUp={updateFormatState}
        onKeyUp={updateFormatState}
      />
    </div>
  );
}

function InfoView({
  sections,
  editMode,
  titleStyle,
  titleLang,
  bodyInfoStyle,
  bodyInfoLang,
  bodyExhibitionStyle,
  bodyExhibitionLang,
  exhibitionNameStyle,
  exhibitionNameLang,
  exhibitionLocationStyle,
  exhibitionLocationLang,
  isZh,
  tField,
  langKey,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  isMobile,
}) {
  return (
    <div className="px-3 md:px-10 max-w-6xl pb-10" style={{ paddingTop: isMobile ? 24 : 40 }}>
      {sections.length === 0 && !editMode && (
        <p className="text-neutral-400 text-sm">还没有添加任何内容。</p>
      )}

      <div className="space-y-10">
        {sections.map((section) => {
          const isExhibition = section.category === "exhibition";
          const bodyStyle = isExhibition ? bodyExhibitionStyle : bodyInfoStyle;
          const bodyLang = isExhibition ? bodyExhibitionLang : bodyInfoLang;
          const titleHtml = normalizeInfoTypography(tField(section, "title"), { title: true });
          const bodyHtml = normalizeInfoTypography(tField(section, "body"));
          return (
            <div key={section.id} className="group relative">
              {editMode && (
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <button
                    onClick={() =>
                      onUpdateSection(section.id, {
                        category: isExhibition ? "info" : "exhibition",
                      })
                    }
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                    title="切换这个段落属于信息类还是展览类，两类各自有独立的字体样式"
                  >
                    {isExhibition ? "展览类" : "信息类"}
                  </button>
                  {!isMobile && !isExhibition && (
                    <button
                      onClick={() =>
                        onUpdateSection(section.id, { columns: section.columns === 2 ? 1 : 2 })
                      }
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                    >
                      {section.columns === 2 ? "两栏显示" : "一栏显示"}
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteSection(section.id)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    删除这个段落
                  </button>
                </div>
              )}
              <RichEditableField
                key={`title-${editMode}`}
                as="h3"
                value={titleHtml}
                editMode={editMode}
                onChange={(v) => onUpdateSection(section.id, { [langKey("title")]: normalizeInfoTypography(v, { title: true }) })}
                className="mb-3 block"
                style={{ ...titleStyle, overflowWrap: "break-word" }}
                lang={titleLang}
                showFormatButtons={false}
              />
              {isExhibition ? (
                editMode ? (
                  // 展览类编辑：一行一个条目，年份和名称是两个真正分开的输入框，不是靠空格拆的
                  <div className="space-y-3">
                    {(section.entries || []).map((entry) => {
                      const entryParts = splitExhibitionNameAndLocation(
                        tField(entry, "name"),
                        tField(entry, "location")
                      );
                      const entryNameStyle = isMobile ? exhibitionNameStyle : bodyStyle;
                      const entryNameLang = isMobile ? exhibitionNameLang : bodyLang;
                      return (
                      <div key={entry.id} className={isMobile ? "grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2 gap-y-1" : "flex items-start gap-2"}>
                        <input
                          type="text"
                          value={entry.year || ""}
                          onChange={(e) => onUpdateEntry(section.id, entry.id, { year: e.target.value })}
                          placeholder="年份"
                          className="w-20 shrink-0 bg-transparent text-neutral-900 outline-dashed outline-1 outline-offset-2 outline-neutral-300 focus:outline-neutral-900 rounded px-1"
                          style={{ ...bodyStyle }}
                        />
                        <div className="flex-1 min-w-0 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <RichEditableField
                              as="span"
                              value={entryParts.name}
                              editMode={editMode}
                              onChange={(v) => onUpdateEntry(section.id, entry.id, {
                                [langKey("name")]: normalizeInfoTypography(v),
                                [langKey("location")]: entryParts.location,
                              })}
                              className="block"
                              style={{ ...entryNameStyle, overflowWrap: "break-word" }}
                              lang={entryNameLang}
                            />
                          </div>
                          <button
                            onClick={() => onDeleteEntry(section.id, entry.id)}
                            className="text-neutral-300 hover:text-red-500 text-xs shrink-0 mt-2"
                            title="删除这一条展览"
                          >
                            ✕
                          </button>
                        </div>
                        {isMobile && (
                          <>
                            <span aria-hidden="true" />
                            <RichEditableField
                              as="span"
                              value={entryParts.location}
                              editMode={editMode}
                              onChange={(v) => onUpdateEntry(section.id, entry.id, { [langKey("location")]: normalizeInfoTypography(v) })}
                              className="block"
                              style={{ ...exhibitionLocationStyle, overflowWrap: "break-word" }}
                              lang={exhibitionLocationLang}
                            />
                          </>
                        )}
                      </div>
                      );
                    })}
                    <button
                      onClick={() => onAddEntry(section.id)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                    >
                      + 添加一条展览
                    </button>
                  </div>
                ) : (
                  // 展览类展示：年份栏窄、名称栏宽，两栏之间留一点间距、真正按列对齐（不是靠空格拆的）；
                  // 名称如果太长换行，条目内部的行距故意设得比"条目与条目之间"的间距更小，
                  // 这样一眼就能看出哪几行是同一条展览、哪里是换到下一条了。
                  isMobile ? (
                    <div
                      className="font-medium text-neutral-900"
                      style={{
                        ...bodyStyle,
                        overflowWrap: "break-word",
                        display: "flex",
                        flexDirection: "column",
                        gap: `${
                          (parseFloat(bodyStyle.fontSize) || 16) * (parseFloat(bodyStyle.lineHeight) || 1.5) * 0.7
                        }px`,
                      }}
                      lang={bodyLang}
                    >
                      {(section.entries || []).map((entry) => {
                        const entryParts = splitExhibitionNameAndLocation(
                          tField(entry, "name"),
                          tField(entry, "location")
                        );
                        return (
                          <div
                            key={entry.id}
                            className="grid"
                            style={{ gridTemplateColumns: "4rem minmax(0, 1fr)", columnGap: "0.4em", rowGap: "2px" }}
                          >
                            <span style={{ lineHeight: 1.3 }}>{entry.year}</span>
                            <span
                              style={{ ...exhibitionNameStyle, lineHeight: 1.3 }}
                              lang={exhibitionNameLang}
                              dangerouslySetInnerHTML={{ __html: entryParts.name }}
                            />
                            {entryParts.location && (
                              <>
                                <span aria-hidden="true" />
                                <span
                                  style={{ ...exhibitionLocationStyle, lineHeight: 1.3 }}
                                  lang={exhibitionLocationLang}
                                  dangerouslySetInnerHTML={{ __html: entryParts.location }}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                  <div
                    className="font-medium text-neutral-900"
                    style={{
                      ...bodyStyle,
                      overflowWrap: "break-word",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      columnGap: "1.5em",
                      rowGap: `${
                        (parseFloat(bodyStyle.fontSize) || 16) * (parseFloat(bodyStyle.lineHeight) || 1.5) * 0.7
                      }px`,
                    }}
                    lang={bodyLang}
                  >
                    {(section.entries || []).map((entry) => {
                      const entryParts = splitExhibitionNameAndLocation(
                        tField(entry, "name"),
                        tField(entry, "location")
                      );
                      const desktopEntryHtml = entryParts.location
                        ? `${entryParts.name}, ${entryParts.location}`
                        : entryParts.name;
                      return (
                        <React.Fragment key={entry.id}>
                          <span style={{ lineHeight: 1.3 }}>{entry.year}</span>
                          <span
                            style={{ ...(isMobile ? exhibitionNameStyle : bodyStyle), lineHeight: 1.3 }}
                            lang={isMobile ? exhibitionNameLang : bodyLang}
                            dangerouslySetInnerHTML={{ __html: isMobile ? entryParts.name : desktopEntryHtml }}
                          />
                          {isMobile && entryParts.location && (
                            <>
                              <span aria-hidden="true" />
                              <span
                                style={{ ...exhibitionLocationStyle, lineHeight: 1.3 }}
                                lang={exhibitionLocationLang}
                                dangerouslySetInnerHTML={{ __html: entryParts.location }}
                              />
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  )
                )
              ) : editMode ? (
                <RichEditableField
                  as="div"
                  value={bodyHtml}
                  editMode={editMode}
                  onChange={(v) => onUpdateSection(section.id, { [langKey("body")]: normalizeInfoTypography(v) })}
                  className={`font-medium text-neutral-900 block ${
                    !isMobile && section.columns === 2 ? "sm:columns-2 sm:gap-x-16" : ""
                  }`}
                  style={{ ...bodyStyle, overflowWrap: "break-word" }}
                  lang={bodyLang}
                />
              ) : (
                <div
                  className={`font-medium text-neutral-900 ${
                    !isMobile && section.columns === 2 ? "sm:columns-2 sm:gap-x-16" : ""
                  }`}
                  style={{ ...bodyStyle, overflowWrap: "break-word" }}
                  lang={bodyLang}
                >
                  {bodyHtml
                    .split(/<br\s*\/?>/i)
                    .filter((para) => para.replace(/<[^>]+>/g, "").trim() !== "")
                    .map((para, i, arr) => {
                      // 段间距统一按"当前字号 × 行高 × 0.8"来算，中英文共用同一套间距逻辑；
                      // 中文额外保留首行缩进 2 字符（传统排版习惯），英文/西班牙语则不用缩进，
                      // 完全靠段间距来区分段落。最后一段都不需要再留底部间距。
                      const paragraphGap =
                        i === arr.length - 1
                          ? 0
                          : (parseFloat(bodyStyle.fontSize) || 16) *
                            (parseFloat(bodyStyle.lineHeight) || 1.6) *
                            0.8;
                      return (
                        <p
                          key={i}
                          style={
                            isZh
                              ? { textIndent: "2em", marginBottom: `${paragraphGap}px` }
                              : { marginBottom: `${paragraphGap}px` }
                          }
                          dangerouslySetInnerHTML={{ __html: para }}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editMode && (
        <div className="mt-10 flex items-center gap-2">
          <button
            onClick={() => onAddSection("info")}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
          >
            + 添加信息段落
          </button>
          <button
            onClick={() => onAddSection("exhibition")}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
          >
            + 添加展览段落
          </button>
        </div>
      )}
    </div>
  );
}

function DetailView({
  work,
  displayTitle,
  displayMaterials,
  displayDimensions,
  langKey,
  editMode,
  titleStyle,
  titleLang,
  materialsStyle,
  materialsLang,
  dimensionsStyle,
  dimensionsLang,
  yearStyle,
  yearLang,
  imageGap = 16,
  onUpdate,
  onAddImage,
  onReplaceImage,
  onRemoveImage,
  isMobile,
  prevWork,
  nextWork,
  onGoToWork,
  navDirection,
  isZh,
  isEs,
  zhText,
  onBack,
}) {
  const slideAnimation =
    navDirection === "next"
      ? "slideInFromRight"
      : navDirection === "prev"
      ? "slideInFromLeft"
      : "none";

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const metadataRef = useRef(null);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const compactHeaderStyle = useMemo(() => {
    const size = parseFloat(titleStyle?.fontSize);
    return {
      ...titleStyle,
      fontSize: Number.isFinite(size) ? `${size * 0.7}px` : "0.7em",
    };
  }, [titleStyle]);
  const compactHeaderYearStyle = useMemo(() => {
    const weight = parseFloat(titleStyle?.fontWeight);
    const size = parseFloat(compactHeaderStyle.fontSize);
    return {
      ...compactHeaderStyle,
      fontSize: Number.isFinite(size) ? `${size * 0.8}px` : "0.8em",
      fontWeight: Number.isFinite(weight) ? Math.max(100, weight - 200) : 300,
      fontStyle: "normal",
    };
  }, [compactHeaderStyle, titleStyle]);

  useEffect(() => {
    if (isMobile) {
      setShowCompactHeader(false);
      return undefined;
    }
    const metadata = metadataRef.current;
    const scroller = metadata?.closest("main");
    if (!metadata || !scroller) return undefined;
    const updateHeader = () => {
      const metadataBottom = metadata.getBoundingClientRect().bottom;
      const scrollerTop = scroller.getBoundingClientRect().top;
      setShowCompactHeader(metadataBottom <= scrollerTop);
    };
    scroller.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
    return () => scroller.removeEventListener("scroll", updateHeader);
  }, [isMobile, work.id]);

  // 手机端左右滑动切换上一个/下一个作品：记录手指按下的位置，松手时算一下横向、纵向各移动了多少，
  // 横向移动明显大于纵向（说明是横滑不是在滚动页面）、而且超过一定距离才触发切换，
  // 避免正常上下滚动页面的时候不小心被判定成"切换作品"。
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    if (!isMobile || lightboxIndex !== null) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!isMobile || lightboxIndex !== null || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const SWIPE_THRESHOLD = 60;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx < 0 && nextWork) {
      onGoToWork(nextWork.id, "next");
    } else if (dx > 0 && prevWork) {
      onGoToWork(prevWork.id, "prev");
    }
  };

  return (
    <div
      className="flex flex-col min-h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isMobile && (
        <div className="sticky top-0 z-20 h-0 overflow-visible pointer-events-none">
          <div
            className={`w-full bg-white px-10 py-3 text-black transition-transform duration-300 ease-out ${
              showCompactHeader ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <span style={compactHeaderStyle} lang={titleLang}>{displayTitle}</span>
            <span aria-hidden>{"\u00A0".repeat(6)}</span>
            <span style={compactHeaderYearStyle} lang={yearLang}>
              {work.year}
            </span>
          </div>
        </div>
      )}
      <div
        key={work.id}
        className="px-3 md:px-10 max-w-6xl flex-1"
        style={{
          paddingTop: isMobile ? 24 : 40,
          paddingBottom: 96,
          animation: `${slideAnimation} 350ms ease-out both`,
        }}
      >
        <div ref={metadataRef}>
          <div className="mb-6">
            <Editable
              as="h2"
              value={displayTitle}
              editMode={editMode}
              onChange={(v) => onUpdate({ [langKey("title")]: v })}
              style={{ ...titleStyle, overflowWrap: "break-word" }}
              lang={titleLang}
            />
          </div>

          {/* 材料 / 尺寸 / 年份：三个各自独立可编辑、独立调整字号字体行距的文字块，左对齐，
              不设置 max-width，宽度跟下面的图片网格对齐到同一个边缘。 */}
          <div className="mb-10">
            <Editable
            as="p"
            value={displayMaterials}
            editMode={editMode}
            onChange={(v) => onUpdate({ [langKey("materials")]: v })}
            className="text-neutral-900 block mb-6"
            style={{ ...materialsStyle, overflowWrap: "break-word" }}
            lang={materialsLang}
          />
            <Editable
            as="p"
            value={displayDimensions}
            editMode={editMode}
            onChange={(v) => onUpdate({ [langKey("dimensions")]: v })}
            className="text-neutral-900 block mb-2"
            style={{ ...dimensionsStyle, overflowWrap: "break-word" }}
            lang={dimensionsLang}
          />
            <Editable
            as="p"
            value={String(work.year)}
            editMode={editMode}
            onChange={(v) => {
              const parsed = Number(v);
              if (Number.isInteger(parsed) && v.trim() !== "") onUpdate({ year: parsed });
            }}
            className="text-neutral-900 block"
            style={{ ...yearStyle, overflowWrap: "break-word" }}
            lang={yearLang}
            />
          </div>
        </div>

        {isMobile ? (
          <div className="grid grid-cols-1" style={{ gap: imageGap }}>
            {work.images.map((src, i) => (
              <DetailImage
                key={i}
                src={src}
                alt={`${work.title} ${i + 1}`}
                editMode={editMode}
                onReplaceImage={(file) => onReplaceImage(i, file)}
                onRemoveImage={() => onRemoveImage(i)}
                onOpen={() => setLightboxIndex(i)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: imageGap }}>
            {/* 电脑端：两张图片一行，自动根据两张图各自的原始宽高比算出这一行的高度，
                两张图都完整保持原始比例、正好拼满一整行，不裁切也不留白 */}
            {Array.from({ length: Math.ceil(work.images.length / 2) }).map((_, rowIndex) => {
              const startIndex = rowIndex * 2;
              const rowImages = work.images.slice(startIndex, startIndex + 2);
              return (
                <DetailImageRow
                  key={rowIndex}
                  images={rowImages}
                  startIndex={startIndex}
                  workTitle={work.title}
                  editMode={editMode}
                  imageGap={imageGap}
                  onReplaceImage={onReplaceImage}
                  onRemoveImage={onRemoveImage}
                  onOpen={(i) => setLightboxIndex(i)}
                />
              );
            })}
          </div>
        )}

        {editMode && (
          <label className="flex items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 cursor-pointer h-16 text-sm mt-4">
            + 添加图片
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onAddImage(e.target.files[0]);
              }}
            />
          </label>
        )}
      </div>

      {/* 底部 Previous / Next：始终固定在可视区域底部（sticky），白底，第一/最后一件时对应按钮变灰不可点 */}
      <div
        className="sticky bottom-0 bg-white px-3 md:px-10 py-4 flex items-center justify-between"
        style={{ fontFamily: "'IBM Plex Sans', -apple-system, Arial, 'PingFang SC', sans-serif" }}
      >
        <button
          onClick={() => prevWork && onGoToWork(prevWork.id, "prev")}
          disabled={!prevWork}
          className={`flex items-center gap-2 font-bold ${
            prevWork ? "text-neutral-900" : "text-neutral-300 cursor-not-allowed"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 6 9 12 15 18" />
          </svg>
          {isZh ? zhText("上一个") : isEs ? "Anterior" : "Previous"}
        </button>
        <button
          onClick={() => nextWork && onGoToWork(nextWork.id, "next")}
          disabled={!nextWork}
          className={`flex items-center gap-2 font-bold ${
            nextWork ? "text-neutral-900" : "text-neutral-300 cursor-not-allowed"
          }`}
        >
          {isZh ? zhText("下一个") : isEs ? "Siguiente" : "Next"}
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
      {lightboxIndex !== null && (
        <ImageLightbox
          images={work.imagesFull || work.images}
          index={lightboxIndex}
          alt={work.title}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(work.images.length - 1, i + 1))}
        />
      )}
    </div>
  );
}

// 电脑端详情页：两张图片一行，同行高度对齐，中间的分隔线可以左右拖拽调整两张图各占的宽度比例。
// 用固定的行高（按容器宽度用 aspect-ratio 自动换算，宽度不同高度也会跟着等比例缩放，不是写死的像素值）
// 加上 object-cover 裁切来让两张不同比例的图片始终填满各自分到的宽度、保持同样高度。
// 电脑端详情页：两张图片一行，自动根据这两张图各自的原始宽高比算出一个"刚好合适"的行高——
// 两张图都完整保持自己的原始比例，宽度按各自的宽高比例分配，正好拼满一整行，
// 不裁切、也不会留白（这是经典的"两端对齐画廊"算法：行高 = 行宽 / (比例1 + 比例2)）。
function DetailImageRow({
  images,
  startIndex,
  workTitle,
  editMode,
  imageGap,
  onReplaceImage,
  onRemoveImage,
  onOpen,
}) {
  // 只有一张图（图片总数是单数，最后落单的那一张）：单独占满一整行，保持原来的自然高宽比
  if (images.length === 1) {
    return (
      <DetailImage
        src={images[0]}
        alt={`${workTitle} ${startIndex + 1}`}
        editMode={editMode}
        onReplaceImage={(file) => onReplaceImage(startIndex, file)}
        onRemoveImage={() => onRemoveImage(startIndex)}
        onOpen={() => onOpen(startIndex)}
      />
    );
  }

  // 记录这两张图片各自的原始宽高比（宽/高），图片刚加载完才能读到真实尺寸，
  // 加载完之前先用 1:1 占位，图片一读到真实比例就会自动重新排版，基本感觉不到跳动
  const [aspect0, setAspect0] = useState(null);
  const [aspect1, setAspect1] = useState(null);
  const ar0 = aspect0 || 1;
  const ar1 = aspect1 || 1;

  return (
    <div className="flex w-full" style={{ gap: imageGap, aspectRatio: ar0 + ar1 }}>
      <DetailImage
        src={images[0]}
        alt={`${workTitle} ${startIndex + 1}`}
        editMode={editMode}
        onReplaceImage={(file) => onReplaceImage(startIndex, file)}
        onRemoveImage={() => onRemoveImage(startIndex)}
        onOpen={() => onOpen(startIndex)}
        fillHeight
        flexGrow={ar0}
        onNaturalAspect={setAspect0}
      />
      <DetailImage
        src={images[1]}
        alt={`${workTitle} ${startIndex + 2}`}
        editMode={editMode}
        onReplaceImage={(file) => onReplaceImage(startIndex + 1, file)}
        onRemoveImage={() => onRemoveImage(startIndex + 1)}
        onOpen={() => onOpen(startIndex + 1)}
        fillHeight
        flexGrow={ar1}
        onNaturalAspect={setAspect1}
      />
    </div>
  );
}

function DetailImage({
  src,
  alt,
  editMode,
  onReplaceImage,
  onRemoveImage,
  onOpen,
  fillHeight,
  flexGrow,
  onNaturalAspect,
  style,
}) {
  const { ref, style: revealStyle } = useRevealAnimation();
  return (
    <div
      ref={ref}
      style={{
        ...revealStyle,
        ...style,
        flexShrink: fillHeight ? 0 : undefined,
        flexGrow: fillHeight ? flexGrow || 1 : undefined,
        flexBasis: fillHeight ? 0 : undefined,
      }}
      onClick={() => !editMode && onOpen && onOpen()}
      className={`relative rounded-xl overflow-hidden bg-neutral-100 group ${
        editMode ? "" : "cursor-zoom-in"
      }`}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        decoding="async"
        onContextMenu={(e) => !editMode && e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onLoad={
          onNaturalAspect
            ? (e) => onNaturalAspect(e.target.naturalWidth / e.target.naturalHeight)
            : undefined
        }
        className={
          fillHeight
            ? "w-full h-full object-cover select-none pointer-events-none"
            : "w-full h-auto object-cover select-none pointer-events-none"
        }
        style={{ WebkitTouchCallout: "none" }}
      />
      {editMode && (
        <>
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold">
            更换图片
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onReplaceImage(e.target.files[0]);
              }}
            />
          </label>
          <button
            onClick={onRemoveImage}
            className="absolute top-2 right-2 bg-black/60 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

// 图片放大预览：比整个页面稍微小一点，左右箭头切换同一件作品下的图片，右上角关闭
function ImageLightbox({ images, index, onClose, onPrev, onNext, alt }) {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const isDraggingRef = useRef(false);

  // 换到另一张图片的时候，缩放比例和拖拽位置都重置回初始状态
  useEffect(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext]);

  const containerRef = useRef(null);

  // 以某个屏幕位置（手指/鼠标所在的点）为中心缩放，而不是固定死图片正中心——
  // 缩放前后，这个点底下对应的图片内容要保持不动，图片是"以这个点为锚点"放大/缩小的，
  // 不然放大的时候图片会整个跟着偏移，很难对准想看的细节。
  // 数学上：把这个点换算成"图片自身坐标系里的位置"（不受当前缩放/平移影响），
  // 缩放变化后，重新计算需要多少 pan 才能让这个位置还是落在同一个屏幕点上。
  const applyZoomAtPoint = (next, focalPoint) => {
    const clamped = Math.round(Math.max(20, next)); // 不设上限，只留一个很低的下限，避免图片缩没了
    if (clamped <= 100) {
      setZoom(clamped);
      setPan({ x: 0, y: 0 }); // 缩回 100% 及以下就没必要再偏移了，顺手复位
      return;
    }
    if (focalPoint && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const oldScale = zoom / 100;
      const newScale = clamped / 100;
      const localX = (focalPoint.x - center.x - pan.x) / oldScale;
      const localY = (focalPoint.y - center.y - pan.y) / oldScale;
      setPan({
        x: focalPoint.x - center.x - localX * newScale,
        y: focalPoint.y - center.y - localY * newScale,
      });
    }
    setZoom(clamped);
  };
  // 没有具体锚点的场景（比如拖底部滑块）就只改缩放比例，不额外调整平移
  const applyZoom = (next) => applyZoomAtPoint(next, null);

  // 滚轮缩放：触控板双指捏合手势在浏览器里也是 wheel 事件，会带上 ctrlKey，
  // 灵敏度跟普通鼠标滚轮不太一样，分开给一个系数；鼠标滚轮往上滑（deltaY 为负）放大，往下滑缩小。
  // 缩放锚点是鼠标当前所在位置。
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sensitivity = e.ctrlKey ? 2.2 : 0.35;
    applyZoomAtPoint(zoom - e.deltaY * sensitivity, { x: e.clientX, y: e.clientY });
  };

  // 放大超过 100% 之后，按住图片拖拽可以平移查看超出屏幕范围的部分
  const handleImageMouseDown = (e) => {
    if (zoom <= 100) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
    const onMouseMove = (moveEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      setPan({ x: dragRef.current.startPan.x + dx, y: dragRef.current.startPan.y + dy });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      // 稍微延迟一点点再允许点击事件生效，避免拖拽松手的那一下被当成"点击背景关闭"
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 手机端手势：双指捏合缩放（以两指中点为锚点）、单指拖拽平移（放大后才能拖），
  // 跟鼠标滚轮/拖拽共用同一套 zoom/pan 状态，逻辑上是一回事。touchRef 记录这次手势开始时
  // 的状态，方便算相对位移/缩放比例。
  const touchRef = useRef(null);
  const touchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };
  const touchMidpoint = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      touchRef.current = {
        mode: "pinch",
        startDistance: touchDistance(e.touches),
        startZoom: zoom,
      };
    } else if (e.touches.length === 1 && zoom > 100) {
      touchRef.current = {
        mode: "pan",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPan: pan,
      };
    } else {
      touchRef.current = null;
    }
  };

  const handleTouchMove = (e) => {
    const state = touchRef.current;
    if (!state) return;
    if (state.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      isDraggingRef.current = true;
      const scale = touchDistance(e.touches) / state.startDistance;
      applyZoomAtPoint(state.startZoom * scale, touchMidpoint(e.touches));
    } else if (state.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      isDraggingRef.current = true;
      const dx = e.touches[0].clientX - state.startX;
      const dy = e.touches[0].clientY - state.startY;
      setPan({ x: state.startPan.x + dx, y: state.startPan.y + dy });
    }
  };

  const handleTouchEnd = (e) => {
    touchRef.current = null;
    // 双指捏合松开一根手指之后，如果还剩一根手指按着且当前是放大状态，转成拖拽平移，
    // 体验上更连贯（不会一松开某根手指就整个手势直接结束）。
    if (e.touches.length === 1 && zoom > 100) {
      touchRef.current = {
        mode: "pan",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPan: pan,
      };
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={() => {
        if (!isDraggingRef.current) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden px-6 md:px-10 pt-6 md:pt-10 pb-2"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <img
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleImageMouseDown}
          className={`max-w-[88vw] max-h-[80vh] w-auto h-auto object-contain select-none rounded flex-shrink-0 ${
            zoom > 100 ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          style={{
            WebkitTouchCallout: "none",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transition: dragRef.current || touchRef.current ? "none" : "transform 150ms ease-out",
          }}
        />
      </div>

      {/* 缩放滑块：底部居中，实时显示百分比。手机端靠手势缩放，不需要这个，只在电脑端显示 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="hidden md:flex flex-shrink-0 items-center gap-3 bg-white/10 rounded-full px-4 py-2 mb-4 md:mb-6"
      >
        <span className="text-white text-sm select-none" aria-hidden>
          −
        </span>
        <input
          type="range"
          min={100}
          max={500}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="w-40 md:w-56 accent-white"
        />
        <span className="text-white text-sm select-none" aria-hidden>
          +
        </span>
        <span className="text-white text-xs font-bold w-11 text-center select-none">{zoom}%</span>
      </div>

      {/* 关闭：右上角 */}
      <button
        onClick={onClose}
        aria-label="关闭"
        className="absolute top-4 right-4 md:top-6 md:right-6 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>

      {/* 上一张 */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="上一张"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
      )}

      {/* 下一张 */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="下一张"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// 网站真正打开时的入口：先异步加载 public/content.json 里的实际内容，
// 加载完成之前显示一个很轻量的加载提示（不依赖任何图片/数据，秒开），
// 加载好了、加载失败了各自显示对应的状态，避免手机端卡死在白屏。
export default function App() {
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"

  useEffect(() => {
    fetch("/content.json")
      .then((res) => {
        if (!res.ok) throw new Error("network response was not ok");
        return res.json();
      })
      .then((json) => {
        DEFAULT_TYPOGRAPHY = json.typography || {};
        DEFAULT_DATA = json.data || {};
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-neutral-400 text-sm">
        Loading…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-500 text-sm gap-3 px-6 text-center">
        <p>Something went wrong loading this site. Please check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs"
        >
          Reload
        </button>
      </div>
    );
  }

  return <Portfolio />;
}
