(function () {
  const rawDocs = (window.__SCI_DATA__ || []).slice();
  const guides = (window.__SCI_GUIDES__ || []).slice();

  const landingView = document.getElementById("landing-view");
  const resultsView = document.getElementById("results-view");
  const form = document.getElementById("intake-form");
  const resetButton = document.getElementById("reset-form");
  const editCaseButton = document.getElementById("edit-case");
  const etiologySelect = document.getElementById("etiology");
  const subtypeSelect = document.getElementById("subtype");
  const subtypeField = document.getElementById("subtype-field");
  const resultGroups = document.getElementById("result-groups");
  const floatingActionsHost = document.getElementById("floating-actions-host");
  const articleView = document.getElementById("article-view");
  const articleMeta = document.getElementById("article-meta");
  const mobileArticleBackButton = document.getElementById("mobile-article-back");
  const resultSummary = document.getElementById("result-summary");
  const guidelineList = document.getElementById("guideline-list");
  const caseSummary = document.getElementById("case-summary");

  const state = {
    selectedDocId: null,
    teardownCurrentModuleButton: null,
    mobileArticleOpen: false,
    mobileReturnScrollTop: 0,
    filters: {
      etiology: "all",
      subtype: "all",
      level: "all",
      asia: "all",
      stage: "all",
      profession: "all",
    },
  };

  const LABELS = {
    etiology: {
      all: "未限定",
      traumatic: "创伤性",
      nontraumatic: "非创伤性",
    },
    subtype: {
      all: "未限定",
      ischemic: "缺血性",
      neoplastic: "肿瘤性",
      other_nontraumatic: "其他非创伤性及特殊机制",
    },
    asia: {
      all: "未限定",
      A: "AIS A",
      B: "AIS B",
      C: "AIS C",
      D: "AIS D",
      E: "AIS E",
    },
    stage: {
      all: "未限定",
      hyperacute: "72h 内",
      acute: "14 天内",
      rehab: "14 天以后",
    },
    profession: {
      all: "未限定",
      PT: "PT",
      OT: "OT",
      ST: "ST",
      RESP: "呼吸康复",
    },
  };

  const SEGMENT_ORDER = [
    "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8",
    "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
    "L1", "L2", "L3", "L4", "L5",
    "S1", "S2", "S3", "S4", "S5",
  ];

  const GROUPS = [
    { key: "introduction", title: "阶段简介", summary: "概况、定位与当前优先警示", defaultOpen: true, priority: "normal" },
    { key: "redflags", title: "全部可能的红旗征", summary: "先看风险与禁忌", defaultOpen: true, priority: "critical" },
    { key: "expectation", title: "康复预期", summary: "节段、AIS 与移动潜力", defaultOpen: false, priority: "normal" },
    { key: "stage", title: "康复管理", summary: "按病程阶段查看管理策略", defaultOpen: false, priority: "normal" },
    { key: "goals", title: "康复目标", summary: "按职业与阶段查看目标", defaultOpen: false, priority: "normal" },
    { key: "focus", title: "康复重点", summary: "多学科治疗重点与核心技术", defaultOpen: false, priority: "normal" },
    { key: "therapy", title: "康复治疗方面", summary: "训练方法、介入时机与治疗策略", defaultOpen: false, priority: "normal" },
    { key: "function", title: "转移和移乘", summary: "转移、移乘与功能训练", defaultOpen: false, priority: "normal" },
    { key: "spasticity", title: "痉挛管理", summary: "痉挛、肌张力与诱因", defaultOpen: false, priority: "normal" },
    { key: "pain", title: "疼痛管理", summary: "疼痛分类与干预", defaultOpen: false, priority: "normal" },
    { key: "home-guide", title: "居家指导", summary: "病房和居家自主训练", defaultOpen: false, priority: "normal" },
    { key: "special", title: "其他特殊临床综合征", summary: "特殊综合征与补充内容", defaultOpen: false, priority: "normal" },
  ];

  function stripObsidianArtifacts(text) {
    return String(text || "")
      .replace(/%%META[\s\S]*?%%/g, " ")
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]|]+)\|?\]\]/g, "$2")
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\]\]/g, "$1")
      .replace(/\\\|/g, "|")
      .replace(/\^[A-Za-z0-9_-]+\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeDisplayTitle(title) {
    return stripObsidianArtifacts(
      String(title || "")
        .replace(/^\d+\.\s*/u, "")
        .replace(/\s*-\s*\d+$/u, "")
    );
  }

  function normalizeGroupToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
  }

  function hasKeyword(text, keywords) {
    const source = String(text || "");
    return keywords.some((keyword) => source.includes(keyword));
  }

  function inferGroup(doc) {
    const token = normalizeGroupToken(doc.displayGroup || doc.module);
    const text = `${doc.title || ""} ${doc.id || ""}`;

    if (token === "therapy-focus") {
      return "focus";
    }
    if (token === "home-guide") {
      return "home-guide";
    }
    if (token === "spasticity-managament" || token === "spasticity-management") {
      return "spasticity";
    }
    if (token.includes("redflags") || token.includes("reflags")) {
      if (hasKeyword(text, ["疼痛", "Pain"])) {
        return "pain";
      }
      if (hasKeyword(text, ["痉挛", "肌张力"])) {
        return "spasticity";
      }
      return "redflags";
    }
    if (token === "complication") {
      if (hasKeyword(text, ["疼痛", "Pain"])) {
        return "pain";
      }
      if (hasKeyword(text, ["痉挛", "肌张力"])) {
        return "spasticity";
      }
      return "redflags";
    }
    if (token === "introduction") {
      if (hasKeyword(text, ["综合征", "特殊机制", "致伤机制", "脊髓休克"])) {
        return "special";
      }
      return "introduction";
    }
    if (GROUPS.some((group) => group.key === token)) {
      return token;
    }
    return "special";
  }

  function segmentRegion(segment) {
    if (!segment || segment === "all") {
      return "all";
    }
    if (/^C\d+$/i.test(segment)) {
      return "cervical";
    }
    if (/^T\d+$/i.test(segment)) {
      return "thoracic";
    }
    if (/^[LS]\d+$/i.test(segment)) {
      return "lumbosacral";
    }
    return "all";
  }

  function segmentIndex(segment) {
    return SEGMENT_ORDER.indexOf(String(segment || "").toUpperCase());
  }

  function rangeContainsSegment(range, segment) {
    const cleanedRange = String(range || "").toUpperCase().trim();
    const cleanedSegment = String(segment || "").toUpperCase().trim();
    if (!cleanedRange || !cleanedSegment) {
      return false;
    }
    if (cleanedRange === cleanedSegment) {
      return true;
    }
    const parts = cleanedRange.split("-");
    if (parts.length !== 2) {
      return false;
    }
    const start = segmentIndex(parts[0].trim());
    const end = segmentIndex(parts[1].trim());
    const current = segmentIndex(cleanedSegment);
    if (start === -1 || end === -1 || current === -1) {
      return false;
    }
    return current >= Math.min(start, end) && current <= Math.max(start, end);
  }

  function normalizeDoc(doc, usedIds) {
    const canonicalId = String(doc.id || "doc").trim() || "doc";
    const count = usedIds.get(canonicalId) || 0;
    usedIds.set(canonicalId, count + 1);
    const uniqueId = count === 0 ? canonicalId : `${canonicalId}__${count + 1}`;
    return {
      ...doc,
      canonicalId,
      id: uniqueId,
      title: normalizeDisplayTitle(doc.title),
      groupKey: inferGroup(doc),
      segments_exact: Array.isArray(doc.segments_exact) ? doc.segments_exact : [],
      segment_ranges: Array.isArray(doc.segment_ranges) ? doc.segment_ranges : [],
      etiologies: Array.isArray(doc.etiologies) ? doc.etiologies : [],
      subtypes: Array.isArray(doc.subtypes) ? doc.subtypes : [],
      levels: Array.isArray(doc.levels) ? doc.levels : [],
      stages: Array.isArray(doc.stages) ? doc.stages : [],
      professions: Array.isArray(doc.professions) ? doc.professions : [],
      ais: Array.isArray(doc.ais) ? doc.ais : [],
      sources: Array.isArray(doc.sources) ? doc.sources.filter(Boolean) : [],
      summary: stripObsidianArtifacts(String(doc.summary || "").trim()),
      content: String(doc.content || ""),
    };
  }

  const docs = (() => {
    const usedIds = new Map();
    return rawDocs.map((doc) => normalizeDoc(doc, usedIds));
  })();

  function isMobileLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function setMobileArticleOpen(open, options = {}) {
    state.mobileArticleOpen = open;
    document.body.classList.toggle("mobile-article-open", open);

    if (!open && options.restoreScroll !== false) {
      window.scrollTo({
        top: typeof state.mobileReturnScrollTop === "number" ? state.mobileReturnScrollTop : 0,
        behavior: "smooth",
      });
    }
  }

  function updateSubtypeVisibility() {
    const show = etiologySelect.value === "nontraumatic";
    subtypeField.hidden = !show;
    subtypeField.style.display = show ? "block" : "none";
    if (!show) {
      subtypeSelect.value = "all";
    }
  }

  function allowsSelected(selected, values) {
    if (selected === "all") {
      return true;
    }
    return !values || !values.length || values.includes(selected);
  }

  function docSegmentSpecificity(doc, selectedSegment) {
    if (selectedSegment === "all") {
      return 0;
    }
    const segment = String(selectedSegment).toUpperCase();
    const exact = doc.segments_exact.map((value) => String(value).toUpperCase());
    const ranges = doc.segment_ranges.map((value) => String(value).toUpperCase());

    if (exact.includes(segment)) {
      return 3;
    }
    if (ranges.some((range) => rangeContainsSegment(range, segment))) {
      return 2;
    }

    const region = segmentRegion(segment);
    if (doc.levels.includes(region)) {
      return 1;
    }
    return 0;
  }

  function docMatchesSegment(doc, selectedSegment) {
    if (selectedSegment === "all") {
      return true;
    }
    const hasSegmentMeta = doc.segments_exact.length || doc.segment_ranges.length;
    if (hasSegmentMeta) {
      return docSegmentSpecificity(doc, selectedSegment) > 0;
    }
    return docSegmentSpecificity(doc, selectedSegment) > 0 || !doc.levels.length;
  }

  function docEligible(doc, filters) {
    return allowsSelected(filters.etiology, doc.etiologies)
      && allowsSelected(filters.subtype, doc.subtypes)
      && docMatchesSegment(doc, filters.level)
      && allowsSelected(filters.stage, doc.stages)
      && allowsSelected(filters.profession, doc.professions)
      && allowsSelected(filters.asia, doc.ais);
  }

  function scoreDoc(doc, filters) {
    let score = 0;
    if (doc.groupKey === "redflags") {
      score += 120;
    }
    if (doc.groupKey === "introduction") {
      score += 16;
    }
    if (filters.etiology !== "all" && doc.etiologies.includes(filters.etiology)) {
      score += 22;
    }
    if (filters.subtype !== "all" && doc.subtypes.includes(filters.subtype)) {
      score += 22;
    }
    if (filters.stage !== "all" && doc.stages.includes(filters.stage)) {
      score += 18;
    }
    if (filters.profession !== "all" && doc.professions.includes(filters.profession)) {
      score += 16;
    }
    if (filters.asia !== "all" && doc.ais.includes(filters.asia)) {
      score += 14;
    }
    score += docSegmentSpecificity(doc, filters.level) * 16;
    return score;
  }

  function filterDocsBySegmentPriority(entries, filters, options = {}) {
    if (filters.level === "all") {
      return entries;
    }

    const maxSpecificity = entries.reduce((max, entry) => {
      return Math.max(max, docSegmentSpecificity(entry.doc, filters.level));
    }, 0);

    if (maxSpecificity <= 0) {
      return entries;
    }

    return entries.filter(({ doc }) => {
      const specificity = docSegmentSpecificity(doc, filters.level);
      if (specificity === maxSpecificity) {
        return true;
      }

      const hasSegmentMeta = doc.segments_exact.length || doc.segment_ranges.length || doc.levels.length;
      if (hasSegmentMeta) {
        return false;
      }

      return Boolean(options.keepGeneric);
    });
  }

  function basePathFromDoc(doc) {
    return String(doc.path || "").split("#")[0];
  }

  function mergeDocs(primaryDoc, docsToMerge) {
    const ordered = docsToMerge.slice().sort((a, b) => {
      const aSpecific = state.filters.profession !== "all" && a.professions.includes(state.filters.profession) ? 1 : 0;
      const bSpecific = state.filters.profession !== "all" && b.professions.includes(state.filters.profession) ? 1 : 0;
      if (aSpecific !== bSpecific) {
        return bSpecific - aSpecific;
      }
      const aGeneric = a.professions.length === 0 || a.professions.includes("all");
      const bGeneric = b.professions.length === 0 || b.professions.includes("all");
      if (aGeneric !== bGeneric) {
        return bGeneric - aGeneric;
      }
      return a.title.localeCompare(b.title, "zh-CN");
    });

    const mergedContent = ordered
      .map((doc) => String(doc.content || "").trim())
      .filter(Boolean)
      .join("\n\n")
      .trim();

    return {
      ...primaryDoc,
      sources: [...new Set(ordered.flatMap((doc) => doc.sources || []))],
      professions: [...new Set(ordered.flatMap((doc) => doc.professions || []))],
      content: mergedContent || String(primaryDoc.content || "").trim(),
    };
  }

  function shouldHideGoalSupplement(doc) {
    const title = String(doc.title || "");
    return /专业分工任务矩阵|点击跳转|疾病病因|AIS 等级|核心任务/u.test(title);
  }

  function contentHasSegmentCue(content) {
    const source = String(content || "");
    return /\b[CTLS]\d{1,2}\s*-\s*[CTLS]\d{1,2}\b/iu.test(source)
      || /\b[CTLS]\d{1,2}\b/iu.test(source)
      || /\b[CTLS]\d{1,2}\s*(以上|以下)\b/iu.test(source);
  }

  function filterContentToProfessionSection(content, profession) {
    if (!profession || profession === "all") {
      return String(content || "").trim();
    }

    const headingMap = {
      PT: /(#{2,6}\s+.*物理治疗.*|#{2,6}\s+.*PT.*)/u,
      OT: /(#{2,6}\s+.*作业治疗.*|#{2,6}\s+.*OT.*)/u,
      ST: /(#{2,6}\s+.*言语治疗.*|#{2,6}\s+.*ST.*)/u,
      RESP: /(#{2,6}\s+.*呼吸康复.*|#{2,6}\s+.*RESP.*)/u,
    };

    const lines = String(content || "").split("\n");
    const targetHeading = headingMap[profession];
    if (!targetHeading) {
      return String(content || "").trim();
    }

    const headingIndices = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /^#{2,6}\s+/u.test(line));

    const startHeading = headingIndices.find(({ line }) => targetHeading.test(line));
    if (!startHeading) {
      return String(content || "").trim();
    }

    const currentLevel = (startHeading.line.match(/^(#{2,6})/u) || [,"###"])[1].length;
    const nextHeading = headingIndices.find(({ index, line }) =>
      index > startHeading.index && ((line.match(/^(#{2,6})/u)?.[1].length || 6) <= currentLevel)
    );

    const endIndex = nextHeading ? nextHeading.index : lines.length;
    return lines.slice(startHeading.index, endIndex).join("\n").trim();
  }

  function buildDisplayContent(doc, filters) {
    let content = String(doc.content || "").trim();

    if (doc.groupKey === "redflags") {
      if (filters.level !== "all") {
        const selectedSegment = String(filters.level || "").toUpperCase();
        const filteredLines = content
          .split("\n")
          .filter((line) => lineRelevantToSegment(line, selectedSegment));
        const filteredContent = filteredLines.join("\n").trim();
        if (filteredContent) {
          content = filteredContent;
        } else if (contentHasSegmentCue(content)) {
          return "";
        }
      }
      return content;
    }

    if (doc.groupKey === "spasticity" && filters.profession !== "all") {
      content = filterContentToProfessionSection(content, filters.profession);
      return content;
    }

    if (doc.groupKey !== "goals" || !/核心任务/u.test(String(doc.title || ""))) {
      return content;
    }

    const siblingEntries = docs
      .filter((item) =>
        item.id !== doc.id
        && item.groupKey === "goals"
        && basePathFromDoc(item) === basePathFromDoc(doc)
        && docEligible(item, filters)
        && !shouldHideGoalSupplement(item)
      )
      .map((item) => ({ doc: item, score: scoreDoc(item, filters) }));

    const prioritized = filterDocsBySegmentPriority(siblingEntries, filters, { keepGeneric: false })
      .map(({ doc: item }) => item);

    if (!prioritized.length) {
      return content;
    }

    const supplements = prioritized
      .map((item) => {
        const heading = `### ${normalizeDisplayTitle(item.title)}`;
        const body = String(item.content || "").trim();
        return body ? `${heading}\n${body}` : heading;
      })
      .join("\n\n");

    return [content, supplements].filter(Boolean).join("\n\n").trim();
  }

  function lineRelevantToSegment(line, selectedSegment) {
    if (!selectedSegment || selectedSegment === "ALL") {
      return true;
    }

    const source = String(line || "");
    const selectedIndex = segmentIndex(selectedSegment);

    const thresholdMatches = [...source.matchAll(/\b([CTLS]\d{1,2})\s*(以上|以下)\b/giu)];
    if (thresholdMatches.length && selectedIndex !== -1) {
      for (const [, token, direction] of thresholdMatches) {
        const tokenIndex = segmentIndex(String(token).toUpperCase());
        if (tokenIndex === -1) {
          continue;
        }
        if ((direction === "以上" && selectedIndex >= tokenIndex) || (direction === "以下" && selectedIndex <= tokenIndex)) {
          return true;
        }
      }
    }

    const rawRangeMatches = [...source.matchAll(/\b([CTLS]\d{1,2}\s*-\s*[CTLS]\d{1,2})\b/giu)];
    const rangeTokens = rawRangeMatches.map((match) => match[1].replace(/\s+/g, "").toUpperCase());
    let remainder = source;
    rawRangeMatches.forEach((match) => {
      remainder = remainder.replace(match[1], " ");
    });
    const exactTokens = [...remainder.matchAll(/\b([CTLS]\d{1,2})\b/giu)].map((match) => match[1].toUpperCase());

    if (!rangeTokens.length && !exactTokens.length && !thresholdMatches.length) {
      return true;
    }

    if (rangeTokens.some((token) => rangeContainsSegment(token, selectedSegment))) {
      return true;
    }

    if (exactTokens.includes(selectedSegment)) {
      return true;
    }

    return false;
  }

  function buildStageIntroCard(scoredDocs, filters) {
    const introEntries = scoredDocs
      .filter(({ doc }) => doc.groupKey === "introduction" && docEligible(doc, filters))
      .sort((a, b) => docSegmentSpecificity(b.doc, filters.level) - docSegmentSpecificity(a.doc, filters.level) || b.score - a.score)
      .slice(0, 8);

    const introDocs = filterDocsBySegmentPriority(introEntries, filters, { keepGeneric: false })
      .map(({ doc }) => doc);

    const stageDocs = scoredDocs
      .filter(({ doc }) => doc.groupKey === "stage" && docEligible(doc, filters))
      .map(({ doc }) => doc)
      .slice(0, 3);

    const warningDocs = scoredDocs
      .filter(({ doc }) => doc.groupKey === "redflags" && docEligible(doc, filters))
      .sort((a, b) => b.score - a.score)
      .map(({ doc }) => doc)
      .slice(0, 6);

    const specialDocs = scoredDocs
      .filter(({ doc }) => doc.groupKey === "special" && docEligible(doc, filters))
      .sort((a, b) => b.score - a.score)
      .map(({ doc }) => doc)
      .slice(0, 1);

    const leadDoc = introDocs.find((doc) => !/^\d+\./u.test(String(doc.title || ""))) || introDocs[0] || stageDocs[0] || null;
    const summaryBullets = [];

    function meaningfulBulletLines(doc) {
      const raw = buildDisplayContent(doc, filters)
        .replace(/%%META[\s\S]*?%%/g, "")
        .split("\n")
        .filter(Boolean);

      return raw
        .filter((line) => /^\s*-\s+/.test(line));
    }

    if (leadDoc) {
      const leadSummary = leadDoc.summary && leadDoc.summary !== "数据库原始内容"
        ? leadDoc.summary
        : leadDoc.title;
      summaryBullets.push(`- **核心定位**：${leadSummary}`);
    }

    introDocs.filter((doc) => !leadDoc || doc.id !== leadDoc.id).forEach((doc) => {
      const bullets = meaningfulBulletLines(doc);
      if (bullets.length) {
        summaryBullets.push(`- **${normalizeDisplayTitle(doc.title).replace(/^\d+\.\s*/u, "")}**`);
        bullets.forEach((line) => {
          summaryBullets.push(`    ${line.trim()}`);
        });
        return;
      }
      const text = doc.summary && doc.summary !== "数据库原始内容"
        ? `${doc.title}：${doc.summary}`
        : doc.title;
      summaryBullets.push(`- ${text}`);
    });

    stageDocs.forEach((doc) => {
      const text = doc.summary && doc.summary !== "数据库原始内容"
        ? `${doc.title}：${doc.summary}`
        : doc.title;
      if (!summaryBullets.includes(`- ${text}`)) {
        summaryBullets.push(`- ${text}`);
      }
    });

      const warningBullets = warningDocs
        .map((doc) => `- ${doc.title}`)
        .filter((line, index, list) => list.indexOf(line) === index);

      const aisIntroDoc = docs.find((doc) => /ASIA 残损分级 \(AIS\).*简介/u.test(String(doc.title || "")));
      const spinalShockDoc = docs.find((doc) => /脊髓休克/u.test(String(doc.title || "")));

      const content = [
        `- **当前阶段**：${LABELS.stage[filters.stage] || "未限定"}`,
        `- **当前病因**：${LABELS.etiology[filters.etiology] || "未限定"}${filters.etiology === "nontraumatic" ? ` / ${LABELS.subtype[filters.subtype] || "未限定"}` : ""}`,
        `- **当前节段**：${filters.level === "all" ? "未限定" : filters.level}`,
      `- **当前 AIS**：${LABELS.asia[filters.asia] || "未限定"}`,
    ];

      if (summaryBullets.length) {
        content.push("", "### 当前要点", ...summaryBullets);
        if (aisIntroDoc) {
          content.push(`- **AIS 评定参考**：详见 [[${aisIntroDoc.title}]]。`);
        }
        if (filters.asia === "A" && spinalShockDoc) {
          content.push(`- **脊髓休克提醒**：详见 [[${spinalShockDoc.title}]]；病后数天至数周需定期重测 **BCR**，在 BCR 恢复后再判断 AIS 预后。`);
        }
      }
      if (warningBullets.length) {
        content.push("", "### 当前需优先警惕", ...warningBullets);
      }
    if (specialDocs.length) {
      content.push("", "### 其他补充", `- 详见 [[${specialDocs[0].title}]]。`);
    }

      const sources = [...new Set([...introDocs, ...stageDocs, ...specialDocs, ...(aisIntroDoc ? [aisIntroDoc] : []), ...(spinalShockDoc ? [spinalShockDoc] : [])].flatMap((doc) => doc.sources))];

    return {
      id: "__stage_intro__",
      canonicalId: "__stage_intro__",
      title: leadDoc ? `${leadDoc.title} 概览` : "当前阶段简介",
      summary: "根据当前筛选自动汇总阶段、节段、AIS 和关键红旗征。",
      content: content.join("\n"),
      sources,
      groupKey: "introduction",
    };
  }

  function buildGroupDocs(groupKey, scoredDocs, filters) {
    const eligible = scoredDocs
      .filter(({ doc }) => docEligible(doc, filters))
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, "zh-CN"));

    if (groupKey === "introduction") {
      return [buildStageIntroCard(scoredDocs, filters)];
    }

    if (groupKey === "redflags") {
      const redflags = eligible.filter(({ doc }) => doc.groupKey === "redflags");
      const hasSpecificEtiology = filters.etiology !== "all" && redflags.some(({ doc }) => doc.etiologies.length === 1 && doc.etiologies.includes(filters.etiology));
      const filtered = redflags.filter(({ doc }) => {
        if (!hasSpecificEtiology) {
          return true;
        }
        return !doc.etiologies.length || doc.etiologies.length === 1 || doc.etiologies.includes(filters.etiology);
      });
      const hasSpecificMatch = filtered.some(({ doc }) => scoreDoc(doc, filters) >= 140);
      return filtered
        .filter(({ doc }) => !hasSpecificMatch || scoreDoc(doc, filters) >= 140 || (!doc.etiologies.length && !doc.subtypes.length))
        .filter(({ doc }) => {
          const rendered = buildDisplayContent(doc, filters).trim();
          if (!rendered) {
            return false;
          }
          const plain = stripObsidianArtifacts(rendered)
            .replace(/#+\s*/g, "")
            .trim();
          return plain.length > 0;
        })
        .map(({ doc }) => doc);
    }

    if (groupKey === "expectation") {
      const selectedRegion = segmentRegion(filters.level);
      let expectationDocs = eligible
        .filter(({ doc }) => doc.groupKey === "expectation")
        .filter(({ doc }) => {
          const walkingSpecific = String(doc.canonicalId || doc.id || "").startsWith("exp-walking-")
            || hasKeyword(`${doc.title} ${doc.summary} ${doc.content}`, ["步行", "社区水平步行", "短距离步行"]);

          if (!walkingSpecific) {
            return true;
          }

          if (selectedRegion === "cervical" && filters.asia === "A") {
            return false;
          }

          return true;
        });

      expectationDocs = filterDocsBySegmentPriority(expectationDocs, filters, { keepGeneric: true });

      return expectationDocs.map(({ doc }) => doc);
    }

    if (groupKey === "function") {
      return filterDocsBySegmentPriority(
        eligible.filter(({ doc }) => doc.groupKey === "function"),
        filters,
        { keepGeneric: false }
      ).map(({ doc }) => doc);
    }

    if (groupKey === "goals") {
      const goalDocs = filterDocsBySegmentPriority(
        eligible.filter(({ doc }) => doc.groupKey === "goals"),
        filters,
        { keepGeneric: true }
      ).map(({ doc }) => doc);

      const merged = [];
      const seen = new Set();
      goalDocs.forEach((doc) => {
        const key = `${basePathFromDoc(doc)}::${normalizeDisplayTitle(doc.title)}`;
        if (seen.has(key)) {
          return;
        }
        const sameTitleDocs = goalDocs.filter((item) =>
          `${basePathFromDoc(item)}::${normalizeDisplayTitle(item.title)}` === key
        );
        seen.add(key);
        merged.push(mergeDocs(doc, sameTitleDocs));
      });

      return merged;
    }

    return eligible
      .filter(({ doc }) => doc.groupKey === groupKey)
      .map(({ doc }) => doc);
  }

  function buildRecommendedGroups(filters) {
    const scoredDocs = docs.map((doc) => ({ doc, score: scoreDoc(doc, filters) }));
    return GROUPS
      .map((group) => ({
        ...group,
        docs: buildGroupDocs(group.key, scoredDocs, filters).filter(Boolean),
      }))
      .filter((group) => group.docs.length);
  }

  function renderGroupList(groups) {
    if (typeof state.teardownCurrentModuleButton === "function") {
      state.teardownCurrentModuleButton();
      state.teardownCurrentModuleButton = null;
    }

    resultGroups.innerHTML = "";
    if (floatingActionsHost) {
      floatingActionsHost.innerHTML = "";
    }

    if (!groups.length) {
      resultGroups.innerHTML = '<p class="empty-state">No matched content for the current filters.</p>';
      setMobileArticleOpen(false, { restoreScroll: false });
      return;
    }

    const controls = document.createElement("div");
    controls.className = "group-actions";
    controls.innerHTML = '<button type="button" class="group-action-button" data-action="expand">Expand All</button>' +
      '<button type="button" class="group-action-button" data-action="collapse">Collapse All</button>';
    resultGroups.appendChild(controls);

    function setGroupExpanded(card, expanded) {
      if (!card) {
        return;
      }
      const body = card.querySelector(".group-body");
      const header = card.querySelector(".group-header");
      if (!body || !header) {
        return;
      }
      body.hidden = !expanded;
      header.setAttribute("aria-expanded", String(expanded));
    }

    function setAllGroupsExpanded(expanded) {
      resultGroups.querySelectorAll(".group-card").forEach((card) => {
        setGroupExpanded(card, expanded);
      });
    }

    function getGroupCards() {
      return Array.from(resultGroups.querySelectorAll(".group-card"));
    }

    function resolveCurrentGroupCard() {
      const cards = getGroupCards();
      if (!cards.length) {
        return null;
      }

      const anchorY = 180;
      let fallback = cards[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          continue;
        }
        if (rect.top <= anchorY && rect.bottom >= anchorY) {
          return card;
        }
        const distance = Math.abs(rect.top - anchorY);
        if (distance < bestDistance) {
          bestDistance = distance;
          fallback = card;
        }
      }

      return fallback;
    }

    groups.forEach((group) => {
      const card = document.createElement("section");
      card.className = "group-card";
      card.dataset.groupKey = group.key;
      card.dataset.priority = group.priority;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "group-header";
      header.setAttribute("aria-expanded", String(group.defaultOpen));
      header.innerHTML =         '<span>' +
          '<strong>' + group.title + '</strong>' +
          '<small>' + group.summary + '</small>' +
        '</span>' +
        '<span class="group-toggle" aria-hidden="true">+</span>';

      const body = document.createElement("div");
      body.className = "group-body";
      body.hidden = !group.defaultOpen;

      header.addEventListener("click", () => {
        setGroupExpanded(card, body.hidden);
      });

        group.docs.forEach((doc, index) => {
          const item = document.createElement("article");
          item.className = "doc-card";

          if (group.key === "redflags") {
            item.classList.add("doc-card-inline");
            item.innerHTML = `
              <h4 class="doc-inline-title">${doc.title}</h4>
              ${markdownToHtml(buildDisplayContent(doc, state.filters))}
            `;
            attachWikiLinkHandlers(item);
            body.appendChild(item);
            return;
          }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "doc-button";
        if (doc.id === state.selectedDocId) {
          button.classList.add("active");
        }
        const metaLine = doc.sources.length ? '<span class="doc-meta">Sources: ' + doc.sources.join(' · ') + '</span>' : '';
        button.innerHTML = '<span class="doc-title">' + doc.title + '</span>' + metaLine;

        const detail = document.createElement("div");
        detail.className = "doc-body";
        detail.hidden = !(group.defaultOpen && index === 0);
        detail.innerHTML = markdownToHtml(buildDisplayContent(doc, state.filters));
        attachWikiLinkHandlers(detail);

        button.addEventListener("click", () => {
          if (isMobileLayout()) {
            state.mobileReturnScrollTop = window.scrollY;
          }
          state.selectedDocId = doc.id;
          renderArticle(doc.id, { mobileOpen: true });
          resultGroups.querySelectorAll(".doc-button.active").forEach((node) => {
            node.classList.remove("active");
          });
          button.classList.add("active");
          detail.hidden = !detail.hidden;
        });

        item.appendChild(button);
        item.appendChild(detail);
        body.appendChild(item);
      });

      card.appendChild(header);
      card.appendChild(body);
      resultGroups.appendChild(card);
    });

    controls.querySelector('[data-action="expand"]').addEventListener("click", () => {
      setAllGroupsExpanded(true);
    });

    controls.querySelector('[data-action="collapse"]').addEventListener("click", () => {
      setAllGroupsExpanded(false);
    });

    if (floatingActionsHost) {
      floatingActionsHost.setAttribute("aria-hidden", "false");

      const actionStack = document.createElement("div");
      actionStack.className = "floating-action-stack";

      const currentGroupButton = document.createElement("button");
      currentGroupButton.type = "button";
      currentGroupButton.className = "module-float-button";
      currentGroupButton.textContent = "折叠本组";

      const topButton = document.createElement("button");
      topButton.type = "button";
      topButton.className = "module-float-button module-float-button-secondary";
      topButton.textContent = "顶部";

      actionStack.appendChild(currentGroupButton);
      actionStack.appendChild(topButton);
      floatingActionsHost.appendChild(actionStack);

      function updateCurrentModuleButton() {
        const currentCard = resolveCurrentGroupCard();
        currentGroupButton.disabled = !currentCard;
        if (!currentCard) {
          currentGroupButton.textContent = "折叠本组";
          return;
        }
        const title = currentCard.querySelector(".group-header strong")?.textContent?.trim() || "当前模块";
        currentGroupButton.textContent = window.innerWidth <= 760 ? `折叠${title}` : `折叠 ${title}`;
      }

      currentGroupButton.addEventListener("click", () => {
        const currentCard = resolveCurrentGroupCard();
        if (!currentCard) {
          return;
        }
        setGroupExpanded(currentCard, false);
        currentCard.scrollIntoView({ block: "start", behavior: "smooth" });
        updateCurrentModuleButton();
      });

      topButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      const onScroll = () => updateCurrentModuleButton();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      updateCurrentModuleButton();

      state.teardownCurrentModuleButton = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        actionStack.remove();
      };
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function inlineFormat(text) {
    return escapeHtml(
      String(text || "")
        .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]|]+)\|\]\]/g, "[[$1|$2]]")
        .replace(/\$\\ge\s*([0-9.]+)/g, "≥ $1")
        .replace(/\\ge\s*([0-9.]+)/g, "≥ $1")
        .replace(/\$\\le\s*([0-9.]+)/g, "≤ $1")
        .replace(/\\le\s*([0-9.]+)/g, "≤ $1")
        .replace(/\$\\times\s*/g, "× ")
        .replace(/\\times\s*/g, "× ")
        .replace(/\$\\pm\s*/g, "± ")
        .replace(/\\pm\s*/g, "± ")
        .replace(/\$/g, "")
    )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
        const label = alias || target;
        const resolved = resolveDocTarget(target);
        if (resolved) {
          return `<a href="#" class="wiki-link" role="button" data-target="${escapeHtml(target)}">${escapeHtml(label)}</a>`;
        }
        return `<span class="wiki-chip-passive">${escapeHtml(label)}</span>`;
      });
  }

  function renderAdmonitionBody(lines) {
    return lines
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) {
          return "";
        }
        if (/^\^[A-Za-z0-9_-]+\s*$/.test(trimmed)) {
          return "";
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return `<li>${inlineFormat(trimmed.replace(/^[-*]\s+/, ""))}</li>`;
        }
        if (/^##\s+/.test(trimmed)) {
          return `<h4>${inlineFormat(trimmed.replace(/^##\s+/, ""))}</h4>`;
        }
        return `<p>${inlineFormat(trimmed)}</p>`;
      })
      .join("");
  }

  function splitMarkdownTableRow(row) {
    const trimmed = String(row || "")
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "");

    const cells = [];
    let current = "";
    let escaped = false;

    for (const char of trimmed) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "|") {
        cells.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    if (escaped) {
      current += "\\";
    }

    cells.push(current.trim());
    return cells.map((cell) => cell.replace(/\\\|/g, "|"));
  }

  function resolveDocTarget(target) {
    return docs.find((doc) => doc.id === target)
      || docs.find((doc) => doc.canonicalId === target)
      || docs.find((doc) => doc.title.includes(target))
      || null;
  }

  function attachWikiLinkHandlers(scope) {
    scope.querySelectorAll(".wiki-link").forEach((button) => {
      if (button.dataset.wikiBound === "true") {
        return;
      }
      button.dataset.wikiBound = "true";

      const activate = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const doc = resolveDocTarget(button.getAttribute("data-target") || "");
        if (!doc) {
          return;
        }
        if (isMobileLayout()) {
          state.mobileReturnScrollTop = window.scrollY;
        }
        state.selectedDocId = doc.id;
        renderArticle(doc.id, { mobileOpen: true });
      };

      button.addEventListener("click", activate);
      button.addEventListener("touchend", activate, { passive: false });
    });
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "")
      .replace(/%%META[\s\S]*?\n%%/g, "")
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) =>
        !line.startsWith("Title:")
        && !line.startsWith("Type:")
        && !line.startsWith("Sources:")
        && !line.startsWith("Parent:")
        && !/^\s*(id|module|displayGroup|etiologies|subtypes|segments_exact|segment_ranges|stages|professions|ais|priority|sources|summary)\s*:/i.test(line)
        && !/^#标签[:：]/.test(line.trim())
        && line !== "---"
        && line.trim() !== "%%"
        && line.trim() !== "%%META"
      );

    let html = "";
    let listDepth = 0;
    let inCode = false;
    let inAdmonition = false;
    let admonitionType = "note";
    let admonitionLines = [];
    let tableLines = [];

    function closeList() {
      while (listDepth > 0) {
        html += "</ul>";
        listDepth -= 1;
      }
    }

    function openListDepth(targetDepth) {
      while (listDepth < targetDepth) {
        html += "<ul>";
        listDepth += 1;
      }
      while (listDepth > targetDepth) {
        html += "</ul>";
        listDepth -= 1;
      }
    }

    function closeAdmonition() {
      if (!inAdmonition) {
        return;
      }
      const body = renderAdmonitionBody(admonitionLines);
      html += `<section class="admonition admonition-${admonitionType}">${body.includes("<li>") ? `<ul>${body}</ul>` : body}</section>`;
      inAdmonition = false;
      admonitionLines = [];
    }

    function flushTable() {
      if (!tableLines.length) {
        return;
      }
      const rows = tableLines.map((entry) => splitMarkdownTableRow(entry));

      if (rows.length >= 2 && rows[1].every((cell) => /^:?-{2,}:?$/.test(cell))) {
        const header = rows[0];
        const bodyRows = rows.slice(2);
        html += `<div class="table-wrap"><table><thead><tr>${header.map((cell) => `<th>${inlineFormat(cell)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${inlineFormat(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      } else {
        html += `<pre>${escapeHtml(tableLines.join("\n"))}</pre>`;
      }

      tableLines = [];
    }

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (/^\^[A-Za-z0-9_-]+\s*$/.test(trimmed)) {
        return;
      }

      if (line.startsWith("```")) {
        closeList();
        closeAdmonition();
        flushTable();
        html += inCode ? "</pre>" : "<pre>";
        inCode = !inCode;
        return;
      }

      if (inCode) {
        html += `${escapeHtml(rawLine)}\n`;
        return;
      }

      if (!trimmed) {
        closeList();
        closeAdmonition();
        flushTable();
        return;
      }

      const admonitionOpen = trimmed.match(/^>\s*\[!([A-Z]+)\]\s*(.*)$/);
      if (admonitionOpen) {
        closeList();
        closeAdmonition();
        flushTable();
        inAdmonition = true;
        admonitionType = admonitionOpen[1].toLowerCase();
        admonitionLines = [];
        if (admonitionOpen[2]) {
          admonitionLines.push(`## ${admonitionOpen[2]}`);
        }
        return;
      }

      if (inAdmonition && trimmed.startsWith(">")) {
        admonitionLines.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      closeAdmonition();

      if (trimmed.startsWith(">")) {
        flushTable();
        const plainQuote = trimmed.replace(/^>\s?/, "");
        if (!/^\^[A-Za-z0-9_-]+\s*$/.test(plainQuote.trim())) {
          html += `<p>${inlineFormat(plainQuote)}</p>`;
        }
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        flushTable();
        const level = Math.min(headingMatch[1].length, 4);
        html += `<h${level}>${inlineFormat(normalizeDisplayTitle(headingMatch[2]))}</h${level}>`;
        return;
      }

      const bulletMatch = rawLine.match(/^(\s*)[-*]\s+(.+)$/);
      if (bulletMatch) {
        flushTable();
        const indent = bulletMatch[1].replace(/\t/g, "    ").length;
        const targetDepth = Math.max(1, Math.floor(indent / 2) + 1);
        openListDepth(targetDepth);
        html += `<li>${inlineFormat(bulletMatch[2])}</li>`;
        return;
      }

      closeList();

      if (trimmed.startsWith("|")) {
        tableLines.push(rawLine);
        return;
      }

      flushTable();
      html += `<p>${inlineFormat(trimmed)}</p>`;
    });

    closeList();
    closeAdmonition();
    flushTable();

    return html;
  }

  function renderArticle(docId, options = {}) {
    const doc = docs.find((item) => item.id === docId) || docs[0];
    if (!doc) {
      articleMeta.textContent = "";
      articleView.innerHTML = '<p class="empty-state">暂无可显示内容。</p>';
      setMobileArticleOpen(false, { restoreScroll: false });
      return;
    }

    articleMeta.textContent = doc.sources.length ? `来源：${doc.sources.join(" · ")}` : "";
    articleView.innerHTML = `
      <h1>${doc.title}</h1>
      ${markdownToHtml(buildDisplayContent(doc, state.filters))}
    `;
    attachWikiLinkHandlers(articleView);
    if (isMobileLayout() && options.mobileOpen !== false) {
      setMobileArticleOpen(true, { restoreScroll: false });
      articleView.scrollTop = 0;
    }
  }

  function renderGuidelines() {
    guidelineList.innerHTML = "";
    guides.forEach((guide) => {
      const card = document.createElement("article");
      card.className = "source-card";
      card.innerHTML = `
        <strong>${guide.label}</strong>
        <a class="guide-link" href="${guide.href}" target="_blank" rel="noopener noreferrer">打开原文</a>
      `;
      guidelineList.appendChild(card);
    });
  }

  function buildSummaryItems() {
    const items = [
      ["病因", LABELS.etiology[state.filters.etiology]],
      ["非创伤性分类", state.filters.etiology === "nontraumatic" ? LABELS.subtype[state.filters.subtype] : "不适用"],
      ["损伤节段", state.filters.level === "all" ? "未限定" : state.filters.level],
      ["AIS 分级", LABELS.asia[state.filters.asia]],
      ["病程时长", LABELS.stage[state.filters.stage]],
      ["您的职业", LABELS.profession[state.filters.profession]],
    ];

    caseSummary.innerHTML = items.map(
      ([label, value]) => `
        <div class="summary-item">
          <span class="summary-label">${label}</span>
          <strong class="summary-value">${value}</strong>
        </div>
      `
    ).join("");
  }

  function renderResults() {
    const groups = buildRecommendedGroups(state.filters);
    renderGroupList(groups);
    buildSummaryItems();
    resultSummary.textContent = "";

    const selectedExists = docs.some((doc) => doc.id === state.selectedDocId);
    if (!selectedExists) {
      state.selectedDocId = groups[0]?.docs[0]?.id || null;
    }
    if (state.selectedDocId) {
      renderArticle(state.selectedDocId, { mobileOpen: false });
    }
  }

  function openResultsView() {
    landingView.hidden = true;
    resultsView.hidden = false;
    setMobileArticleOpen(false, { restoreScroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openLandingView() {
    resultsView.hidden = true;
    landingView.hidden = false;
    setMobileArticleOpen(false, { restoreScroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyDefaultFormState() {
    state.filters = {
      etiology: "all",
      subtype: "all",
      level: "all",
      asia: "all",
      stage: "all",
      profession: "all",
    };
    state.selectedDocId = null;
    form.reset();
    updateSubtypeVisibility();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.filters = {
      etiology: String(formData.get("etiology") || "all"),
      subtype: String(formData.get("subtype") || "all"),
      level: String(formData.get("level") || "all"),
      asia: String(formData.get("asia") || "all"),
      stage: String(formData.get("stage") || "all"),
      profession: String(formData.get("profession") || "all"),
    };

    if (state.filters.etiology !== "nontraumatic") {
      state.filters.subtype = "all";
    }

    openResultsView();
    renderResults();
  });

  resetButton.addEventListener("click", () => {
    applyDefaultFormState();
  });

  editCaseButton.addEventListener("click", () => {
    openLandingView();
  });

  if (mobileArticleBackButton) {
    mobileArticleBackButton.addEventListener("click", () => {
      setMobileArticleOpen(false);
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wiki-link");
    if (!button) {
      return;
    }

    const doc = resolveDocTarget(button.getAttribute("data-target") || "");
    if (!doc) {
      return;
    }

    event.preventDefault();
    if (isMobileLayout()) {
      state.mobileReturnScrollTop = window.scrollY;
    }
    state.selectedDocId = doc.id;
    renderArticle(doc.id, { mobileOpen: true });
  });

  etiologySelect.addEventListener("change", updateSubtypeVisibility);

  window.addEventListener("resize", () => {
    if (!isMobileLayout() && state.mobileArticleOpen) {
      setMobileArticleOpen(false, { restoreScroll: false });
    }
  });

  renderGuidelines();
  applyDefaultFormState();
})();
