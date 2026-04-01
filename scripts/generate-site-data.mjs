import fs from "node:fs";
import path from "node:path";

const databaseDir = path.resolve("D:/SCIGUIDEAPP/DATABASE");
const guideDir = path.resolve("D:/SCIGUIDEAPP/GUIDE");
const outputFile = path.resolve("D:/SCIGUIDEAPP/site/data.js");

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

  return {
    module,
    displayGroup: module === "redflags"
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
                  : "other",
    summary,
    etiologies,
    subtypes,
    levels,
    stages,
    professions,
    ais,
  };
}

const files = fs.readdirSync(databaseDir)
  .filter((name) => name.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

const docs = files.map((name) => {
  const fullPath = path.join(databaseDir, name);
  const content = fs.readFileSync(fullPath, "utf8");
  const title =
    firstMatch(content, /^Title:\s*(.+)$/m) ||
    firstMatch(content, /^#\s+(.+)$/m) ||
    path.basename(name, ".md");
  const type = firstMatch(content, /^Type:\s*(.+)$/m);
  const rawSources = allMatches(content, /\[\[([^\]]+)\]\]/g);
  const tagLine = firstMatch(content, /^#标签:\s*(.+)$/m);
  const tags = tagLine ? tagLine.split(/\s+/).map((tag) => tag.trim()).filter(Boolean) : [];
    const derived = deriveMeta(path.basename(name, ".md"), title, content);

  return {
    id: path.basename(name, ".md"),
    path: `DATABASE/${name}`,
    title,
    type,
    sources: [...new Set(rawSources.filter((value) => /中国|德国|日本|美国|PVA/.test(value)))],
    tags,
    content,
    ...derived,
  };
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
        href: `../GUIDE/${encodeURIComponent(name).replace(/%2F/g, "/")}`,
      };
    })
  : [];

fs.writeFileSync(
  outputFile,
  `window.__SCI_DATA__ = ${JSON.stringify(docs)};\nwindow.__SCI_GUIDES__ = ${JSON.stringify(guideFiles)};`,
  "utf8"
);
console.log(`Generated ${outputFile} with ${docs.length} docs and ${guideFiles.length} guides.`);
