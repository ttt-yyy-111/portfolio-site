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
 * ============================================================
 */
export const DEFAULT_TYPOGRAPHY = {
  artistName: { fontSize: 24, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  year: { fontSize: 20, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  workTitle: { fontSize: 15, lineHeight: 1.75, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: true, letterSpacing: 0, fontWidth: 100 },
  detailTitle: { fontSize: 28, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDescription: { fontSize: 19, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  indexNav: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  footerLinks: { fontSize: 12, lineHeight: 1.5, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
};

export const DEFAULT_DATA = {
  artistName: "YU TIANTIAN",
  typography: DEFAULT_TYPOGRAPHY,
  info: "点击这里编辑你的艺术家简介、创作理念、经历或展览履历。",
  imageGap: 16, // 右侧栏图片之间的间距（px），画廊网格和详情页大图都用这个值
  contact: {
    email: "hello@example.com",
    instagram: "https://www.instagram.com/yutiantiano.o/",
  },
  works: [
    {
      id: "growth-marks",
      year: 2026,
      title: "Growth Marks",
      date: "Tue Jul 19 2022",
      description:
        "点击这段文字可以直接修改——写上这件作品的创作背景、材料、想表达的概念。",
      cover: "https://picsum.photos/seed/growth-marks/700/900",
      images: ["https://picsum.photos/seed/growth-marks-1/1200/1500"],
      tone: "#4a4a4a",
    },
    {
      id: "moment-of-stillness",
      year: 2026,
      title: "A Moment of Stillness",
      date: "Wed Aug 03 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/stillness/700/500",
      images: ["https://picsum.photos/seed/stillness-1/1400/1000"],
      tone: "#3f3f3f",
    },
    {
      id: "wedding-on-the-grass",
      year: 2026,
      title: "A Wedding on the Grass",
      date: "Fri Sep 02 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/wedding-grass/700/900",
      images: ["https://picsum.photos/seed/wedding-1/1200/1500"],
      tone: "#454545",
    },
    {
      id: "swaying-softness",
      year: 2025,
      title: "Swaying Softness",
      date: "Tue Mar 15 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/swaying/700/850",
      images: ["https://picsum.photos/seed/swaying-b/1200/1450"],
      tone: "#424242",
    },
    {
      id: "river",
      year: 2025,
      title: "River",
      date: "Sat May 21 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/river/700/900",
      images: ["https://picsum.photos/seed/river-b/1200/1500"],
      tone: "#474747",
    },
    {
      id: "good-medicine-i",
      year: 2025,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter I",
      date: "Mon Feb 10 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-1/700/800",
      images: ["https://picsum.photos/seed/gmtb-1b/1200/1400"],
      tone: "#404040",
    },
    {
      id: "good-medicine-ii",
      year: 2025,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter II",
      date: "Wed Feb 26 2022",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-2/700/850",
      images: ["https://picsum.photos/seed/gmtb-2b/1200/1450"],
      tone: "#434343",
    },
    {
      id: "good-medicine-iii",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter III",
      date: "Mon Jan 12 2026",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-3/700/700",
      images: ["https://picsum.photos/seed/gmtb-3b/1400/1400"],
      tone: "#3e3e3e",
    },
    {
      id: "good-medicine-iv",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter IV",
      date: "Thu Jan 29 2026",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-4/700/900",
      images: ["https://picsum.photos/seed/gmtb-4b/1200/1500"],
      tone: "#464646",
    },
    {
      id: "good-medicine-v",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter V",
      date: "Tue Feb 17 2026",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-5/700/850",
      images: ["https://picsum.photos/seed/gmtb-5b/1200/1450"],
      tone: "#414141",
    },
    {
      id: "good-medicine-vi",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter VI",
      date: "Fri Mar 06 2026",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-6/700/600",
      images: ["https://picsum.photos/seed/gmtb-6b/1400/1200"],
      tone: "#494949",
    },
    {
      id: "good-medicine-vii",
      year: 2026,
      series: "Good Medicine Tastes Bitter",
      title: "Good Medicine Tastes Bitter VII",
      date: "Mon Mar 23 2026",
      description: "点击这段文字可以直接修改。",
      cover: "https://picsum.photos/seed/gmtb-7/700/900",
      images: ["https://picsum.photos/seed/gmtb-7b/1200/1500"],
      tone: "#444444",
    },
  ],
};

