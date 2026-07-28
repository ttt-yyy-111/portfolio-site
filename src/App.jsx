import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { DEFAULT_TYPOGRAPHY, DEFAULT_DATA } from "./content.js";

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
  { key: "detailDescription", label: "Information 页正文" },
  { key: "footerLinks", label: "Information / Email / Instagram" },
];

// 不再需要 STORAGE_KEY —— 内容改动只存在浏览器内存里，靠"导出内容"按钮导出成 content.js

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

export default function Portfolio() {
  const [data, setData] = useState(DEFAULT_DATA); // 直接用 content.js 里的内容做初始值，内存里编辑
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [hasUnexportedChanges, setHasUnexportedChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [navDirection, setNavDirection] = useState(null); // 'prev' | 'next' | null，只有点详情页的Previous/Next才会设置

  // 只有网址带 ?edit=1 的时候才会显示编辑相关的按钮，这样正式访问网站的人看到的是干净的展示页面，
  // 你自己想编辑的时候打开 你的网址/?edit=1 就行
  const [canEdit] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("edit") === "1";
  });

  // ---------- 语言切换：英文 / 中文 / 西班牙语 ----------
  // 默认英文；记住访客上次选择的语言（存在浏览器本地，下次打开这个网站还是他选过的语言）
  const LANGUAGE_OPTIONS = [
    { code: "en", label: "EN", name: "English" },
    { code: "zh", label: "中", name: "中文" },
    { code: "es", label: "ES", name: "Español" },
  ];
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("portfolio-language");
    return LANGUAGE_OPTIONS.some((l) => l.code === saved) ? saved : "en";
  });
  const isZh = language === "zh";
  const isEs = language === "es";
  // 内容字段（标题、材料、尺寸、简介、系列名称）用的语言后缀：中文是 Zh，西班牙语是 Es，英文没有后缀
  const contentLangSuffix = isZh ? "Zh" : isEs ? "Es" : "";
  // 点击语言按钮弹出的下拉菜单是否展开
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef(null);
  // 点击下拉菜单以外的地方（语言按钮本身除外）自动关闭菜单，跟"Aa 文字样式"面板是同一套逻辑
  useEffect(() => {
    if (!languageMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest("[data-language-toggle]")) return;
      if (languageMenuRef.current && !languageMenuRef.current.contains(e.target)) {
        setLanguageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [languageMenuOpen]);
  const selectLanguage = (code) => {
    setLanguage(code);
    setLanguageMenuOpen(false);
    try {
      window.localStorage.setItem("portfolio-language", code);
    } catch (err) {
      // 隐私模式等场景下 localStorage 可能不可用，静默忽略即可，不影响本次切换
    }
  };
  // 语言按钮上显示的是当前语言（不是切换后的语言）
  const languageButtonLabel = LANGUAGE_OPTIONS.find((l) => l.code === language)?.label || "EN";
  // 取某个字段的当前语言版本：中文/西班牙语模式下优先用 xxxZh / xxxEs 字段，没填就自动退回英文原文，
  // 不会因为漏填翻译就显示空白。
  const tField = (obj, key) => {
    if (!obj) return "";
    if (contentLangSuffix) return obj[`${key}${contentLangSuffix}`] || obj[key] || "";
    return obj[key] || "";
  };
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
  // ——除了一种情况：详情页左侧的"返回"按钮，点了要恢复回画廊原来滚动到的位置，不是回到顶部。
  const galleryScrollRef = useRef(0); // 离开画廊之前，记一下画廊滚动到哪了
  const restoreGalleryScrollRef = useRef(false); // 这次回画廊是不是要恢复位置（点了"返回"才是true）
  useLayoutEffect(() => {
    if (!mainRef.current) return;
    if (!selectedId && !showInfo && restoreGalleryScrollRef.current) {
      mainRef.current.scrollTop = galleryScrollRef.current;
      restoreGalleryScrollRef.current = false;
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
    setSelectedId(null);
    setShowInfo(false);
    setMobileMenuOpen(false);
    setNavDirection(null);
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
  };
  // 详情页左侧"返回"按钮专用：回到画廊，并恢复到进入详情页之前画廊滚动到的那个位置，
  // 不是统一回到画廊顶部（这个跟点姓名/Index回首页的 goToGallery 是分开的，互不影响）
  const goBackToGallery = () => {
    restoreGalleryScrollRef.current = true;
    setSelectedId(null);
    setShowInfo(false);
    setMobileMenuOpen(false);
    setNavDirection(null);
  };
  const goToInfo = () => {
    setSelectedId(null);
    setShowInfo(true);
    setMobileMenuOpen(false);
    setNavDirection(null);
  };
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

    const ro = new ResizeObserver(() => recalcSidebarWidth());
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

  // 把当前内容导出成 content.js，下载下来直接替换项目里的 src/content.js 就行
  const exportContent = useCallback(() => {
    const code =
      `// 这个文件是从"编辑模式"里导出的，直接替换掉项目里的 src/content.js 就行\n\n` +
      `export const DEFAULT_TYPOGRAPHY = ${JSON.stringify(data.typography, null, 2)};\n\n` +
      `export const DEFAULT_DATA = ${JSON.stringify(data, null, 2)};\n`;
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
  };

  const updateTypography = (targetKey, patch) => {
    const fieldKey = `typography${isMobile ? "Mobile" : ""}${isZh ? "Zh" : ""}`;
    const deviceBaseKey = isMobile ? "typographyMobile" : "typography";
    updateData((prev) => {
      // 如果这个"设备+语言"组合还没单独调整过，先从同设备的英文版本复制一份出来做起点，
      // 而不是从系统默认值开始（这样调整起来更连贯，不会突然跳回默认大小）
      const basisTypography = prev[deviceBaseKey] || DEFAULT_TYPOGRAPHY;
      const prevTypography = prev[fieldKey] || basisTypography;
      const prevTarget = prevTypography[targetKey] || basisTypography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey];
      return {
        ...prev,
        [fieldKey]: {
          ...prevTypography,
          [targetKey]: { ...prevTarget, ...patch },
        },
      };
    });
  };

  const addWork = (year) => {
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
    updateData((prev) => ({ ...prev, works: [...prev.works, newWork] }));
    goToWork(newWork.id);
  };

  const addYear = () => {
    const existingYears = data.works.map((w) => w.year);
    const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : new Date().getFullYear();
    addWork(nextYear);
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
    updateData((prev) => ({ ...prev, works: [...prev.works, newWork] }));
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
    updateData((prev) => ({ ...prev, works: [...prev.works, ...newWorks] }));
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
  const styleFor = (targetKey) => {
    const t = typography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey];
    const preset = fontOptions.find((f) => f.id === t.fontFamily) || fontOptions[0];
    return {
      fontSize: `${t.fontSize}px`,
      lineHeight: t.lineHeight,
      fontFamily: preset.family,
      fontWeight: t.fontWeight ?? 400,
      fontStyle: t.italic ? "italic" : "normal",
      letterSpacing: `${t.letterSpacing ?? 0}px`,
      ...widthStyleFor(preset, t.fontWidth),
    };
  };

  const artistNameStyle = styleFor("artistName");
  const yearStyle = styleFor("year");
  const workTitleStyle = styleFor("workTitle");
  const detailTitleStyle = styleFor("detailTitle");
  const detailMaterialsStyle = styleFor("detailMaterials");
  const detailDimensionsStyle = styleFor("detailDimensions");
  const infoDescriptionStyle = styleFor("detailDescription");
  const footerLinksStyle = styleFor("footerLinks");

  const activeTypoValue = typography[activeTypoTarget] || DEFAULT_TYPOGRAPHY[activeTypoTarget];
  const activeTypoPreset =
    fontOptions.find((f) => f.id === activeTypoValue.fontFamily) || fontOptions[0];

  // 内置预设里如果标了 googleFont，就去 Google Fonts 加载对应的字重
  const googleFontFamilies = FONT_PRESETS.filter((f) => f.googleFont).map((f) => f.googleFont);

  const showPhoneFrame = canEdit && editMode && editPreviewMode === "mobile";

  const appRoot = (
    <div
      className={`w-full ${showPhoneFrame ? "h-full" : "h-screen"} flex ${
        isMobile ? "flex-col" : "flex-row"
      } bg-white text-neutral-900 overflow-hidden relative`}
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      {googleFontFamilies.length > 0 && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${googleFontFamilies
            .map((f) => `family=${f}`)
            .join("&")}&display=swap`}
        />
      )}

      {/* 顶部工具按钮：中英文切换所有人都能看到；编辑相关的按钮只有网址带 ?edit=1 才会显示 */}
      {!isMobile && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {canEdit && editMode && (
            <>
              <button
                onClick={exportContent}
                title="把当前内容导出成 content.js，下载后替换项目里的 src/content.js"
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  hasUnexportedChanges
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                导出内容{hasUnexportedChanges ? "（有改动）" : ""}
              </button>
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
          {canEdit && editMode && (
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
              onClick={() => setLanguageMenuOpen((v) => !v)}
              data-language-toggle="true"
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              {languageButtonLabel}
            </button>
            {languageMenuOpen && (
              <div
                ref={languageMenuRef}
                className="absolute top-9 right-0 z-30 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-28"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => selectLanguage(opt.code)}
                    className={`w-full text-left text-xs px-3 py-1.5 transition-colors ${
                      opt.code === language
                        ? "font-bold text-neutral-900 bg-neutral-100"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {opt.name}
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
          className="absolute top-12 right-3 z-30 w-72 max-h-[80vh] overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg p-4 space-y-4"
        >
          <div className="text-xs font-bold px-2 py-1 rounded bg-neutral-100 text-neutral-600 inline-block">
            正在编辑：{isMobile ? "手机端" : "电脑端"} · {isZh ? "中文" : "英文"}
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-2">调整对象</div>
            <select
              value={activeTypoTarget}
              onChange={(e) => setActiveTypoTarget(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded-md border border-neutral-300 bg-white"
            >
              {TYPOGRAPHY_TARGETS.map((t) => (
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
              min={1.0}
              max={2.4}
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
          <div className="flex items-center gap-8 min-w-0">
            <Editable
              as="span"
              editMode={editMode}
              value={data.artistName}
              onChange={(v) => updateData((prev) => ({ ...prev, artistName: v }))}
              onClick={goToGallery}
              className="font-bold tracking-tight whitespace-nowrap"
              style={artistNameStyle}
            />
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editMode && (
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

      {/* 手机端编辑工具栏：单独占一行，走正常的文档流，不会跟顶部栏重叠盖住按钮。
          只有编辑模式下才出现，平时访客看到的手机端顶部栏跟以前一样干净。 */}
      {isMobile && canEdit && editMode && (
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 bg-neutral-50 overflow-x-auto">
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
          <button
            onClick={() => {
              setEditMode(false);
              setTypoPanelOpen(false);
              setEditPreviewMode(null);
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
            ? `fixed inset-0 z-40 bg-white flex flex-col ${
                hasMounted ? "transition-transform duration-300 ease-in-out" : ""
              } ${mobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"}`
            : "relative flex-shrink-0 h-full flex flex-col"
        }
        style={isMobile ? undefined : { width: sidebarWidth }}
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
              {isZh ? "索引" : isEs ? "Índice" : "Index"}
            </span>
            <div className="flex items-center gap-6">
              <div className="relative">
                <button
                  onClick={() => setLanguageMenuOpen((v) => !v)}
                  data-language-toggle="true"
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600"
                >
                  {languageButtonLabel}
                </button>
                {languageMenuOpen && (
                  <div
                    ref={languageMenuRef}
                    className="absolute top-9 right-0 z-30 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-32"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        onClick={() => selectLanguage(opt.code)}
                        className={`w-full text-left text-sm px-3 py-2 transition-colors ${
                          opt.code === language
                            ? "font-bold text-neutral-900 bg-neutral-100"
                            : "text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="关闭菜单"
                className="relative p-2 -mr-2 w-12 h-12 flex items-center justify-center"
              >
                <span className="absolute w-7 h-0.5 bg-neutral-900 rotate-45" />
                <span className="absolute w-7 h-0.5 bg-neutral-900 -rotate-45" />
              </button>
            </div>
          </div>
        )}

        {/* 姓名 + 返回图标：单独固定在顶部，不随下面的年份/作品列表滚动 */}
        {!isMobile && (
          <div ref={sidebarHeaderRef} className="flex-shrink-0 px-6 pt-8">
            <div className="w-full flex items-center justify-between mb-8">
              <Editable
                as="h1"
                editMode={editMode}
                value={data.artistName}
                onChange={(v) => updateData((prev) => ({ ...prev, artistName: v }))}
                onClick={goToGallery}
                className="tracking-tight inline-block whitespace-nowrap"
                style={artistNameStyle}
                data-measure-line="true"
              />
              {selectedWork && (
                <button
                  onClick={goBackToGallery}
                  aria-label={isZh ? "返回" : isEs ? "Atrás" : "Back"}
                  title={isZh ? "返回" : isEs ? "Atrás" : "Back"}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

          <div
            ref={sidebarContentRef}
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-6 ${
              isMobile ? "px-4 pt-2" : "px-6 pt-0"
            }`}
          >

          {yearGroups.map((group) => {
            const entries = groupWorksBySeries(group.works);
            const yearOpen = !isMobile || expandedYears[group.year] !== false;
            return (
              <div key={group.year} className="mb-8">
                {isMobile ? (
                  <button
                    onClick={() => !editMode && toggleYear(group.year)}
                    className="relative w-full flex items-center justify-between mb-2"
                  >
                    <span style={yearStyle} data-measure-line="true">
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
                      width="12"
                      height="12"
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
                    className="mb-2 whitespace-nowrap inline-block"
                    style={yearStyle}
                    data-measure-line="true"
                  />
                )}
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
                      <li key={seriesKey}>
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
                            className="relative flex-1 flex items-center text-left text-neutral-800"
                          >
                            <span className="absolute -left-3 inset-y-0 flex items-center" aria-hidden>
                              <svg
                                viewBox="0 0 24 24"
                                width="9"
                                height="9"
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
                                className="min-w-0 whitespace-nowrap"
                                data-measure-line="true"
                              />
                            ) : (
                              <span className="min-w-0 whitespace-nowrap" data-measure-line="true">
                                {displaySeriesName}
                              </span>
                            )}
                          </button>
                        </div>

                        <AccordionContent isOpen={isOpen}>
                          <ul className="ml-1.5 pt-0.5">
                            {entry.works.map((w, memberIndex) => (
                              <WorkListItem
                                key={w.id}
                                w={w}
                                displayTitle={tField(w, "title")}
                                selectedId={selectedId}
                                editMode={editMode}
                                bodyTextStyle={workTitleStyle}
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
                      onClick={() => addWork(group.year)}
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
            <button
              onClick={addYear}
              className="text-xs text-neutral-400"
            >
              + 添加新年份 / 新作品
            </button>
          )}
        </div>

        <div ref={sidebarFooterRef} className="flex-shrink-0 w-full bg-white">
          {isMobile ? (
            <div className="px-4 py-6 text-center">
              <button
                onClick={goToGallery}
                className="font-bold text-neutral-900 text-3xl"
                style={{ fontFamily: "'IBM Plex Sans', -apple-system, Arial, 'PingFang SC', sans-serif" }}
              >
                Home
              </button>
            </div>
          ) : (
            <div
              className="px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-500"
              style={footerLinksStyle}
            >
              <button
                onClick={goToInfo}
                className={showInfo ? "text-neutral-900 underline underline-offset-2" : ""}
              >
                Information
              </button>

              <div className="flex items-center gap-1">
                <a
                  href={editMode ? undefined : `mailto:${data.contact?.email || ""}`}
                  onClick={(e) => {
                    if (editMode) e.preventDefault();
                  }}
                >
                  Email
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
                    className="w-24 flex-shrink-0 text-[10px] text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={editMode ? undefined : data.contact?.instagram || "#"}
                  target={editMode ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (editMode) e.preventDefault();
                  }}
                >
                  Instagram
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
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* ---------- 右侧：画廊网格 / 详情页 / 艺术家信息（占剩余约 3/4 宽度） ---------- */}
      <main
        ref={mainRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${
          isMobile ? "min-h-0 w-full" : "h-full"
        }`}
      >
        {showInfo ? (
          <InfoView
            info={tField(data, "info")}
            editMode={editMode}
            titleStyle={detailTitleStyle}
            descriptionStyle={infoDescriptionStyle}
            onChangeInfo={(v) => updateData((prev) => ({ ...prev, [langKey("info")]: v }))}
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
                  onClick={goToInfo}
                  className="flex items-center gap-2 font-bold text-neutral-900 text-left"
                >
                  <span aria-hidden>→</span> Information
                </button>
                <a
                  href={`mailto:${data.contact?.email || ""}`}
                  className="flex items-center gap-2 font-bold text-neutral-900"
                >
                  <span aria-hidden>→</span> Email
                </a>
                <a
                  href={data.contact?.instagram || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-bold text-neutral-900"
                >
                  <span aria-hidden>↗</span> Instagram
                </a>
              </div>
            )}
            <GalleryGrid
              works={data.works}
              editMode={editMode}
              onSelect={goToWork}
              onReplaceCover={replaceCover}
              imageGap={data.imageGap ?? 16}
              isMobile={isMobile}
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
            materialsStyle={detailMaterialsStyle}
            dimensionsStyle={detailDimensionsStyle}
            yearStyle={detailDimensionsStyle}
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
        <div
          className="bg-white shadow-2xl overflow-hidden flex-shrink-0"
          style={{ width: 430, height: 900, borderRadius: 36, border: "10px solid #1a1a1a" }}
        >
          {appRoot}
        </div>
      </div>
    );
  }

  return appRoot;
}

// 可编辑文本：非编辑模式下就是普通文字，编辑模式下点击即可修改，失焦自动保存
// 侧边栏里单个作品条目：普通列表和系列手风琴展开后都复用这个组件
// 手风琴展开内容：用 grid-template-rows 从 0fr 到 1fr 做平滑的高度过渡（配合透明度），
// 下面的内容会跟着一起顺滑地让位/回位，不会突然跳一下。
// 内容始终挂载在 DOM 里（不会真的卸载），宽度测量（recalcSidebarWidth）也用
// useLayoutEffect 提前同步算好，所以这里放心用 overflow-hidden 也不会裁切到文字。
function AccordionContent({ isOpen, children }) {
  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
      style={{
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

function WorkListItem({
  w,
  displayTitle,
  selectedId,
  editMode,
  bodyTextStyle,
  onSelect,
  onChangeTitle,
  onDelete,
  dragHandlers,
}) {
  const { isDragOver, ...dragProps } = dragHandlers || {};
  return (
    <li
      {...dragProps}
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
        data-measure-line="true"
        className={`text-left whitespace-nowrap ${
          selectedId === w.id
            ? "text-neutral-900 underline underline-offset-2"
            : "text-neutral-800"
        }`}
      >
        {editMode ? (
          <Editable value={displayTitle} editMode={editMode} onChange={onChangeTitle} />
        ) : (
          displayTitle
        )}
      </button>
      {editMode && (
        <button
          onClick={onDelete}
          className="ml-auto opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 text-xs transition-opacity shrink-0"
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
function useRevealAnimation() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
  }, []);

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: "opacity 700ms ease-out, transform 700ms ease-out",
    },
  };
}

function distributeIntoColumns(items, numCols) {
  const cols = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => cols[i % numCols].push(item));
  return cols;
}

function GalleryGrid({ works, editMode, onSelect, onReplaceCover, imageGap = 16, isMobile }) {
  const containerRef = useRef(null);
  const [columnCount, setColumnCount] = useState(3);

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
      className="px-3 md:px-6 pb-6 flex"
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
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GalleryImage({ w, editMode, onSelect, onReplaceCover }) {
  const { ref, style } = useRevealAnimation();
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
          onContextMenu={(e) => !editMode && e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="w-full h-auto object-cover opacity-95 transition-opacity duration-300 select-none pointer-events-none"
          style={{ WebkitTouchCallout: "none" }}
        />
      </button>
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
function InfoView({ info, editMode, titleStyle, descriptionStyle, onChangeInfo, isMobile }) {
  return (
    <div className="px-4 md:px-10 pb-10 max-w-3xl" style={{ paddingTop: isMobile ? 24 : 40 }}>
      <h2 className="mb-6" style={titleStyle}>
        Information
      </h2>
      <Editable
        as="p"
        value={info}
        editMode={editMode}
        onChange={onChangeInfo}
        className="font-medium text-neutral-900 whitespace-pre-line block"
        style={descriptionStyle}
      />
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
  materialsStyle,
  dimensionsStyle,
  yearStyle,
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
  onBack,
}) {
  const slideAnimation =
    navDirection === "next"
      ? "slideInFromRight"
      : navDirection === "prev"
      ? "slideInFromLeft"
      : "none";

  const [lightboxIndex, setLightboxIndex] = useState(null);

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
      <div
        key={work.id}
        className="px-3 md:px-10 max-w-6xl flex-1"
        style={{
          paddingTop: isMobile ? 24 : 40,
          paddingBottom: 96,
          animation: `${slideAnimation} 350ms ease-out both`,
        }}
      >
        <div className="mb-6">
          <Editable
            as="h2"
            value={displayTitle}
            editMode={editMode}
            onChange={(v) => onUpdate({ [langKey("title")]: v })}
            style={titleStyle}
          />
        </div>

        {/* 材料 / 尺寸 / 年份：三个各自独立可编辑、独立调整字号字体行距的文字块。
            两端对齐（最后一行自动变回左对齐，这是 text-align: justify 的标准行为），
            不设置 max-width，宽度跟下面的图片网格对齐到同一个边缘。 */}
        <div className="mb-10">
          <Editable
            as="p"
            value={displayMaterials}
            editMode={editMode}
            onChange={(v) => onUpdate({ [langKey("materials")]: v })}
            className="text-neutral-900 block mb-6"
            style={{ ...materialsStyle, textAlign: "justify" }}
          />
          <Editable
            as="p"
            value={displayDimensions}
            editMode={editMode}
            onChange={(v) => onUpdate({ [langKey("dimensions")]: v })}
            className="text-neutral-900 block mb-2"
            style={{ ...dimensionsStyle, textAlign: "justify" }}
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
            style={{ ...yearStyle, textAlign: "justify" }}
          />
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
                onOpen={undefined}
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
          {isZh ? "上一个" : isEs ? "Anterior" : "Previous"}
        </button>
        <button
          onClick={() => nextWork && onGoToWork(nextWork.id, "next")}
          disabled={!nextWork}
          className={`flex items-center gap-2 font-bold ${
            nextWork ? "text-neutral-900" : "text-neutral-300 cursor-not-allowed"
          }`}
        >
          {isZh ? "下一个" : isEs ? "Siguiente" : "Next"}
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
  // 换到另一张图片的时候，缩放比例重置回 100%
  useEffect(() => {
    setZoom(100);
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

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-auto px-6 md:px-10 pt-6 md:pt-10 pb-2">
        <img
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[88vw] max-h-[80vh] w-auto h-auto object-contain select-none rounded flex-shrink-0"
          style={{
            WebkitTouchCallout: "none",
            transform: `scale(${zoom / 100})`,
            transition: "transform 150ms ease-out",
          }}
        />
      </div>

      {/* 缩放滑块：底部居中，实时显示百分比，最大放大到 200% */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 flex items-center gap-3 bg-white/10 rounded-full px-4 py-2 mb-4 md:mb-6"
      >
        <span className="text-white text-sm select-none" aria-hidden>
          −
        </span>
        <input
          type="range"
          min={100}
          max={200}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
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
