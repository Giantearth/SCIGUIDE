(function () {
  const docs = (window.__SCI_DATA__ || []).slice();
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
  const articleView = document.getElementById("article-view");
  const articleMeta = document.getElementById("article-meta");
  const resultSummary = document.getElementById("result-summary");
  const guidelineList = document.getElementById("guideline-list");
  const caseSummary = document.getElementById("case-summary");

  const state = {
    selectedDocId: null,
    filters: {
      patientId: "",
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
    level: {
      all: "未限定",
      cervical: "颈段 C1-C7",
      thoracic: "胸段 T1-T12",
      lumbosacral: "腰骶段 L1-S5",
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
      rehab: "14 天以上",
    },
    profession: {
      all: "未限定",
      PT: "PT",
      OT: "OT",
      ST: "ST",
      RESP: "呼吸康复",
    },
  };

  function updateSubtypeVisibility() {
    const show = etiologySelect.value === "nontraumatic";
    subtypeField.hidden = !show;
    subtypeField.style.display = show ? "block" : "none";
    if (!show) {
      subtypeSelect.value = "all";
    }
  }

  function scoreDoc(doc, filters) {
    let score = 0;

    if (doc.module === "redflags") {
      score += 100;
    }

    if (filters.etiology !== "all" && (doc.etiologies || []).includes(filters.etiology)) {
      score += 18;
    }

    if (filters.subtype !== "all" && (doc.subtypes || []).includes(filters.subtype)) {
      score += 18;
    }

    if (filters.level !== "all" && (doc.levels || []).includes(filters.level)) {
      score += 14;
    }

    if (filters.stage !== "all" && (doc.stages || []).includes(filters.stage)) {
      score += 14;
    }

    if (filters.profession !== "all" && (doc.professions || []).includes(filters.profession)) {
      score += 18;
    }

    if (filters.asia !== "all" && (doc.ais || []).includes(filters.asia)) {
      score += 10;
    }

    if (doc.displayGroup === "stage" && filters.stage !== "all") {
      score += 12;
    }

    if (doc.displayGroup === "expectation" && filters.level !== "all") {
      score += 12;
    }

    return score;
  }

  function buildRecommendedGroups(filters) {
    const groups = [
      { key: "redflags", title: "红旗征", summary: "优先显示，默认展开", priority: "critical" },
      { key: "stage", title: "康复管理", summary: "根据病程阶段查看", priority: "normal" },
      { key: "goals", title: "康复目标", summary: "根据职业与功能目标查看", priority: "normal" },
      { key: "focus", title: "康复重点", summary: "多学科重点与核心技术", priority: "normal" },
      { key: "expectation", title: "康复预期", summary: "按节段与 AIS 查看潜力", priority: "normal" },
      { key: "complication", title: "并发症与专项管理", summary: "疼痛、痉挛、DVT、低血压等", priority: "normal" },
      { key: "function", title: "功能训练与居家指导", summary: "转移、步行、居家训练", priority: "normal" },
      { key: "other", title: "其他相关内容", summary: "暂未进一步细分的内容", priority: "normal" },
    ];

    const scored = docs
      .map((doc) => ({ doc, score: scoreDoc(doc, filters) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, "zh-CN"));

    const used = new Set();

    function take(predicate) {
      const selected = scored
        .filter(({ doc }) => !used.has(doc.id) && predicate(doc))
        .map(({ doc }) => {
          used.add(doc.id);
          return doc;
        });
      return selected;
    }

    function anyMatch(selected, values) {
      if (selected === "all") {
        return true;
      }
      if (!values || !values.length) {
        return false;
      }
      return values.includes(selected);
    }

    const mapped = groups.map((group) => {
      let groupDocs = [];

      if (group.key === "redflags") {
        groupDocs = take((doc) =>
          doc.displayGroup === "redflags" ||
          (doc.displayGroup === "complication" && (
            anyMatch(filters.level, doc.levels) ||
            anyMatch(filters.etiology, doc.etiologies) ||
            anyMatch(filters.subtype, doc.subtypes) ||
            anyMatch(filters.profession, doc.professions) ||
            anyMatch(filters.stage, doc.stages)
          ))
        );
      } else if (group.key === "stage") {
        groupDocs = take((doc) =>
          doc.displayGroup === "stage" &&
          (
            filters.stage === "all" ||
            doc.title.includes("病程分期") ||
            (doc.stages || []).includes(filters.stage)
          )
        );
      } else if (group.key === "goals") {
        groupDocs = take((doc) =>
          doc.displayGroup === "goals" &&
          (
            filters.profession === "all" ||
            (doc.professions || []).includes(filters.profession)
          )
        );
      } else if (group.key === "focus") {
        groupDocs = take((doc) =>
          doc.displayGroup === "focus" &&
          filters.profession === "all"
        );
      } else if (group.key === "expectation") {
        groupDocs = take((doc) =>
          doc.displayGroup === "expectation" &&
          (
            filters.level === "all" ||
            doc.title.includes("ASIA") ||
            (doc.levels || []).includes(filters.level)
          )
        );
      } else if (group.key === "complication") {
        groupDocs = take((doc) =>
          doc.displayGroup === "complication" &&
          (
            filters.etiology === "all" || (doc.etiologies || []).length === 0 || (doc.etiologies || []).includes(filters.etiology)
          ) &&
          (
            filters.subtype === "all" || (doc.subtypes || []).length === 0 || (doc.subtypes || []).includes(filters.subtype)
          ) &&
          (
            filters.level === "all" || (doc.levels || []).length === 0 || (doc.levels || []).includes(filters.level)
          ) &&
          (
            filters.profession === "all" || (doc.professions || []).length === 0 || (doc.professions || []).includes(filters.profession)
          )
        );
      } else if (group.key === "function") {
        groupDocs = take((doc) =>
          doc.displayGroup === "function" &&
          (
            filters.level === "all" || (doc.levels || []).length === 0 || (doc.levels || []).includes(filters.level)
          ) &&
          (
            filters.profession === "all" || (doc.professions || []).length === 0 || (doc.professions || []).includes(filters.profession)
          )
        );
      } else if (group.key === "other") {
        groupDocs = take((doc) => true);
      }

      return {
        ...group,
        docs: groupDocs,
      };
    });

    return mapped.filter((group) => group.docs.length);
  }

  function renderGroupList(groups) {
    resultGroups.innerHTML = "";

    if (!groups.length) {
      resultGroups.innerHTML = '<p class="empty-state">当前条件下还没有匹配到内容，建议先放宽筛选。</p>';
      return;
    }

    groups.forEach((group, index) => {
      const card = document.createElement("section");
      card.className = "group-card";
      card.dataset.priority = group.priority;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "group-header";
      header.innerHTML = `
        <span>
          <strong>${group.title}</strong>
          <small>${group.summary}</small>
        </span>
        <span>展开</span>
      `;

      const body = document.createElement("div");
      body.className = "group-body";
      body.hidden = !(group.priority === "critical" || index === 0);

      header.addEventListener("click", () => {
        body.hidden = !body.hidden;
      });

      group.docs.forEach((doc, docIndex) => {
        const docCard = document.createElement("article");
        docCard.className = "doc-card";

        const docHeader = document.createElement("button");
        docHeader.type = "button";
        docHeader.className = "doc-button";
        if (doc.id === state.selectedDocId) {
          docHeader.classList.add("active");
        }
        docHeader.innerHTML = `
          <span class="doc-title">${doc.title}</span>
          <span class="doc-meta">${(doc.sources || []).length ? `来源：${doc.sources.join(" · ")}` : "来源信息待补充"}</span>
        `;

        const docBody = document.createElement("div");
        docBody.className = "doc-body";
        docBody.hidden = !(group.priority === "critical" || docIndex === 0);
        docBody.innerHTML = markdownToHtml(doc.content);
        attachWikiLinkHandlers(docBody);

        docHeader.addEventListener("click", () => {
          state.selectedDocId = doc.id;
          renderArticle(doc.id);
          docBody.hidden = !docBody.hidden;
          renderResults();
        });

        docCard.appendChild(docHeader);
        docCard.appendChild(docBody);
        body.appendChild(docCard);
      });

      card.appendChild(header);
      card.appendChild(body);
      resultGroups.appendChild(card);
    });
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function inlineFormat(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
        const label = alias || target;
        return `<button type="button" class="wiki-link" data-target="${escapeHtml(target)}">${escapeHtml(label)}</button>`;
      });
  }

  function renderAdmonitionBody(lines) {
    return lines
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) {
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

  function resolveDocTarget(target) {
    return docs.find((doc) => doc.id === target)
      || docs.find((doc) => doc.title.includes(target))
      || null;
  }

  function attachWikiLinkHandlers(scope) {
    scope.querySelectorAll(".wiki-link").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-target") || "";
        const doc = resolveDocTarget(target);
        if (!doc) {
          return;
        }
        state.selectedDocId = doc.id;
        renderArticle(doc.id);
      });
    });
  }

  function markdownToHtml(markdown) {
    const lines = markdown
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) => !line.startsWith("Title:") && !line.startsWith("Type:") && !line.startsWith("Sources:") && !line.startsWith("Parent:") && line !== "---");

    let html = "";
    let inList = false;
    let inCode = false;
    let inAdmonition = false;
    let admonitionType = "note";
    let admonitionLines = [];
    let tableLines = [];

    function closeList() {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    }

    function closeAdmonition() {
      if (inAdmonition) {
        const listWrapped = renderAdmonitionBody(admonitionLines);
        html += `<section class="admonition admonition-${admonitionType}">${listWrapped.includes("<li>") ? `<ul>${listWrapped}</ul>` : listWrapped}</section>`;
        inAdmonition = false;
        admonitionLines = [];
      }
    }

    function flushTable() {
      if (!tableLines.length) {
        return;
      }

      const rows = tableLines.map((entry) =>
        entry
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim())
      );

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

      if (!line) {
        closeList();
        closeAdmonition();
        flushTable();
        return;
      }

      const admonitionOpen = line.match(/^>\s*\[!([A-Z]+)\]\s*(.*)$/);
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

      if (inAdmonition && line.startsWith(">")) {
        admonitionLines.push(line.replace(/^>\s?/, ""));
        return;
      }

      closeAdmonition();

      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        flushTable();
        const level = Math.min(headingMatch[1].length, 4);
        html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`;
        return;
      }

      if (/^[-*]\s+/.test(line)) {
        flushTable();
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`;
        return;
      }

      closeList();

      if (line.startsWith("|")) {
        tableLines.push(rawLine);
        return;
      }

      flushTable();
      html += `<p>${inlineFormat(line)}</p>`;
    });

    closeList();
    closeAdmonition();
    flushTable();

    return html;
  }

  function renderArticle(docId) {
    const doc = docs.find((item) => item.id === docId) || docs[0];
    if (!doc) {
      articleView.innerHTML = '<p class="empty-state">暂无可展示内容。</p>';
      return;
    }

    articleMeta.textContent = (doc.sources || []).length
      ? `来源：${doc.sources.join(" · ")}`
      : "来源信息待补充";
    articleView.innerHTML = `
      <h1>${doc.title}</h1>
      ${markdownToHtml(doc.content)}
    `;
    attachWikiLinkHandlers(articleView);
  }

  function renderGuidelines() {
    guidelineList.innerHTML = "";
    guides.forEach((guide) => {
      const card = document.createElement("article");
      card.className = "source-card";
      card.innerHTML = `
        <strong>${guide.label}</strong>
        <small>${guide.name}</small>
        <a class="guide-link" href="${guide.href}" target="_blank" rel="noopener noreferrer">打开原文</a>
      `;
      guidelineList.appendChild(card);
    });
  }

  function buildSummaryItems() {
    const items = [
      ["患者编号", state.filters.patientId || "未填写"],
      ["病因", LABELS.etiology[state.filters.etiology]],
      ["非创伤性分类", state.filters.etiology === "nontraumatic" ? LABELS.subtype[state.filters.subtype] : "不适用"],
      ["损伤节段", LABELS.level[state.filters.level]],
      ["ASIA 分级", LABELS.asia[state.filters.asia]],
      ["病程时长", LABELS.stage[state.filters.stage]],
      ["您的职业", LABELS.profession[state.filters.profession]],
    ];

    caseSummary.innerHTML = items
      .map(
        ([label, value]) => `
          <div class="summary-item">
            <span class="summary-label">${label}</span>
            <strong class="summary-value">${value}</strong>
          </div>
        `
      )
      .join("");
  }

  function renderResults() {
    const groups = buildRecommendedGroups(state.filters);
    resultSummary.textContent = "根据当前患者信息，根据指南生成以下建议。";
    renderGroupList(groups);
    buildSummaryItems();

    if (!state.selectedDocId) {
      const firstDoc = groups[0]?.docs[0];
      if (firstDoc) {
        state.selectedDocId = firstDoc.id;
      }
    }

    renderArticle(state.selectedDocId);
  }

  function showResultsView() {
    landingView.hidden = true;
    resultsView.hidden = false;
    renderResults();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLandingView() {
    resultsView.hidden = true;
    landingView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    state.filters = {
      patientId: String(formData.get("patientId") || "").trim(),
      etiology: String(formData.get("etiology")),
      subtype: String(formData.get("subtype")),
      level: String(formData.get("level")),
      asia: String(formData.get("asia")),
      stage: String(formData.get("stage")),
      profession: String(formData.get("profession")),
    };

    if (state.filters.etiology !== "nontraumatic") {
      state.filters.subtype = "all";
    }

    state.selectedDocId = null;
    showResultsView();
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    updateSubtypeVisibility();
  });

  editCaseButton.addEventListener("click", () => {
    showLandingView();
  });

  etiologySelect.addEventListener("change", updateSubtypeVisibility);

  updateSubtypeVisibility();
  renderGuidelines();
})();
