// 영어 → 한국어. GEMINI_API_KEY 있으면 Gemini(무료 티어), 없거나 실패하면 Google 번역 무키 엔드포인트.
// 둘 다 실패하면 원문 그대로 둔다 (뉴스가 비는 일은 없게).
const HANGUL = /[가-힣]/;
export const needsKo = (s) => !!s && !HANGUL.test(s) && /[a-z]{2,}\s+[a-z]{2,}/i.test(s);

async function gemini(texts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no key');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const prompt = '다음 JSON 배열의 영어 문장을 자연스러운 한국어 뉴스체로 번역해 같은 길이의 JSON 문자열 배열로만 답해. '
    + '제품명·회사명·게임명·고유명사는 원어 유지(예: RTX 5090, Ryzen).\n' + JSON.stringify(texts);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const raw = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  let out = {};
  try { out = JSON.parse(raw); } catch { // 가끔 JSON 뒤에 군더더기가 붙는다 → "키":"값" 쌍만 뽑기
    for (const [, k, v] of raw.matchAll(/"(\d+)"\s*:\s*("(?:[^"\\]|\\.)*")/g)) out[k] ??= JSON.parse(v);
  }
  return texts.map((_, i) => (typeof out[i] === 'string' && out[i].trim() ? out[i] : null)); // 빠진 칸은 null → gtx 가 채움
}

async function gtx(text) {
  const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`gtx ${r.status}`);
  return (await r.json())[0].map((p) => p[0]).join('');
}

async function pool(xs, n, fn) {
  const out = new Array(xs.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]).catch(() => null); } }));
  return out;
}

// texts → 같은 순서의 번역 배열 (실패한 칸은 null)
export async function translateAll(texts) {
  const out = new Array(texts.length).fill(null);
  const BATCH = 40;
  let geminiOk = !!process.env.GEMINI_API_KEY;
  for (let s = 0; s < texts.length; s += BATCH) {
    const chunk = texts.slice(s, s + BATCH);
    let res = null;
    // HTTP 오류(한도 초과 등)면 이후 배치는 바로 gtx
    if (geminiOk) res = await gemini(chunk).catch((e) => { console.warn('[translate]', e.message, '→ gtx'); if (/^gemini \d/.test(e.message)) geminiOk = false; return null; });
    res ??= chunk.map(() => null);
    const miss = res.map((t, k) => (t ? -1 : k)).filter((k) => k >= 0);
    (await pool(miss.map((k) => chunk[k]), 4, gtx)).forEach((t, j) => (res[miss[j]] = t));
    res.forEach((t, k) => (out[s + k] = t));
  }
  return out;
}

// sections 안의 영어 title/summary 를 제자리 번역. 원문은 titleEn/summaryEn 에 보관.
export async function translateSections(sections) {
  const slots = [];
  for (const sec of sections) for (const g of sec.groups) for (const it of g.items) {
    if (sec.id === 'github') { if (needsKo(it.summary)) slots.push([it, 'summary']); continue; } // 레포 이름은 번역 안 함
    if (sec.id === 'anime') { if (needsKo(it.summary)) slots.push([it, 'summary']); continue; }    // 작품명은 원제 유지
    for (const f of ['title', 'summary']) if (needsKo(it[f])) slots.push([it, f]);
  }
  const res = await translateAll(slots.map(([it, f]) => it[f]));
  let done = 0;
  slots.forEach(([it, f], k) => { if (res[k]) { it[f + 'En'] = it[f]; it[f] = res[k]; it.translated = true; done++; } });
  return { total: slots.length, done };
}
