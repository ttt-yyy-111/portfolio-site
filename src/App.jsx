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
  { key: "infoTitle", label: "Information 页段落标题" },
  { key: "infoBodyInfo", label: "Information 页详细内容 · 信息类" },
  { key: "infoBodyExhibition", label: "Information 页详细内容 · 展览类" },
  { key: "footerLinks", label: "Information / Email / Instagram" },
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

function Portfolio() {
  const [data, setData] = useState(DEFAULT_DATA); // 直接用 content.json 里的内容做初始值，内存里编辑
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 详情页里点开图片能看到的"高清大图"（imagesFull）单独存在另一个文件里，不算在
  // 首次打开要下载的 content.json 里面——先用分辨率没那么高、但小得多的普通图把页面渲染出来，
  // 高清图放到后台单独异步加载，加载完了再悄悄合并进数据里。加载完成之前点开大图看到的
  // 还是普通分辨率的图（自动降级，不会出错、也不会空白），加载好了自动补上，用户不会感觉到卡顿。
  useEffect(() => {
    fetch("/content-images-full.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((fullImagesMap) => {
        if (!fullImagesMap || Object.keys(fullImagesMap).length === 0) return;
        setData((prev) => ({
          ...prev,
          works: prev.works.map((w) =>
            fullImagesMap[w.id] ? { ...w, imagesFull: fullImagesMap[w.id] } : w
          ),
        }));
      })
      .catch(() => {}); // 高清图没加载到就算了，详情页会自动退回用普通分辨率的图，不影响使用
  }, []);

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
  // 每次打开网站都固定显示英文，不记住上次关闭时选的是哪个语言
  const LANGUAGE_OPTIONS = [
    { code: "en", label: "EN", name: "English" },
    { code: "zh", label: "中", name: "中文" },
    { code: "es", label: "ES", name: "Español" },
  ];
  const [language, setLanguage] = useState("en");
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
    // 如果现在正在画廊页，先记一下画廊滚动到哪了，方便Information页的"返回"按钮能回到这个位置
    if (!selectedId && !showInfo && mainRef.current) {
      galleryScrollRef.current = mainRef.current.scrollTop;
    }
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
  // - content.json：不含"高清大图"（imagesFull），体积小很多，网站一打开就要下载这个
  // - content-images-full.json：单独存放每件作品的高清大图，网站后台异步加载，不影响首次打开的速度
  // 下载下来，两个都要放进项目的 public 文件夹（替换掉旧的）
  const exportContent = useCallback(() => {
    const worksWithoutFullImages = data.works.map(({ imagesFull, ...rest }) => rest);
    const mainData = { ...data, works: worksWithoutFullImages };
    const mainJson = JSON.stringify({ typography: data.typography, data: mainData }, null, 2);

    const fullImagesMap = {};
    data.works.forEach((w) => {
      if (w.imagesFull && w.imagesFull.length > 0) fullImagesMap[w.id] = w.imagesFull;
    });
    const fullImagesJson = JSON.stringify(fullImagesMap, null, 2);

    const download = (content, filename) => {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
    download(mainJson, "content.json");
    download(fullImagesJson, "content-images-full.json");
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
    const newSection = {
      id: uid(),
      category,
      title: category === "exhibition" ? "新展览" : "新段落标题",
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
  };
  const deleteInfoSection = (id) => {
    updateData((prev) => ({
      ...prev,
      infoSections: (prev.infoSections || []).filter((s) => s.id !== id),
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
    const t = typography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey];
    return isZh ? CJK_LANG_BY_FONT_ID[t.fontFamily] : undefined;
  };

  const styleFor = (targetKey) => {
    const t = typography[targetKey] || DEFAULT_TYPOGRAPHY[targetKey];
    const preset = fontOptions.find((f) => f.id === t.fontFamily) || fontOptions[0];

    // 中文模式下的字体规则：
    // ——选中思源黑体（简体）或思源黑體（繁体）时，用本地字体文件拼一个复合字体栈：
    //   中文标点固定用思源黑体（简体）的标点字形，英文和汉字本身都按实际选择的
    //   字体显示（选中字体自带的西文字形 + 简体/繁体字形）。
    // ——选中其他 Sans Serif / Serif 字体（没有对应本地字体文件）时，完全按选中的字体显示，
    //   不做任何覆盖。英文/西班牙语模式同样完全按选中的字体显示。
    let fontFamily = preset.family;
    if (isZh && preset.id === "source-han-sans-sc") {
      fontFamily = "'Source Han Sans SC Punctuation', 'Source Han Sans SC Full', sans-serif";
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
  const footerLinksStyle = styleFor("footerLinks");
  const footerLinksLang = langFor("footerLinks");

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
                title="把当前内容导出成 content.json 和 content-images-full.json 两个文件，下载后都放进项目的 public 文件夹替换掉旧的"
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
              lang={artistNameLang}
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
                  className="text-sm font-bold px-3.5 py-2 rounded-full bg-neutral-100 text-neutral-600"
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
                              <span className="min-w-0">{displaySeriesName}</span>
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
              lang={footerLinksLang}
            >
              <button
                onClick={() => !editMode && goToInfo()}
                className={showInfo ? "text-neutral-900 underline underline-offset-2" : ""}
              >
                <Editable
                  as="span"
                  editMode={editMode}
                  value={tField(data.contact || {}, "informationLabel") || "Information"}
                  onChange={(v) =>
                    updateData((prev) => ({
                      ...prev,
                      contact: { ...(prev.contact || {}), [langKey("informationLabel")]: v },
                    }))
                  }
                />
              </button>

              <div className="flex items-center gap-1">
                <a
                  href={editMode ? undefined : `mailto:${data.contact?.email || ""}`}
                  onClick={(e) => {
                    if (editMode) e.preventDefault();
                  }}
                >
                  <Editable
                    as="span"
                    editMode={editMode}
                    value={tField(data.contact || {}, "emailLabel") || "Email"}
                    onChange={(v) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), [langKey("emailLabel")]: v },
                      }))
                    }
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
                  <Editable
                    as="span"
                    editMode={editMode}
                    value={tField(data.contact || {}, "instagramLabel") || "Instagram"}
                    onChange={(v) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), [langKey("instagramLabel")]: v },
                      }))
                    }
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
                    className="w-24 flex-shrink-0 text-[10px] text-neutral-400 bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={editMode ? undefined : data.contact?.redNote || "#"}
                  target={editMode ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (editMode) e.preventDefault();
                  }}
                >
                  <Editable
                    as="span"
                    editMode={editMode}
                    value={tField(data.contact || {}, "redNoteLabel") || "RedNote"}
                    onChange={(v) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), [langKey("redNoteLabel")]: v },
                      }))
                    }
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
        className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${
          isMobile ? "min-h-0 w-full" : "h-full"
        }`}
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
            isZh={isZh}
            tField={tField}
            langKey={langKey}
            onUpdateSection={updateInfoSection}
            onAddSection={addInfoSection}
            onDeleteSection={deleteInfoSection}
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
                  <span aria-hidden>→</span>
                  <Editable
                    as="span"
                    editMode={editMode}
                    value={tField(data.contact || {}, "informationLabel") || "Information"}
                    onChange={(v) =>
                      updateData((prev) => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), [langKey("informationLabel")]: v },
                      }))
                    }
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
                    <span aria-hidden>→</span>
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "emailLabel") || "Email"}
                      onChange={(v) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), [langKey("emailLabel")]: v },
                        }))
                      }
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
                    <span aria-hidden>↗</span>
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "instagramLabel") || "Instagram"}
                      onChange={(v) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), [langKey("instagramLabel")]: v },
                        }))
                      }
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
                    <span aria-hidden>↗</span>
                    <Editable
                      as="span"
                      editMode={editMode}
                      value={tField(data.contact || {}, "redNoteLabel") || "RedNote"}
                      onChange={(v) =>
                        updateData((prev) => ({
                          ...prev,
                          contact: { ...(prev.contact || {}), [langKey("redNoteLabel")]: v },
                        }))
                      }
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

function WorkListItem({
  w,
  displayTitle,
  selectedId,
  editMode,
  bodyTextStyle,
  bodyTextLang,
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
// 把 **加粗** / *斜体* 这种简单标记解析成真正的 <strong>/<em>，用于非编辑模式下展示
// 把一段可能带 <br> 换行的 HTML，按行拆开；每行再拆成"第一个不带空格的词（年份）"
// 和"剩下的部分（名称）"两截，同时保留里面可能有的加粗/斜体格式（用 Range API 在真实 DOM
// 结构上做切割，而不是简单粗暴地按字符位置切字符串，这样才不会把 <strong>/<em> 标签切坏）。
// 兼容旧数据：之前的标题/正文存的是纯文本（用 \n 换行、**/* 这种简单标记），
// 现在改成存真的 HTML 了。如果读到的内容里已经有 HTML 标签，说明是新格式，原样返回；
// 否则就是老格式，转义一下特殊字符、把 \n 换成 <br>，这样老内容不用重新编辑也能正常显示。
function ensureHtmlBody(raw) {
  if (!raw) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br>");
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
function RichEditableField({ value, onChange, as: Tag = "p", editMode, className, style, lang }) {
  const ref = useRef(null);

  const runCommand = (command) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, null);
    onChange(el.innerHTML);
  };

  const handleFocus = () => {
    // 让浏览器按 Enter 换行的时候用 <br>，不要用 <div>/<p> 包一层，这样换行判断更简单可靠
    document.execCommand("defaultParagraphSeparator", false, "br");
  };

  const handleBlur = () => {
    const html = ref.current.innerHTML;
    if (html !== value) onChange(html);
  };

  if (!editMode) {
    return <Tag className={className} style={style} lang={lang} dangerouslySetInnerHTML={{ __html: value || "" }} />;
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <button
          onMouseDown={(e) => e.preventDefault()} // 防止点按钮的时候先把编辑框的焦点/选区弄丢了
          onClick={() => runCommand("bold")}
          className="text-[11px] font-bold w-6 h-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="加粗选中的文字"
        >
          B
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand("italic")}
          className="text-[11px] italic font-serif w-6 h-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="斜体选中的文字"
        >
          I
        </button>
      </div>
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
        dangerouslySetInnerHTML={{ __html: value || "" }}
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
  isZh,
  tField,
  langKey,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
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
                as="h3"
                value={ensureHtmlBody(tField(section, "title"))}
                editMode={editMode}
                onChange={(v) => onUpdateSection(section.id, { [langKey("title")]: v })}
                className="mb-3 block"
                style={{ ...titleStyle, overflowWrap: "break-word" }}
                lang={titleLang}
              />
              {editMode ? (
                <RichEditableField
                  as="div"
                  value={ensureHtmlBody(tField(section, "body"))}
                  editMode={editMode}
                  onChange={(v) => onUpdateSection(section.id, { [langKey("body")]: v })}
                  className={`font-medium text-neutral-900 block ${
                    isExhibition
                      ? ""
                      : !isMobile && section.columns === 2
                      ? "sm:columns-2 sm:gap-x-16"
                      : ""
                  }`}
                  style={{ ...bodyStyle, overflowWrap: "break-word" }}
                  lang={bodyLang}
                />
              ) : isExhibition ? (
                // 展览类：每一行按"年份 + 空格 + 展览名称"拆成两栏对应显示，
                // 年份栏窄、名称栏宽，两栏之间留一点间距；不额外加大段落间距，也不做首行缩进。
                <div
                  className="font-medium text-neutral-900"
                  style={{
                    ...bodyStyle,
                    overflowWrap: "break-word",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: "1.5em",
                  }}
                  lang={bodyLang}
                >
                  {ensureHtmlBody(tField(section, "body"))
                    .split(/<br\s*\/?>/i)
                    .filter((line) => line.replace(/<[^>]+>/g, "").trim() !== "")
                    .map((line, i) => {
                      const { yearHtml, nameHtml } = splitLeadingToken(line);
                      return (
                        <React.Fragment key={i}>
                          <span dangerouslySetInnerHTML={{ __html: yearHtml }} />
                          <span dangerouslySetInnerHTML={{ __html: nameHtml }} />
                        </React.Fragment>
                      );
                    })}
                </div>
              ) : (
                <div
                  className={`font-medium text-neutral-900 ${
                    !isMobile && section.columns === 2 ? "sm:columns-2 sm:gap-x-16" : ""
                  }`}
                  style={{ ...bodyStyle, overflowWrap: "break-word" }}
                  lang={bodyLang}
                >
                  {ensureHtmlBody(tField(section, "body"))
                    .split(/<br\s*\/?>/i)
                    .filter((para) => para.replace(/<[^>]+>/g, "").trim() !== "")
                    .map((para, i) => (
                      <p
                        key={i}
                        style={
                          isZh
                            ? { textIndent: "2em" }
                            : {
                                marginBottom: `${
                                  (parseFloat(bodyStyle.fontSize) || 16) *
                                  (parseFloat(bodyStyle.lineHeight) || 1.6) *
                                  0.6
                                }px`,
                              }
                        }
                        dangerouslySetInnerHTML={{ __html: para }}
                      />
                    ))}
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

  const applyZoom = (next) => {
    const clamped = Math.round(Math.min(500, Math.max(100, next)));
    setZoom(clamped);
    if (clamped <= 100) setPan({ x: 0, y: 0 }); // 缩回 100% 及以下就没必要再偏移了，顺手复位
  };

  // 滚轮缩放：触控板双指捏合手势在浏览器里也是 wheel 事件，会带上 ctrlKey，
  // 灵敏度跟普通鼠标滚轮不太一样，分开给一个系数；鼠标滚轮往上滑（deltaY 为负）放大，往下滑缩小。
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sensitivity = e.ctrlKey ? 2.2 : 0.35;
    applyZoom(zoom - e.deltaY * sensitivity);
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
        className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden px-6 md:px-10 pt-6 md:pt-10 pb-2"
        onWheel={handleWheel}
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
            transition: dragRef.current ? "none" : "transform 150ms ease-out",
          }}
        />
      </div>

      {/* 缩放滑块：底部居中，实时显示百分比，最大放大到 500% */}
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
        加载中…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-500 text-sm gap-3 px-6 text-center">
        <p>内容加载失败，请检查网络后刷新页面重试。</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs"
        >
          刷新页面
        </button>
      </div>
    );
  }

  return <Portfolio />;
}
