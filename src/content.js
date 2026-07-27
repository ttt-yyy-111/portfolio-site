/**
 * ============================================================
 *  这个文件就是你以后要改的内容——姓名、简介、联系方式、
 *  每一件作品的标题/年份/日期/介绍/图片，以及所有排版设置。
 *
 *  改法有两种：
 *  1) 直接手动改这个文件里的文字/数值
 *  2) 打开网站加上 ?edit=1（比如 http://localhost:5173/?edit=1），
 *     进入可视化编辑模式，点哪改哪，改完点导出内容，
 *     下载到的 content.js 直接替换掉这个文件就行
 *
 *  ---- 中英文切换 ----
 *  网站右上角（手机上是顶部栏）有个中英文切换按钮，默认显示英文。
 *  想让某段文字也有中文版本，就在对应字段后面加一个 "Zh" 结尾的新字段：
 *    title      → titleZh
 *    materials  → materialsZh（材料）
 *    dimensions → dimensionsZh（尺寸）
 *    series     → seriesZh（系列作品的名称，比如 "Good Medicine Tastes Bitter"）
 *    info       → infoZh
 *  没写 xxxZh 的内容，切到中文的时候会自动显示英文原文，不会空白。
 *  姓名（YU TIANTIAN）、年份、日期、Information/Email/Instagram 这几项
 *  中英文下显示的是同一份内容，没有做区分。
 *  ---- 电脑端 / 手机端字体样式分开设置 ----
 *  编辑模式下，右上角"电脑预览 / 手机预览"可以切换正在编辑哪一端；切到手机预览之后，
 *  会看到一个手机宽度的预览框，这时候用"Aa 文字样式"面板调的字号/字体/行距这些，
 *  只会影响手机端（存在下面这个 typographyMobile 里），不会影响电脑端的 typography，
 *  两者互不干扰。文字和图片内容（标题、介绍、图片本身）不受这个影响，两端永远是同一份。
 * ============================================================
 */
export const DEFAULT_TYPOGRAPHY = {
  artistName: { fontSize: 24, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  year: { fontSize: 20, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  workTitle: { fontSize: 15, lineHeight: 1.75, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: true, letterSpacing: 0, fontWidth: 100 },
  detailTitle: { fontSize: 28, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailMaterials: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDimensions: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDescription: { fontSize: 19, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  indexNav: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  footerLinks: { fontSize: 12, lineHeight: 1.5, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
};

// 手机端独立的排版设置，延续了之前手动调过的大致比例（姓名更大、年份/作品标题也放大一些），
// 以后在"手机预览"里用 Aa 面板调整，改的就是这里，不会影响上面电脑端那份
export const DEFAULT_TYPOGRAPHY_MOBILE = {
  artistName: { fontSize: 46, lineHeight: 1.15, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  year: { fontSize: 26, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  workTitle: { fontSize: 19, lineHeight: 1.75, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: true, letterSpacing: 0, fontWidth: 100 },
  detailTitle: { fontSize: 28, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailMaterials: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDimensions: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDescription: { fontSize: 19, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  indexNav: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  footerLinks: { fontSize: 12, lineHeight: 1.5, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
};

export const DEFAULT_DATA = {
  artistName: "YU TIANTIAN",
  typography: DEFAULT_TYPOGRAPHY,
  typographyMobile: DEFAULT_TYPOGRAPHY_MOBILE,
  info: "点击这里编辑你的艺术家简介、创作理念、经历或展览履历。",
  infoZh: "点击这里编辑你的艺术家简介、创作理念、经历或展览履历（中文版）。",
  imageGap: 16, // 右侧栏图片之间的间距（px），画廊网格和详情页大图都用这个值
  contact: {
    email: "847187284tina@gmail.com",
    instagram: "https://www.instagram.com/yutiantiano.o/",
  },
  works: [
    {
      id: "growth-marks",
      year: 2026,
      title: "Growth Marks",
      titleZh: "生长的痕迹",
      date: "Tue Jul 19 2022",
      materials: "Acrylic and collage on canvas",
      materialsZh: "布面丙烯拼贴",
      dimensions: "120 x 90 cm",
      dimensionsZh: "120 x 90 厘米",
      cover: "https://picsum.photos/seed/growth-marks/700/900",
      images: ["https://picsum.photos/seed/growth-marks-1/1200/1500"],
      tone: "#4a4a4a",
    },
    {
      id: "moment-of-stillness",
      year: 2026,
      title: "A Moment of Stillness",
      date: "Wed Aug 03 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/stillness/700/500",
      images: ["https://picsum.photos/seed/stillness-1/1400/1000"],
      tone: "#3f3f3f",
    },
    {
      id: "wedding-on-the-grass",
      year: 2026,
      title: "A Wedding on the Grass",
      date: "Fri Sep 02 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/wedding-grass/700/900",
      images: ["https://picsum.photos/seed/wedding-1/1200/1500"],
      tone: "#454545",
    },
    {
      id: "swaying-softness",
      year: 2025,
      title: "Swaying Softness",
      date: "Tue Mar 15 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/swaying/700/850",
      images: ["https://picsum.photos/seed/swaying-b/1200/1450"],
      tone: "#424242",
    },
    {
      id: "river",
      year: 2025,
      title: "River",
      date: "Sat May 21 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/river/700/900",
      images: ["https://picsum.photos/seed/river-b/1200/1500"],
      tone: "#474747",
    },
    {
      id: "good-medicine-i",
      year: 2025,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter I",
      date: "Mon Feb 10 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-1/700/800",
      images: ["https://picsum.photos/seed/gmtb-1b/1200/1400"],
      tone: "#404040",
    },
    {
      id: "good-medicine-ii",
      year: 2025,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter II",
      date: "Wed Feb 26 2022",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-2/700/850",
      images: ["https://picsum.photos/seed/gmtb-2b/1200/1450"],
      tone: "#434343",
    },
    {
      id: "good-medicine-iii",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter III",
      date: "Mon Jan 12 2026",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-3/700/700",
      images: ["https://picsum.photos/seed/gmtb-3b/1400/1400"],
      tone: "#3e3e3e",
    },
    {
      id: "good-medicine-iv",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter IV",
      date: "Thu Jan 29 2026",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-4/700/900",
      images: ["https://picsum.photos/seed/gmtb-4b/1200/1500"],
      tone: "#464646",
    },
    {
      id: "good-medicine-v",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter V",
      date: "Tue Feb 17 2026",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-5/700/850",
      images: ["https://picsum.photos/seed/gmtb-5b/1200/1450"],
      tone: "#414141",
    },
    {
      id: "good-medicine-vi",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter VI",
      date: "Fri Mar 06 2026",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-6/700/600",
      images: ["https://picsum.photos/seed/gmtb-6b/1400/1200"],
      tone: "#494949",
    },
    {
      id: "good-medicine-vii",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      seriesZh: "良药苦口",
      title: "Good Medicine Tastes Bitter VII",
      date: "Mon Mar 23 2026",
      materials: "点击这里填写材料，比如 Oil on canvas",
      dimensions: "点击这里填写尺寸，比如 100 x 80 cm",
      cover: "https://picsum.photos/seed/gmtb-7/700/900",
      images: ["https://picsum.photos/seed/gmtb-7b/1200/1500"],
      tone: "#444444",
    },
  ],
};

