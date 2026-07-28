/**
 * ============================================================
 *  这个文件就是你以后要改的内容——姓名、简介、联系方式、
 *  每一件作品的标题/年份/日期/介绍/图片，以及所有排版设置。
 *
 *  ---- 详情页图片的两种分辨率 ----
 *  在编辑模式里上传图片时，会自动生成两个版本：
 *    images      正常显示用（画廊缩略图、详情页里的图片），分辨率小一点，加载更快
 *    imagesFull  点击图片放大时用，分辨率更高，看细节更清楚
 *  这两个字段是自动生成的，不用你手动填。如果 imagesFull 没有对应的图片
 *  （比如你是直接在这个文件里手写的外部图片链接，不是通过编辑模式上传的），
 *  放大的时候会自动退回显示 images 里的那张，不会报错或者空白。
 *
 *  改法有两种：
 *  1) 直接手动改这个文件里的文字/数值
 *  2) 打开网站加上 ?edit=1（比如 http://localhost:5173/?edit=1），
 *     进入可视化编辑模式，点哪改哪，改完点导出内容，
 *     下载到的 content.js 直接替换掉这个文件就行
 *
 *  ---- 中文 / 西班牙语切换 ----
 *  网站右上角（手机上是菜单页里）有个语言切换按钮，循环切换 英文 → 中文 → 西班牙语。
 *  想让某段文字也有对应语言的版本，就在对应字段后面加一个 "Zh"（中文）或 "Es"（西班牙语）
 *  结尾的新字段：
 *    title      → titleZh / titleEs
 *    materials  → materialsZh / materialsEs（材料）
 *    dimensions → dimensionsZh / dimensionsEs（尺寸）
 *    series     → seriesZh / seriesEs（系列作品的名称，比如 "Good Medicine Tastes Bitter"）
 *    Information 页每一段的 title / body → titleZh/titleEs、bodyZh/bodyEs（在 infoSections 数组里）
 *  没写 xxxZh / xxxEs 的内容，切到对应语言的时候会自动显示英文原文，不会空白。
 *  姓名（YU TIANTIAN）、年份、日期、Information/Email/Instagram 这几项
 *  三种语言下显示的是同一份内容，没有做区分。
 *  ---- 电脑端 / 手机端、中文 / 英文，字体样式一共四份独立设置（西班牙语固定沿用英文那份）----
 *  编辑模式下，右上角"电脑预览 / 手机预览"切换正在编辑哪个设备，语言按钮切换正在编辑哪个语言，
 *  两个开关组合起来一共对应四份完全独立的字体样式：
 *    typography          电脑端 · 英文（默认基准，西班牙语模式下显示效果也是用这份）
 *    typographyZh        电脑端 · 中文
 *    typographyMobile    手机端 · 英文（西班牙语模式下显示效果也是用这份）
 *    typographyMobileZh  手机端 · 中文
 *  西班牙语没有独立的字体样式——设计上就是让西班牙语内容直接沿用英文的字号/字体/行距，
 *  编辑的时候只需要专心填西班牙语的文字内容，不用再单独调一遍样式。
 *  这四份字号/字体/行距这些可以分别单独调，互不影响；某一份如果还没单独调过，
 *  会先顶替显示同设备的英文版本，不会因为"还没配置"就突然掉回完全不一样的默认样式。
 *  文字和图片内容（标题、材料、尺寸、图片本身）不受这个影响，三种语言永远是同一份内容。
 * ============================================================
 */
export const DEFAULT_TYPOGRAPHY = {
  artistName: { fontSize: 24, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  year: { fontSize: 20, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  workTitle: { fontSize: 15, lineHeight: 1.75, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: true, letterSpacing: 0, fontWidth: 100 },
  detailTitle: { fontSize: 28, lineHeight: 1.2, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailMaterials: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  detailDimensions: { fontSize: 16, lineHeight: 1.6, fontFamily: "ibm-plex-sans", fontWeight: 500, italic: false, letterSpacing: 0, fontWidth: 100 },
  infoTitle: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  infoBody: { fontSize: 16, lineHeight: 1.7, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
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
  infoTitle: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  infoBody: { fontSize: 16, lineHeight: 1.7, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
  indexNav: { fontSize: 18, lineHeight: 1.3, fontFamily: "ibm-plex-sans", fontWeight: 700, italic: false, letterSpacing: 0, fontWidth: 100 },
  footerLinks: { fontSize: 12, lineHeight: 1.5, fontFamily: "ibm-plex-sans", fontWeight: 400, italic: false, letterSpacing: 0, fontWidth: 100 },
};

export const DEFAULT_DATA = {
  artistName: "YU TIANTIAN",
  typography: DEFAULT_TYPOGRAPHY,
  typographyMobile: DEFAULT_TYPOGRAPHY_MOBILE,
  // Information 页由一段一段组成，每段有自己的标题（title）和详细内容（body），
  // body 还可以选择 columns: 1（一栏）或 columns: 2（两栏），互相独立。
  // 想加新段落，直接在编辑模式里点"+ 添加段落"就行，也支持中文/西班牙语（titleZh/bodyZh、titleEs/bodyEs）
  infoSections: [
    {
      id: "bio",
      title: "Biography",
      titleZh: "简介",
      titleEs: "Biografía",
      body: "点击这里编辑你的艺术家简介、创作理念、经历。",
      bodyZh: "点击这里编辑你的艺术家简介、创作理念、经历（中文版）。",
      bodyEs: "Haz clic aquí para editar tu biografía, filosofía creativa y trayectoria.",
      columns: 1,
    },
    {
      id: "exhibitions",
      title: "Exhibitions",
      titleZh: "展览履历",
      titleEs: "Exposiciones",
      body: "点击这里编辑你的展览履历，比如：\n2026  个展《XXX》，某某美术馆\n2025  群展《XXX》，某某画廊",
      bodyZh: "点击这里编辑你的展览履历（中文版）。",
      bodyEs: "Haz clic aquí para editar tu trayectoria de exposiciones.",
      columns: 2,
    },
  ],
  imageGap: 16, // 右侧栏图片之间的间距（px），画廊网格和详情页大图都用这个值
  // Information/Email/Instagram/RedNote 这几个按钮上显示的文字，都可以在编辑模式里直接点击修改
  // （对应 informationLabel/emailLabel/instagramLabel/redNoteLabel，不填就显示这里的默认值，
  //  这几个也支持中文/西班牙语单独版本，比如 informationLabelZh、informationLabelEs）
  contact: {
    email: "847187284tina@gmail.com",
    instagram: "https://www.instagram.com/yutiantiano.o/",
    redNote: "https://www.xiaohongshu.com/user/profile/5620fff63397db266fe7c2d5",
  },
  works: [
    {
      id: "growth-marks",
      year: 2026,
      title: "Growth Marks",
      titleZh: "生长的痕迹",
      titleEs: "Marcas de Crecimiento",
      date: "Tue Jul 19 2022",
      materials: "Acrylic and collage on canvas",
      materialsZh: "布面丙烯拼贴",
      materialsEs: "Acrílico y collage sobre lienzo",
      dimensions: "120 x 90 cm",
      dimensionsZh: "120 x 90 厘米",
      dimensionsEs: "120 x 90 cm",
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

