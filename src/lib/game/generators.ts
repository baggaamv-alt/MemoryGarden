import "server-only";
import { CATEGORY_INFO, relationshipLabel, tagLabel, TAG_LABELS } from "../content/categories";
import { STARTER_PAIRS, type StarterPair } from "../content/starter";
import { searchMemories } from "../cloudinary/search";
import {
  audioSource,
  blurStage,
  faceCrop,
  hideRegion,
  photo,
  puzzle,
  regionCrop,
  thumb,
  videoSource,
  type DeliveryOptions,
} from "../cloudinary/urls";
import { loc, t } from "../i18n";
import type { Box, Category, GameType, Img, Lang } from "../types";
import type { ChallengeParams } from "./challenge";
import type { Pool, PoolMemory, PoolPerson } from "./pool";
import type { CardView, HintDef, OptionView, ServerRound } from "./types";
import type { LevelDef, LevelVariant } from "./worlds";
import { scopeFor } from "./requirements";
import { joinList, makeIdFactory, norm, shuffle, uniqueBy } from "./util";

export type GenContext = {
  pool: Pool;
  game: GameType;
  level: LevelDef | null;
  variant?: LevelVariant;
  params: ChallengeParams;
  lang: Lang;
  rng: () => number;
  delivery: DeliveryOptions;
  starterPack: boolean;
  /** Memories used in the last few sessions — we gently prefer others. */
  recent: Set<string>;
};

export type Unavailable = { unavailable: string };
export type GenResult = ServerRound[] | Unavailable;

export const isUnavailable = (r: GenResult): r is Unavailable => !Array.isArray(r);
const un = (reason: string): Unavailable => ({ unavailable: reason });

// ─── Shared helpers ───────────────────────────────────────────

function labelOf(m: PoolMemory, lang: Lang): string {
  const caption = m.caption?.trim();
  return (
    m.title?.trim() ||
    m.event?.trim() ||
    (caption ? caption.split(/[.!?\n]/)[0].slice(0, 60) : "") ||
    loc(CATEGORY_INFO[m.category as Category]?.label ?? { en: "A memory", te: "ఒక జ్ఞాపకం" }, lang)
  );
}

function labelWithYear(m: PoolMemory, lang: Lang) {
  const base = labelOf(m, lang);
  return m.year ? `${base} (${m.year})` : base;
}

const altOf = (m: PoolMemory) => m.title?.trim() || m.caption?.trim() || "A family memory";
const catIcon = (m: PoolMemory) => CATEGORY_INFO[m.category as Category]?.icon ?? "💫";

function relOf(p: PoolPerson, lang: Lang) {
  return relationshipLabel(p.relationshipKey, p.relationshipLabel, lang);
}

function personReveal(p: PoolPerson, lang: Lang) {
  const rel = relOf(p, lang);
  return rel ? t(lang, "reveal.person", { name: p.name, relationship: rel }) : t(lang, "reveal.personNoRel", { name: p.name });
}

/** Level scope: caregiver album, preferred categories first, then (unless strict) everything else. */
function scoped(ctx: GenContext, list: PoolMemory[]): PoolMemory[] {
  return scopeFor(ctx.level, ctx.pool, list);
}

/** Gentle weighting: important and favourite memories more often, recently seen ones less. */
function weighted(ctx: GenContext, list: PoolMemory[], preferredCount?: number): PoolMemory[] {
  const scoreOf = (m: PoolMemory, i: number) =>
    m.importance * 0.6 +
    (m.favorite ? 1.5 : 0) -
    (ctx.recent.has(m.id) ? 2.5 : 0) +
    (preferredCount !== undefined && i < preferredCount ? 2 : 0) +
    ctx.rng() * 2.2;
  return list
    .map((m, i) => ({ m, s: scoreOf(m, i) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m);
}

function scopedWeighted(ctx: GenContext, list: PoolMemory[]) {
  const s = scoped(ctx, list);
  const preferredCount = ctx.level?.categories?.length
    ? s.filter((m) => ctx.level!.categories!.includes(m.category as Category)).length
    : undefined;
  return weighted(ctx, s, preferredCount);
}

type Candidate = { m: PoolMemory; p: PoolPerson };

function personCandidates(list: PoolMemory[]): Candidate[] {
  const out: Candidate[] = [];
  for (const m of list) {
    if (m.mediaType !== "photo") continue;
    for (const p of m.people) if (p.face || m.people.length === 1) out.push({ m, p });
  }
  return out;
}

function starterCardPairs(set: StarterPair["set"]) {
  return STARTER_PAIRS.filter((p) => p.set === set);
}

// ─── 1. Memory Reveal ─────────────────────────────────────────

async function genReveal(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const list = scopedWeighted(ctx, ctx.pool.visual);
  if (!list.length) return un("Needs at least 1 approved photo.");
  const labels = uniqueBy(
    ctx.pool.visual.map((m) => ({ memoryId: m.id, text: labelOf(m, lang), icon: catIcon(m), lang: m.language })),
    (l) => norm(l.text),
  );

  return list.slice(0, params.rounds).map((m): ServerRound => {
    const label = labelOf(m, lang);
    const stages = params.blurStages.map((s) => blurStage(m, s, altOf(m), o));
    const stageHints: HintDef[] = stages.slice(1).map(() => ({ type: "stage" }));
    const reveal = { text: t(lang, "reveal.memory", { label: labelWithYear(m, lang) }), image: photo(m, altOf(m), o) };
    const distract = shuffle(
      labels.filter((l) => l.memoryId !== m.id && norm(l.text) !== norm(label)),
      rng,
    );
    const n = Math.min(params.options, 1 + distract.length);

    if (n < 2) {
      const yes = rid();
      const tell = rid();
      return {
        view: {
          kind: "choice",
          id: rid(),
          prompt: t(lang, "prompt.revealSingle"),
          stages,
          options: [
            { id: yes, label: t(lang, "game.yesRemember"), icon: "💛" },
            { id: tell, label: t(lang, "game.tellMe"), icon: "💬" },
          ],
          open: true,
          optionStyle: "text",
          hintsAllowed: stageHints.length,
        },
        key: { kind: "choice", correct: [yes, tell], open: true },
        hints: stageHints,
        memoryIds: [m.id],
        reveal,
      };
    }

    const correctId = rid();
    const options: OptionView[] = shuffle(
      [
        { id: correctId, label, icon: catIcon(m), lang: m.language },
        ...distract.slice(0, n - 1).map((d) => ({ id: rid(), label: d.text, icon: d.icon, lang: d.lang })),
      ],
      rng,
    );
    return {
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, "prompt.reveal"),
        stages,
        options,
        optionStyle: "text",
        hintsAllowed: stageHints.length + 1,
      },
      key: { kind: "choice", correct: [correctId] },
      hints: [...stageHints, { type: "eliminate" }],
      memoryIds: [m.id],
      reveal,
    };
  });
}

// ─── 2. Who Is This? ──────────────────────────────────────────

async function genWho(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const cands = personCandidates(scopedWeighted(ctx, ctx.pool.photos));
  const persons = uniqueBy(cands, (c) => c.p.personId);
  if (persons.length < 2) return un("Needs at least 2 different people labelled in approved photos.");

  // One candidate photo per person for distractors; rounds prefer different people.
  const targets: Candidate[] = [];
  const byPerson = new Map<string, Candidate[]>();
  for (const c of cands) byPerson.set(c.p.personId, [...(byPerson.get(c.p.personId) ?? []), c]);
  const personOrder = shuffle([...byPerson.keys()], rng);
  for (let i = 0; targets.length < params.rounds && i < params.rounds * 3; i++) {
    const pid = personOrder[i % personOrder.length];
    const list = byPerson.get(pid)!;
    const pick = list[Math.floor(i / personOrder.length) % list.length];
    if (!targets.some((t0) => t0.m.id === pick.m.id && t0.p.personId === pick.p.personId)) targets.push(pick);
  }

  return targets.map((target): ServerRound => {
    const others = shuffle(persons.filter((c) => c.p.personId !== target.p.personId), rng);
    const n = Math.min(params.options, 1 + others.length);
    const rel = relOf(target.p, lang);
    const reveal = { text: personReveal(target.p, lang), image: photo(target.m, altOf(target.m), o) };

    if (ctx.variant === "find-person") {
      const correctId = rid();
      const options: OptionView[] = shuffle(
        [
          { id: correctId, label: "", image: faceCrop(target.m, target.p.face, target.p.name, 320, o) },
          ...others.slice(0, n - 1).map((c) => ({ id: rid(), label: "", image: faceCrop(c.m, c.p.face, c.p.name, 320, o) })),
        ],
        rng,
      );
      const hints: HintDef[] = [];
      if (rel) hints.push({ type: "text", text: t(lang, "hint.findPerson", { name: target.p.name, relationship: rel }) });
      hints.push({ type: "eliminate" });
      return {
        view: {
          kind: "choice",
          id: rid(),
          prompt: t(lang, "prompt.findPerson", { name: target.p.name }),
          options,
          optionStyle: "picture",
          hintsAllowed: Math.min(params.hints, hints.length),
        },
        key: { kind: "choice", correct: [correctId] },
        hints,
        memoryIds: [target.m.id],
        reveal,
      };
    }

    const correctId = rid();
    const optionFor = (c: Candidate, id: string): OptionView => ({
      id,
      label: c.p.name,
      sublabel: params.showRelationship ? relOf(c.p, lang) || undefined : undefined,
    });
    const options = shuffle([optionFor(target, correctId), ...others.slice(0, n - 1).map((c) => optionFor(c, rid()))], rng);
    const hints: HintDef[] = [];
    if (rel && !params.showRelationship) hints.push({ type: "text", text: t(lang, "hint.relationship", { relationship: rel }) });
    if (target.m.people.length > 1 || target.p.face) hints.push({ type: "image", image: photo(target.m, altOf(target.m), o), text: t(lang, "hint.context") });
    hints.push({ type: "eliminate" });
    return {
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, "prompt.who"),
        image: faceCrop(target.m, target.p.face, "", 520, o),
        options,
        optionStyle: "text",
        hintsAllowed: Math.min(params.hints, hints.length),
      },
      key: { kind: "choice", correct: [correctId] },
      hints,
      memoryIds: [target.m.id],
      reveal,
    };
  });
}

// ─── 3. Remember the Scene ────────────────────────────────────

async function genScene(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const list = scopedWeighted(ctx, ctx.pool.photos).filter((m) => uniqueBy(m.objects, (x) => norm(x.label)).length >= 2);
  if (!list.length) return un("Needs approved photos with at least 2 labelled things in them.");

  return list.slice(0, Math.min(params.rounds, 3)).map((m): ServerRound => {
    const objs = shuffle(uniqueBy(m.objects, (x) => norm(x.label)), rng);
    const inPhoto = new Set(objs.map((x) => norm(x.label)));
    const correctObjs = objs.slice(0, Math.max(1, Math.min(params.sceneDetails, objs.length - 1)));
    // Distractors: things caregivers labelled in *other* photos, then illustrated everyday items.
    const otherObjs = uniqueBy(
      ctx.pool.photos.filter((x) => x.id !== m.id).flatMap((x) => x.objects.map((ob) => ({ ob, m: x }))),
      (x) => norm(x.ob.label),
    ).filter((x) => !inPhoto.has(norm(x.ob.label)));
    const starter = STARTER_PAIRS.flatMap((p) => [p.left, p.right])
      .map((c) => ({ label: c.label[lang], icon: c.icon }))
      .filter((c) => !inPhoto.has(norm(c.label)));
    const wanted = Math.max(params.options, correctObjs.length + 1) - correctObjs.length;
    const distractors: { label: string; image?: Img; icon?: string }[] = [];
    for (const x of shuffle(otherObjs, rng)) {
      if (distractors.length >= wanted) break;
      distractors.push({ label: x.ob.label, image: x.ob.box ? regionCrop(x.m, x.ob.box, x.ob.label, 300, o) : undefined });
    }
    for (const s of shuffle(starter, rng)) {
      if (distractors.length >= wanted) break;
      if (distractors.some((d) => norm(d.label) === norm(s.label))) continue;
      distractors.push({ label: s.label, icon: s.icon });
    }

    const correctOptions = correctObjs.map((x) => ({ id: rid(), label: x.label, image: x.box ? regionCrop(m, x.box, x.label, 300, o) : undefined }));
    const all = [...correctOptions, ...distractors.map((d) => ({ id: rid(), ...d }))];
    const visual = params.visualOptions && all.every((x) => x.image);
    const options: OptionView[] = shuffle(
      all.map((x) => ({
        id: x.id,
        label: x.label,
        image: visual ? x.image : undefined,
        icon: "icon" in x ? (x as { icon?: string }).icon : undefined,
      })),
      rng,
    );
    const multi = correctOptions.length > 1;
    return {
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, multi ? "prompt.sceneAskMulti" : "prompt.sceneAsk"),
        preview: {
          image: photo(m, altOf(m), o),
          prompt: t(lang, "prompt.sceneLook"),
          exposureMs: params.exposureSeconds > 0 ? params.exposureSeconds * 1000 : null,
        },
        options,
        multi,
        optionStyle: visual ? "picture" : "text",
        hintsAllowed: Math.min(params.hints, 2),
      },
      key: { kind: "choice", correct: correctOptions.map((x) => x.id), multi },
      hints: [{ type: "show-preview" }, { type: "eliminate" }],
      memoryIds: [m.id],
      reveal: {
        text: t(lang, "reveal.scene", { items: joinList(objs.map((x) => x.label), t(lang, "common.and")) }),
        image: photo(m, altOf(m), o),
      },
    };
  });
}

// ─── 4. Memory Match ──────────────────────────────────────────

type PairSpec = { a: Omit<CardView, "id" | "side">; b: Omit<CardView, "id" | "side">; memoryIds: string[] };

function matchPairs(ctx: GenContext, variant: LevelVariant | undefined): PairSpec[] {
  const { lang, delivery: o, rng } = ctx;
  const photos = scopedWeighted(ctx, ctx.pool.photos);
  switch (variant) {
    case "face-name": {
      const persons = uniqueBy(personCandidates(photos), (c) => c.p.personId);
      return shuffle(persons, rng).map((c) => ({
        a: { image: faceCrop(c.m, c.p.face, c.p.name, 320, o) },
        b: { label: c.p.name },
        memoryIds: [c.m.id],
      }));
    }
    case "person-relationship": {
      const persons = uniqueBy(
        uniqueBy(personCandidates(photos), (c) => c.p.personId).filter((c) => relOf(c.p, lang)),
        (c) => norm(relOf(c.p, lang)),
      );
      return shuffle(persons, rng).map((c) => ({
        a: { image: faceCrop(c.m, c.p.face, c.p.name, 320, o), label: c.p.name },
        b: { label: relOf(c.p, lang) },
        memoryIds: [c.m.id],
      }));
    }
    case "event-photo": {
      const list = uniqueBy(scopedWeighted(ctx, ctx.pool.visual), (m) => norm(labelOf(m, lang)));
      return list.map((m) => ({ a: { image: thumb(m, altOf(m), 320, o) }, b: { label: labelWithYear(m, lang) }, memoryIds: [m.id] }));
    }
    case "object-pair": {
      const objs = uniqueBy(
        photos.flatMap((m) => m.objects.filter((x) => x.box).map((x) => ({ m, x }))),
        (y) => norm(y.x.label),
      );
      return shuffle(objs, rng).map(({ m, x }) => ({
        a: { image: regionCrop(m, x.box as Box, x.label, 320, o) },
        b: { label: x.label },
        memoryIds: [m.id],
      }));
    }
    default: {
      const list = scopedWeighted(ctx, ctx.pool.visual);
      return list.map((m) => {
        const img = thumb(m, altOf(m), 320, o);
        return { a: { image: img }, b: { image: img }, memoryIds: [m.id] };
      });
    }
  }
}

async function genMatch(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng } = ctx;
  const rid = makeIdFactory(rng);
  let variant = ctx.variant;
  let specs = matchPairs(ctx, variant);
  if (specs.length < 2 && variant && variant !== "identical") {
    variant = "identical";
    specs = matchPairs(ctx, variant);
  }
  if (specs.length < 2) return un("Needs at least 2 approved photos.");
  const n = Math.max(2, Math.min(params.pairs, specs.length));
  const chosen = specs.slice(0, n);
  const concealed = params.concealed && (variant === undefined || variant === "identical");

  const cards: CardView[] = [];
  const pairs: [string, string][] = [];
  const left: CardView[] = [];
  const right: CardView[] = [];
  for (const s of chosen) {
    const a: CardView = { id: rid(), side: "left", ...s.a };
    const b: CardView = { id: rid(), side: "right", ...s.b };
    pairs.push([a.id, b.id]);
    left.push(a);
    right.push(b);
  }
  if (concealed) cards.push(...shuffle([...left, ...right].map((c) => ({ ...c, side: undefined })), rng));
  else cards.push(...shuffle(left, rng), ...shuffle(right, rng));

  return [
    {
      view: {
        kind: "match",
        id: rid(),
        prompt: t(lang, concealed ? "prompt.matchConcealed" : "prompt.match"),
        cards,
        concealed,
        hintsAllowed: Math.min(params.hints, n - 1),
      },
      key: { kind: "match", pairs },
      hints: Array.from({ length: n - 1 }, () => ({ type: "pair" as const })),
      memoryIds: chosen.flatMap((s) => s.memoryIds),
      reveal: { text: t(lang, "reveal.pairs") },
    },
  ];
}

// ─── 5. Find the Memory (Cloudinary Search API) ───────────────

async function genFind(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o, pool } = ctx;
  const rid = makeIdFactory(rng);
  const list = scopedWeighted(ctx, pool.visual);
  if (list.length < 2) return un("Needs at least 2 approved photos with tags or categories.");

  type Target = { kind: "tag" | "category"; value: string; label: string; icon: string; members: Set<string> };
  const targets: Target[] = [];
  const tagCounts = new Map<string, Set<string>>();
  for (const m of list) for (const tg of m.tags) {
    const k = tg.toLowerCase();
    if (k.startsWith("mg_") || k === "memory-garden") continue;
    tagCounts.set(k, new Set([...(tagCounts.get(k) ?? []), m.id]));
  }
  for (const [tag, members] of tagCounts) {
    if (members.size >= 1 && members.size < list.length) {
      targets.push({ kind: "tag", value: tag, label: tagLabel(tag, lang), icon: TAG_LABELS[tag]?.icon ?? "💫", members });
    }
  }
  const cats = new Map<string, Set<string>>();
  for (const m of list) cats.set(m.category, new Set([...(cats.get(m.category) ?? []), m.id]));
  for (const [cat, members] of cats) {
    if (members.size < list.length && !targets.some((x) => x.kind === "tag" && norm(x.value) === norm(cat))) {
      const info = CATEGORY_INFO[cat as Category];
      targets.push({ kind: "category", value: cat, label: loc(info?.label, lang).toLowerCase(), icon: info?.icon ?? "💫", members });
    }
  }
  if (!targets.length) return un("Needs photos with different tags or categories.");

  // Known, translatable tags first; then categories; a little randomness for variety.
  const ordered = targets
    .map((x) => ({ x, s: (TAG_LABELS[x.value] ? 2 : 0) + (x.kind === "tag" ? 1 : 0) + rng() * 1.5 }))
    .sort((a, b) => b.s - a.s)
    .map((y) => y.x)
    .slice(0, params.rounds);

  const byId = new Map(list.map((m) => [m.id, m]));
  const byPublicId = new Map(list.map((m) => [m.publicId, m]));
  const rounds: ServerRound[] = [];
  for (const target of ordered) {
    // Real retrieval: ask Cloudinary Search for memories with this tag / category.
    let members = [...target.members].map((id) => byId.get(id)!).filter(Boolean);
    try {
      const res = await searchMemories({
        patientCode: pool.patientCode,
        eligibleOnly: true,
        ...(target.kind === "tag" ? { tags: [target.value] } : { categories: [target.value] }),
        maxResults: 50,
      });
      const found = res.resources.map((r) => byPublicId.get(r.public_id)).filter((m): m is PoolMemory => !!m);
      if (found.length) members = uniqueBy([...found, ...members], (m) => m.id);
    } catch {
      /* the database labels still give a correct answer if search is briefly unavailable */
    }
    const memberIds = new Set(members.map((m) => m.id));
    const nonMembers = list.filter((m) => !memberIds.has(m.id) && !target.members.has(m.id));
    if (!members.length || !nonMembers.length) continue;
    const correct = weighted(ctx, members)[0];
    const n = Math.min(params.options, 1 + nonMembers.length);
    const correctId = rid();
    const options: OptionView[] = shuffle(
      [
        { id: correctId, label: labelOf(correct, lang), image: thumb(correct, altOf(correct), 360, o), lang: correct.language },
        ...shuffle(nonMembers, rng)
          .slice(0, n - 1)
          .map((m) => ({ id: rid(), label: labelOf(m, lang), image: thumb(m, altOf(m), 360, o), lang: m.language })),
      ],
      rng,
    );
    rounds.push({
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, "prompt.find", { tag: target.label }),
        options,
        optionStyle: "picture-large",
        hintsAllowed: Math.max(0, Math.min(params.hints, n - 2)),
      },
      key: { kind: "choice", correct: [correctId] },
      hints: Array.from({ length: Math.max(0, n - 2) }, () => ({ type: "eliminate" as const })),
      memoryIds: [correct.id],
      reveal: { text: t(lang, "reveal.found", { label: labelWithYear(correct, lang) }), image: photo(correct, altOf(correct), o) },
    });
  }
  return rounds.length ? rounds : un("Needs photos with different tags or categories.");
}

// ─── 6. What's Missing? ───────────────────────────────────────

async function genMissing(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const list = scopedWeighted(ctx, ctx.pool.photos).filter(
    (m) => m.width && m.height && uniqueBy(m.objects.filter((x) => x.box), (x) => norm(x.label)).length >= 2,
  );
  if (!list.length) return un("Needs approved photos with at least 2 things marked with a box.");

  return list.slice(0, Math.min(params.rounds, 3)).map((m): ServerRound => {
    const boxed = shuffle(uniqueBy(m.objects.filter((x) => x.box), (x) => norm(x.label)), rng);
    const hidden = boxed[0];
    const n = Math.min(Math.max(2, params.options), boxed.length);
    const optionObjs = shuffle([hidden, ...boxed.slice(1, n)], rng);
    const ids = new Map(optionObjs.map((x) => [x.id, rid()]));
    const options: OptionView[] = optionObjs.map((x) => ({
      id: ids.get(x.id)!,
      label: x.label,
      image: params.visualOptions ? regionCrop(m, x.box as Box, x.label, 300, o) : undefined,
    }));
    return {
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, "prompt.missingAsk"),
        image: hideRegion(m, hidden.box as Box, altOf(m), o),
        preview: {
          image: photo(m, altOf(m), o),
          prompt: t(lang, "prompt.missingLook"),
          exposureMs: params.exposureSeconds > 0 ? params.exposureSeconds * 1000 : null,
        },
        options,
        optionStyle: params.visualOptions ? "picture" : "text",
        hintsAllowed: Math.min(params.hints, n > 2 ? 2 : 1),
      },
      key: { kind: "choice", correct: [ids.get(hidden.id)!] },
      hints: n > 2 ? [{ type: "show-preview" }, { type: "eliminate" }] : [{ type: "show-preview" }],
      memoryIds: [m.id],
      reveal: { text: t(lang, "reveal.missing", { label: hidden.label }), image: photo(m, altOf(m), o) },
    };
  });
}

// ─── 7. Picture Puzzle ────────────────────────────────────────

async function genPuzzle(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const list = scopedWeighted(ctx, ctx.pool.photos);
  if (!list.length) return un("Needs at least 1 approved photo.");
  const m = list[0];
  const [rows, cols] = params.grid;
  const board = puzzle(m, rows, cols, altOf(m), o);
  const pieces = board.tiles.map((image, slot) => ({ id: rid(), image, slot }));
  const solution = Object.fromEntries(pieces.map((p) => [p.id, p.slot]));
  return [
    {
      view: {
        kind: "puzzle",
        id: rid(),
        prompt: t(lang, "prompt.puzzle"),
        rows,
        cols,
        width: board.width,
        height: board.height,
        ghost: board.ghost,
        ghostOpacity: params.ghostOpacity,
        full: board.full,
        pieces: shuffle(pieces, rng).map((p) => ({ id: p.id, image: p.image })),
        hintsAllowed: Math.min(params.hints, pieces.length - 1),
      },
      key: { kind: "puzzle", solution },
      hints: Array.from({ length: pieces.length - 1 }, () => ({ type: "piece" as const })),
      memoryIds: [m.id],
      reveal: { text: `${t(lang, "reveal.puzzle")} ${labelWithYear(m, lang)}`, image: board.full },
    },
  ];
}

// ─── 8. Memory Story (and life timelines) ─────────────────────

async function genTimeline(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o } = ctx;
  const rid = makeIdFactory(rng);
  const dated = uniqueBy(
    scopedWeighted(ctx, ctx.pool.visual).filter((m) => m.year),
    (m) => String(m.year),
  );
  if (dated.length < 2) return un("Needs at least 2 approved photos with different years.");
  const n = Math.min(Math.max(2, params.timelineItems), dated.length);
  const chosen = dated.slice(0, n);
  const items = chosen.map((m) => ({ id: rid(), m }));
  const sorted = [...items].sort((a, b) => (a.m.year ?? 0) - (b.m.year ?? 0));
  return [
    {
      view: {
        kind: "order",
        id: rid(),
        prompt: t(lang, "prompt.timeline"),
        items: shuffle(items, rng).map((x) => ({ id: x.id, image: thumb(x.m, altOf(x.m), 360, o), label: labelOf(x.m, lang) })),
        hintsAllowed: Math.min(params.hints, n - 1),
      },
      key: {
        kind: "order",
        order: sorted.map((x) => x.id),
        years: Object.fromEntries(items.map((x) => [x.id, x.m.year ?? 0])),
      },
      hints: Array.from({ length: n - 1 }, () => ({ type: "first" as const })),
      memoryIds: chosen.map((m) => m.id),
      reveal: {
        text: t(lang, "reveal.order", { items: sorted.map((x) => `${labelOf(x.m, lang)} (${x.m.year})`).join(" → ") }),
      },
    },
  ];
}

async function genStory(ctx: GenContext): Promise<GenResult> {
  if (ctx.variant === "timeline") return genTimeline(ctx);
  const { lang, rng, delivery: o, pool } = ctx;
  const rid = makeIdFactory(rng);
  const cats = ctx.level?.categories ?? [];

  const slideFor = (m: PoolMemory, caption?: string | null, narration?: PoolMemory | null) => ({
    id: rid(),
    image: photo(m, altOf(m), o),
    video: m.mediaType === "video" ? { src: videoSource(m, o) } : undefined,
    caption: caption?.trim() || m.caption?.trim() || labelOf(m, lang),
    sublabel: [m.year ? String(m.year) : m.approxDate, m.location].filter(Boolean).join(" · ") || undefined,
    lang: m.language,
    narration: narration ? { src: audioSource(narration) } : undefined,
  });

  // 1) A caregiver-written story (album for bonus worlds), preferring this destination's theme.
  const candidates = ctx.level?.collectionId
    ? [...pool.albums, ...pool.stories].filter((s) => s.id === ctx.level!.collectionId)
    : shuffle(pool.stories, rng).sort((a, b) => Number(cats.includes(b.category as Category)) - Number(cats.includes(a.category as Category)));
  for (const story of candidates) {
    const items = story.items.filter((i) => i.memory && i.memory.mediaType !== "audio");
    if (items.length < 2) continue;
    return [
      {
        view: {
          kind: "story",
          id: rid(),
          prompt: t(lang, "prompt.story"),
          title: story.title,
          slides: items.map((i) => slideFor(i.memory!, i.caption, i.narration)),
          hintsAllowed: 0,
        },
        key: { kind: "story" },
        hints: [],
        memoryIds: items.map((i) => i.memory!.id),
        reveal: { text: t(lang, "game.finishStory") },
      },
    ];
  }

  // 2) An album story from approved, captioned memories in this destination's theme.
  const list = scoped(ctx, pool.visual).filter((m) => (m.caption?.trim() || m.title?.trim()));
  if (list.length < 2) return un("Needs a caregiver story, or at least 2 approved photos with captions.");
  const chosen = weighted(ctx, list)
    .slice(0, 6)
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  const theme = cats.length ? loc(CATEGORY_INFO[cats[0]]?.label, lang) : "";
  return [
    {
      view: {
        kind: "story",
        id: rid(),
        prompt: t(lang, "prompt.story"),
        title: theme ? `${theme} ✿` : "✿",
        slides: chosen.map((m) => slideFor(m)),
        hintsAllowed: 0,
      },
      key: { kind: "story" },
      hints: [],
      memoryIds: chosen.map((m) => m.id),
      reveal: { text: t(lang, "game.finishStory") },
    },
  ];
}

// ─── 9. Sound and Memory ──────────────────────────────────────

async function genSound(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o, pool } = ctx;
  const rid = makeIdFactory(rng);
  const visualById = new Map(pool.visual.map((m) => [m.id, m]));
  const clips = weighted(ctx, pool.audio.filter((a) => a.linkedMemoryId && visualById.has(a.linkedMemoryId)));
  if (!clips.length) return un("Needs an approved audio clip linked to a photo.");
  if (pool.visual.length < 2) return un("Needs at least 2 approved photos.");

  return clips.slice(0, params.rounds).map((clip): ServerRound => {
    const target = visualById.get(clip.linkedMemoryId!)!;
    const others = shuffle(pool.visual.filter((m) => m.id !== target.id), rng);
    const n = Math.min(params.options, 1 + others.length);
    const correctId = rid();
    const options: OptionView[] = shuffle(
      [
        { id: correctId, label: labelOf(target, lang), image: thumb(target, altOf(target), 360, o), lang: target.language },
        ...others.slice(0, n - 1).map((m) => ({ id: rid(), label: labelOf(m, lang), image: thumb(m, altOf(m), 360, o), lang: m.language })),
      ],
      rng,
    );
    return {
      view: {
        kind: "choice",
        id: rid(),
        prompt: t(lang, "prompt.sound"),
        audio: { src: audioSource(clip), label: clip.title || undefined },
        options,
        optionStyle: "picture-large",
        hintsAllowed: Math.max(0, Math.min(params.hints, n - 2)),
      },
      key: { kind: "choice", correct: [correctId] },
      hints: Array.from({ length: Math.max(0, n - 2) }, () => ({ type: "eliminate" as const })),
      memoryIds: [clip.id, target.id],
      reveal: { text: t(lang, "reveal.sound", { label: labelWithYear(target, lang) }), image: photo(target, altOf(target), o) },
    };
  });
}

// ─── 10. Daily Life Match ─────────────────────────────────────

async function genDaily(ctx: GenContext): Promise<GenResult> {
  const { lang, params, rng, delivery: o, pool } = ctx;
  const rid = makeIdFactory(rng);
  const byId = new Map(pool.photos.map((m) => [m.id, m]));
  const personal: PairSpec[] = shuffle(pool.pairs, rng).flatMap((p) => {
    const l = byId.get(p.leftMemoryId);
    const r = byId.get(p.rightMemoryId);
    if (!l || !r) return [];
    return [
      {
        a: { image: p.leftBox ? regionCrop(l, p.leftBox, p.leftLabel, 320, o) : thumb(l, p.leftLabel, 320, o), label: p.leftLabel },
        b: { image: p.rightBox ? regionCrop(r, p.rightBox, p.rightLabel, 320, o) : thumb(r, p.rightLabel, 320, o), label: p.rightLabel },
        memoryIds: [l.id, r.id],
      },
    ];
  });
  const set = ctx.variant === "festival" ? "festival" : ctx.variant === "nature" ? "nature" : "everyday";
  const starter: PairSpec[] = ctx.starterPack
    ? shuffle(starterCardPairs(set), rng).map((p) => ({
        a: { icon: p.left.icon, label: p.left.label[lang] },
        b: { icon: p.right.icon, label: p.right.label[lang] },
        memoryIds: [],
      }))
    : [];
  const specs = [...personal, ...starter];
  if (specs.length < 2) return un("Needs the everyday starter cards, or at least 2 pairs made from personal photos.");
  const n = Math.max(2, Math.min(params.pairs, specs.length));
  const chosen = specs.slice(0, n);
  const left: CardView[] = [];
  const right: CardView[] = [];
  const pairs: [string, string][] = [];
  for (const s of chosen) {
    const a: CardView = { id: rid(), side: "left", ...s.a };
    const b: CardView = { id: rid(), side: "right", ...s.b };
    left.push(a);
    right.push(b);
    pairs.push([a.id, b.id]);
  }
  return [
    {
      view: {
        kind: "match",
        id: rid(),
        prompt: t(lang, "prompt.daily"),
        cards: [...shuffle(left, rng), ...shuffle(right, rng)],
        concealed: false,
        hintsAllowed: Math.min(params.hints, n - 1),
      },
      key: { kind: "match", pairs },
      hints: Array.from({ length: n - 1 }, () => ({ type: "pair" as const })),
      memoryIds: chosen.flatMap((s) => s.memoryIds),
      reveal: { text: t(lang, "reveal.pairs") },
    },
  ];
}

export const GENERATORS: Record<GameType, (ctx: GenContext) => Promise<GenResult>> = {
  "memory-reveal": genReveal,
  "who-is-this": genWho,
  "remember-scene": genScene,
  "memory-match": genMatch,
  "find-memory": genFind,
  "whats-missing": genMissing,
  "picture-puzzle": genPuzzle,
  "memory-story": genStory,
  "sound-memory": genSound,
  "daily-life": genDaily,
};
