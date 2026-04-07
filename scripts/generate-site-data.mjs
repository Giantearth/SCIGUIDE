import fs from "node:fs";
import path from "node:path";

const databaseDir = path.resolve("D:/SCIGUIDEAPP/DATABASE");
const guideDir = path.resolve("D:/SCIGUIDEAPP/GUIDE");
const outputFile = path.resolve("D:/SCIGUIDEAPP/site/data.js");
const githubRepoBase = "https://github.com/Giantearth/SCIGUIDE/blob/main";
const excludedDatabaseFiles = new Set([
  "病程分期康复管理总览.md",
]);

function firstMatch(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function allMatches(content, pattern) {
  return [...content.matchAll(pattern)].map((match) => match[1].trim()).filter(Boolean);
}

function addIfMatch(list, text, needle, value) {
  if (text.includes(needle) && !list.includes(value)) {
    list.push(value);
  }
}

function deriveMeta(name, title, content) {
  const titleText = `${name}\n${title}`;
  const text = `${titleText}\n${content}`;
  let module = "other";
  let summary = "数据库原始内容";

  if (/康复红旗征|红旗征/.test(titleText)) {
    module = "redflags";
    summary = "红旗征优先核查";
  } else if (/(病因特定红旗|禁忌|DVT|低血压|压疮|自主神经反射异常|疼痛管理|痉挛)/.test(titleText)) {
    module = "complication";
    summary = "并发症与风险管理";
  } else if (/(超急性期|急性期|亚急性期|病程分期)/.test(titleText)) {
    module = "stage";
    summary = "病程阶段相关内容";
  } else if (/(康复目标|物理治疗 \(PT\) 目标|作业治疗 \(OT\) 目标|言语治疗 \(ST\) 目标|呼吸康复目标)/.test(titleText)) {
    module = "goals";
    summary = "康复目标与专业分工";
  } else if (/多学科康复治疗重点/.test(titleText)) {
    module = "focus";
    summary = "多学科治疗重点";
  } else if (/(ASIA|AIS|颈段脊髓损伤|胸段脊髓损伤|腰骶段及马尾损伤)/.test(titleText)) {
    module = "expectation";
    summary = "按节段与 AIS 查看功能潜力";
  } else if (/(转移|步行|居家)/.test(titleText)) {
    module = "function";
    summary = "功能训练与居家指导";
  }

  const etiologies = [];
  const subtypes = [];
  const levels = [];
  const stages = [];
  const professions = [];
  const ais = [];

  addIfMatch(etiologies, text, "创伤性", "traumatic");
  addIfMatch(etiologies, text, "TSCI", "traumatic");
  addIfMatch(etiologies, text, "非创伤性", "nontraumatic");
  addIfMatch(etiologies, text, "NTSCI", "nontraumatic");

  addIfMatch(subtypes, text, "缺血性", "ischemic");
  addIfMatch(subtypes, text, "肿瘤性", "neoplastic");
  addIfMatch(subtypes, text, "特殊机制", "other_nontraumatic");
  addIfMatch(subtypes, text, "电击", "other_nontraumatic");
  addIfMatch(subtypes, text, "潜水减压病", "other_nontraumatic");

  addIfMatch(levels, text, "颈段", "cervical");
  addIfMatch(levels, text, "颈髓", "cervical");
  addIfMatch(levels, text, "C1", "cervical");
  addIfMatch(levels, text, "胸段", "thoracic");
  addIfMatch(levels, text, "高胸段", "thoracic");
  addIfMatch(levels, text, "T6", "thoracic");
  addIfMatch(levels, text, "腰骶段", "lumbosacral");
  addIfMatch(levels, text, "马尾", "lumbosacral");
  addIfMatch(levels, text, "L1", "lumbosacral");

  addIfMatch(stages, titleText, "72小时内", "hyperacute");
  addIfMatch(stages, titleText, "<72小时", "hyperacute");
  addIfMatch(stages, titleText, "14天内", "acute");
  addIfMatch(stages, titleText, "14天以后", "rehab");
  addIfMatch(stages, titleText, "亚急性期", "rehab");
  addIfMatch(stages, titleText, "康复期", "rehab");

  if (/物理治疗 \(PT\)|物理治疗/.test(titleText) || /^#\s*物理治疗 \(PT\)/m.test(content)) {
    professions.push("PT");
  }
  if (/作业治疗 \(OT\)|作业治疗/.test(titleText) || /^#\s*作业治疗 \(OT\)/m.test(content)) {
    professions.push("OT");
  }
  if (/言语治疗 \(ST\)|言语治疗/.test(titleText) || /^#\s*言语治疗 \(ST\)/m.test(content)) {
    professions.push("ST");
  }
  if (/呼吸康复/.test(titleText) || /^#\s*呼吸康复/m.test(content)) {
    professions.push("RESP");
  }

  for (const grade of ["A", "B", "C", "D", "E"]) {
    addIfMatch(ais, text, `AIS ${grade}`, grade);
  }

  const displayGroup = module === "redflags"
    ? "redflags"
    : module === "stage"
      ? "stage"
      : module === "goals"
        ? "goals"
        : module === "focus"
          ? "focus"
          : module === "expectation"
            ? "expectation"
            : module === "function"
              ? "function"
              : module === "complication"
                ? "complication"
                : "other";

  return {
    module,
    displayGroup,
    summary,
    etiologies,
    subtypes,
    levels,
    stages,
    professions,
    ais,
  };
}

function normalizeMultiValue(value, fallback = []) {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed === "all") {
    return [];
  }
  if (trimmed === "none") {
    return [];
  }
  return trimmed
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function levelsFromSegments(segmentsExact, segmentRanges) {
  const joined = [...segmentsExact, ...segmentRanges].join(",");
  const levels = [];

  if (/(^|,)\s*C\d|(^|,)\s*C1-T1|(^|,)\s*C1-C4|(^|,)\s*C5-C8/.test(joined)) {
    levels.push("cervical");
  }
  if (/(^|,)\s*T\d|(^|,)\s*T2-T6|(^|,)\s*T2-T12/.test(joined)) {
    levels.push("thoracic");
  }
  if (/(^|,)\s*L\d|(^|,)\s*S\d|(^|,)\s*L1-S5/.test(joined)) {
    levels.push("lumbosacral");
  }

  return levels;
}

function parseMetaBlocks(content) {
  const blockRegex = /%%META\s*\n([\s\S]*?)\n%%/g;
  const matches = [...content.matchAll(blockRegex)];

  return matches.map((match, index) => {
    const blockText = match[1];
    const blockStart = match.index ?? 0;
    const blockEnd = blockStart + match[0].length;
    const nextStart = matches[index + 1]?.index ?? content.length;
    let sectionBody = content.slice(blockEnd, nextStart).trim();
    sectionBody = sectionBody.replace(/(?:\n\s*)+#{2,6}\s+[^\n]+\s*$/u, "").trim();
    const meta = {};

    for (const line of blockText.split("\n")) {
      const parsed = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)\s*$/);
      if (!parsed) {
        continue;
      }
      meta[parsed[1]] = parsed[2];
    }

    if (!sectionBody) {
      return null;
    }

    return {
      meta,
      body: sectionBody,
      start: blockStart,
    };
  }).filter(Boolean);
}

function nearestHeadingBefore(content, start) {
  const before = content.slice(0, start);
  const headingMatches = [...before.matchAll(/^(#{2,6})\s+(.+)$/gm)];
  if (!headingMatches.length) {
    return null;
  }
  return headingMatches[headingMatches.length - 1][2].trim();
}

function titleFromSection(content, section, fallback) {
  const headingBefore = nearestHeadingBefore(content, section.start);

  return firstMatch(section.body, /^\s*>\s*>?\s*##\s*(.+)$/m)
    || headingBefore
    || fallback;
}

function buildDocEntries(name, content) {
  const baseId = path.basename(name, ".md");
  const title =
    firstMatch(content, /^Title:\s*(.+)$/m) ||
    firstMatch(content, /^#\s+(.+)$/m) ||
    baseId;
  const type = firstMatch(content, /^Type:\s*(.+)$/m);
  const rawSources = allMatches(content, /\[\[([^\]]+)\]\]/g);
  const tagLine = firstMatch(content, /^#标签:\s*(.+)$/m);
  const tags = tagLine ? tagLine.split(/\s+/).map((tag) => tag.trim()).filter(Boolean) : [];
  const metaSections = parseMetaBlocks(content);

  if (!metaSections.length) {
    const derived = deriveMeta(baseId, title, content);
    return [{
      id: baseId,
      path: `DATABASE/${name}`,
      title,
      type,
      sources: [...new Set(rawSources.filter((value) => /中国|德国|日本|美国|PVA/.test(value)))],
      tags,
      content,
      ...derived,
    }];
  }

  return metaSections.map((section, index) => {
    const derived = deriveMeta(baseId, title, section.body);
    const meta = section.meta;
    const docId = (meta.id && meta.id.trim() && meta.id.trim() !== "rf-")
      ? meta.id.trim()
      : `${baseId}-section-${index + 1}`;
    const sectionTitle = titleFromSection(content, section, `${title} - ${index + 1}`);
    const segmentsExact = normalizeMultiValue(meta.segments_exact);
    const segmentRanges = normalizeMultiValue(meta.segment_ranges);
    const explicitLevels = levelsFromSegments(segmentsExact, segmentRanges);
    const sectionSources = normalizeMultiValue(meta.sources, [...new Set(rawSources.filter((value) => /中国|德国|日本|美国|PVA/.test(value)))]);

    return {
      id: docId,
      path: `DATABASE/${name}#${docId}`,
      title: sectionTitle,
      type,
      sources: sectionSources,
      tags,
      content: section.body,
      module: meta.module?.trim() || derived.module,
      displayGroup: meta.displayGroup?.trim() || derived.displayGroup,
      summary: meta.summary?.trim() || derived.summary,
      priority: meta.priority?.trim() || "normal",
      etiologies: normalizeMultiValue(meta.etiologies, derived.etiologies),
      subtypes: normalizeMultiValue(meta.subtypes, derived.subtypes),
      levels: explicitLevels.length ? explicitLevels : derived.levels,
      stages: normalizeMultiValue(meta.stages, derived.stages),
      professions: normalizeMultiValue(meta.professions, derived.professions),
      ais: normalizeMultiValue(meta.ais, derived.ais),
      segments_exact: segmentsExact,
      segment_ranges: segmentRanges,
    };
  });
}

const files = fs.readdirSync(databaseDir)
  .filter((name) => name.endsWith(".md"))
  .filter((name) => !excludedDatabaseFiles.has(name))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

const docs = files.flatMap((name) => {
  const fullPath = path.join(databaseDir, name);
  const content = fs.readFileSync(fullPath, "utf8");
  return buildDocEntries(name, content);
});

const guideFiles = fs.existsSync(guideDir)
  ? fs.readdirSync(guideDir)
    .filter((name) => /\.(pdf|md|txt)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => {
      const lower = name.toLowerCase();
      let source = "指南原文";
      if (name.includes("中国") || name.includes("创伤性脊髓损伤康复指南")) {
        source = "中国 2025";
      } else if (lower.includes("german") || lower.includes("eu_")) {
        source = "德国 / 欧洲 2025";
      } else if (lower.includes("japan")) {
        source = "日本 2021";
      } else if (lower.includes("pva") || lower.includes("us_")) {
        source = "美国 PVA 2021";
      }

      return {
        id: path.basename(name, path.extname(name)),
        name,
        label: source,
        href: `${githubRepoBase}/GUIDE/${encodeURIComponent(name).replace(/%2F/g, "/")}?raw=1`,
      };
    })
  : [];

fs.writeFileSync(
  outputFile,
  `window.__SCI_DATA__ = ${JSON.stringify(docs)};\nwindow.__SCI_GUIDES__ = ${JSON.stringify(guideFiles)};`,
  "utf8"
);

console.log(`Generated ${outputFile} with ${docs.length} docs and ${guideFiles.length} guides.`);
