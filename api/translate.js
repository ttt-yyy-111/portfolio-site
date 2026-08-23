const SPANISH_TITLE_LOWERCASE_WORDS = new Set([
  "a", "al", "ante", "bajo", "con", "contra", "de", "del", "desde", "durante",
  "e", "el", "en", "entre", "hacia", "hasta", "la", "las", "los", "mediante",
  "ni", "o", "para", "por", "según", "sin", "sobre", "tras", "u", "un", "una", "y",
]);

function formatSpanishTitle(value) {
  let wordIndex = 0;
  return String(value || "").replace(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu, (word) => {
    const normalized = word.toLocaleLowerCase("es-ES");
    const shouldLowercase = wordIndex > 0 && SPANISH_TITLE_LOWERCASE_WORDS.has(normalized);
    wordIndex += 1;
    if (shouldLowercase) return normalized;
    return normalized.charAt(0).toLocaleUpperCase("es-ES") + normalized.slice(1);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, sourceLang = "EN", targetLang = "ES", titleCase = false, html = false } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > 10000) {
    return res.status(413).json({ error: "Text is too long" });
  }
  const supportedPairs = new Set(["EN:DE", "EN:FR", "EN:IT", "EN:ES", "ZH:JA"]);
  const languagePair = `${sourceLang}:${targetLang}`;
  if (!supportedPairs.has(languagePair)) {
    return res.status(400).json({ error: "Unsupported language pair" });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "DEEPL_API_KEY is not configured" });
  }

  // DeepL Free 的密钥以 :fx 结尾，使用不同的 API 域名；Pro 则使用标准域名。
  const endpoint = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const body = new URLSearchParams({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    preserve_formatting: "1",
  });
  if (html) body.set("tag_handling", "html");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: "DeepL translation failed" });
    }

    const translated = result?.translations?.[0]?.text;
    if (typeof translated !== "string") {
      return res.status(502).json({ error: "DeepL returned no translation" });
    }
    return res.status(200).json({
      translation: titleCase ? formatSpanishTitle(translated) : translated,
    });
  } catch {
    return res.status(502).json({ error: "Unable to reach DeepL" });
  }
}
