import {
  createEditorSession,
  hasEditorConfig,
  isEditorAuthenticated,
  passwordMatches,
  sessionCookie,
} from "./lib/editor-auth.js";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: isEditorAuthenticated(req) });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!hasEditorConfig()) {
    return res.status(503).json({ error: "Editor protection is not configured" });
  }
  if (!passwordMatches(req.body?.password)) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  res.setHeader("Set-Cookie", sessionCookie(createEditorSession()));
  return res.status(200).json({ authenticated: true });
}
