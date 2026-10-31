const storageKey = "MAVICER_FEEDBACK_RECEIPT_V1";
export function feedbackToken(): string {
  let stored: string | null;
  try { stored = localStorage.getItem(storageKey); } catch { throw new Error("当前浏览器无法保存匿名凭证，请允许本站使用本地存储后重试。"); }
  if (stored && /^[0-9a-f]{64}$/.test(stored)) return stored;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join("");
  try { localStorage.setItem(storageKey, token); } catch { throw new Error("当前浏览器无法保存匿名凭证，请允许本站使用本地存储后重试。"); }
  return token;
}
export type FeedbackMessage = { id: number; category: string; body: string; created_at: string; read_at: string | null };
export const feedbackLabels: Record<string,string> = { bug:"报告 Bug",suggestion:"提出建议",other:"其他留言" };
