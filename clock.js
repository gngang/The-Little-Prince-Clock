(() => {
  "use strict";

  /* =========================================================
     Constants
     ========================================================= */
  const MS_MIN = 60 * 1000;
  const MS_HOUR = 60 * MS_MIN;
  const MS_DAY = 24 * MS_HOUR;
  const MS_YEAR = 365.2425 * MS_DAY; // average, accounts for leap years

  const RING_DEFS = [
    { key: "minute", label: "Minute", color: "#E3C77E" },
    { key: "hour",   label: "Hour",   color: "#B4922F" },
    { key: "day",    label: "Day",    color: "#7C93A8" },
    { key: "week",   label: "Week",   color: "#D9A6A0" },
    { key: "month",  label: "Month",  color: "#8B6F56" },
    { key: "year",   label: "Year",   color: "#303B52" },
    { key: "life",   label: "Life",   color: "#A9765C" },
  ];

  const REFLECTIONS = [
    "What are you doing with this hour?",
    "Which small choice is quietly shaping your future?",
    "What would future you thank you for beginning now?",
    "Are you spending time on what you say matters?",
    "What deserves more of your life?",
    "What deserves less?",
    "You do not need to know the whole route to choose the next step.",
    "A five-year plan is a direction, not a cage.",
    "You are allowed to outgrow the plan.",
    "The ordinary days are where the future gets built.",
  ];

  const DAILY_CARDS = [
    { key: "minute", title: "This minute", question: "What deserves your attention?" },
    { key: "hour",   title: "This hour",   question: "What can you move forward?" },
    { key: "day",    title: "Today",       question: "What would make today feel well spent?", today: true },
    { key: "week",   title: "This week",   question: "What matters most?" },
    { key: "month",  title: "This month",  question: "What are you building?" },
    { key: "year",   title: "This year",   question: "Who are you becoming?" },
  ];

  const STORAGE_KEY = "lifeClock.settings.v1";
  const GOALS_KEY = "lifeClock.goals.v1";
  const FOCUS_KEY = "lifeClock.focusMode.v1";

  /* =========================================================
     State
     ========================================================= */
  let settings = { name: "", birthday: "", lifespan: 90, planYear: "" };
  let goals = [];
  let reflectionIndex = 0;
  let editingGoalId = null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     Init
     ========================================================= */
  function init() {
    loadSettings();
    loadGoals();
    applyFocusModeFromStorage();
    bindUI();
    buildRings();
    buildDailyCards();
    renderAll();
    startClock();
    startReflectionRotation();

    if (!settings.birthday) {
      openSettingsPanel();
      setSettingsNote("Add your birthday to complete your Life Clock.");
    }
  }

  /* =========================================================
     Settings: load / persist / URL params
     ========================================================= */
  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      Object.assign(settings, stored);
    } catch (e) { /* ignore malformed storage */ }

    const params = new URLSearchParams(window.location.search);
    if (params.has("birthday")) settings.birthday = params.get("birthday");
    if (params.has("lifespan")) settings.lifespan = clampLifespan(params.get("lifespan"));
    if (params.has("name")) settings.name = params.get("name").slice(0, 40);
    if (params.has("planYear")) settings.planYear = params.get("planYear");

    if (!settings.lifespan) settings.lifespan = 90;

    // populate form
    document.getElementById("inputName").value = settings.name || "";
    document.getElementById("inputBirthday").value = settings.birthday || "";
    document.getElementById("inputLifespan").value = settings.lifespan || 90;
    document.getElementById("inputPlanYear").value = settings.planYear || "";
  }

  function clampLifespan(v) {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) return 90;
    return Math.min(n, 130);
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function loadGoals() {
    try {
      goals = JSON.parse(localStorage.getItem(GOALS_KEY) || "[]");
      if (!Array.isArray(goals)) goals = [];
    } catch (e) { goals = []; }
  }

  function saveGoals() {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }

  /* =========================================================
     UI bindings
     ========================================================= */
  function bindUI() {
    const settingsBtn = document.getElementById("settingsBtn");
    const panel = document.getElementById("settingsPanel");
    settingsBtn.addEventListener("click", () => {
      const isOpen = !panel.hidden;
      panel.hidden = isOpen;
      settingsBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    document.getElementById("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      settings.name = document.getElementById("inputName").value.trim().slice(0, 40);
      settings.birthday = document.getElementById("inputBirthday").value;
      settings.lifespan = clampLifespan(document.getElementById("inputLifespan").value);
      settings.planYear = document.getElementById("inputPlanYear").value;
      saveSettings();
      renderAll();
      setSettingsNote("Saved.");
      setTimeout(() => setSettingsNote(""), 2200);
    });

    document.getElementById("copyLinkBtn").addEventListener("click", async () => {
      const url = buildShareableUrl();
      try {
        await navigator.clipboard.writeText(url);
        setSettingsNote("Link copied.");
      } catch (e) {
        setSettingsNote(url);
      }
      setTimeout(() => setSettingsNote(""), 3000);
    });

    const focusToggle = document.getElementById("focusModeToggle");
    focusToggle.checked = document.body.classList.contains("focus-mode");
    focusToggle.addEventListener("change", () => {
      document.body.classList.toggle("focus-mode", focusToggle.checked);
      localStorage.setItem(FOCUS_KEY, focusToggle.checked ? "1" : "0");
    });

    document.getElementById("addStarBtn").addEventListener("click", () => openGoalDialog(null));
    document.getElementById("cancelGoalBtn").addEventListener("click", () => closeGoalDialog());
    document.getElementById("deleteGoalBtn").addEventListener("click", () => {
      if (editingGoalId) {
        goals = goals.filter(g => g.id !== editingGoalId);
        saveGoals();
        renderConstellation();
      }
      closeGoalDialog();
    });
    document.getElementById("goalForm").addEventListener("submit", (e) => {
      e.preventDefault();
      saveGoalFromForm();
      closeGoalDialog();
    });
  }

  function openSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    panel.hidden = false;
    document.getElementById("settingsBtn").setAttribute("aria-expanded", "true");
  }

  function setSettingsNote(text) {
    document.getElementById("settingsNote").textContent = text;
  }

  function applyFocusModeFromStorage() {
    const on = localStorage.getItem(FOCUS_KEY) === "1";
    document.body.classList.toggle("focus-mode", on);
  }

  function buildShareableUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    if (settings.birthday) url.searchParams.set("birthday", settings.birthday);
    if (settings.lifespan) url.searchParams.set("lifespan", settings.lifespan);
    if (settings.name) url.searchParams.set("name", settings.name);
    if (settings.planYear) url.searchParams.set("planYear", settings.planYear);
    return url.toString();
  }

  /* =========================================================
     Time progress calculations
     ========================================================= */
  function getProgress(now) {
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const minuteFrac = seconds / 60;
    const hourFrac = (minutes * 60 + seconds) / 3600;
    const dayFrac = (hours * 3600 + minutes * 60 + seconds) / 86400;

    // ISO-ish week: Monday = 0
    const jsDay = now.getDay(); // 0 = Sunday
    const isoDay = (jsDay + 6) % 7; // Monday = 0
    const weekFrac = (isoDay + dayFrac) / 7;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthFrac = (now.getDate() - 1 + dayFrac) / daysInMonth;

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const daysInYear = isLeapYear(now.getFullYear()) ? 366 : 365;
    const dayOfYear = Math.floor((now - startOfYear) / MS_DAY);
    const yearFrac = (dayOfYear + dayFrac) / daysInYear;

    let lifeFrac = null;
    if (settings.birthday) {
      const birth = parseBirthday(settings.birthday);
      if (birth) {
        const lifespanMs = settings.lifespan * MS_YEAR;
        lifeFrac = clamp((now - birth) / lifespanMs, 0, 1);
      }
    }

    return {
      minute: minuteFrac, hour: hourFrac, day: dayFrac, week: weekFrac,
      month: monthFrac, year: yearFrac, life: lifeFrac,
      raw: { minutes, hours, isoDay, daysInMonth, dayOfMonth: now.getDate(), daysInYear, dayOfYear }
    };
  }

  function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function parseBirthday(str) {
    // Expect YYYY-MM-DD from <input type=date>
    const parts = str.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  /* =========================================================
     Ring rendering (SVG)
     ========================================================= */
  const RING_RADII = (() => {
    const start = 64, end = 304, n = RING_DEFS.length;
    const step = (end - start) / (n - 1);
    return RING_DEFS.map((_, i) => start + step * i);
  })();

  function buildRings() {
    const group = document.getElementById("ringsGroup");
    group.innerHTML = "";
    group.setAttribute("transform", "rotate(-90 320 320)");

    RING_DEFS.forEach((ring, i) => {
      const r = RING_RADII[i];
      const circumference = 2 * Math.PI * r;

      const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      track.setAttribute("cx", 320); track.setAttribute("cy", 320); track.setAttribute("r", r);
      track.setAttribute("class", "ring-track");
      track.setAttribute("stroke-width", 6);
      group.appendChild(track);

      const progress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      progress.setAttribute("cx", 320); progress.setAttribute("cy", 320); progress.setAttribute("r", r);
      progress.setAttribute("class", "ring-progress");
      progress.setAttribute("stroke-width", 6);
      progress.setAttribute("stroke", ring.color);
      progress.setAttribute("stroke-dasharray", circumference.toFixed(2));
      progress.setAttribute("stroke-dashoffset", circumference.toFixed(2));
      progress.setAttribute("data-ring", ring.key);
      progress.setAttribute("id", `ring-${ring.key}`);
      group.appendChild(progress);
    });

    // legend
    const legend = document.getElementById("orbitLegend");
    legend.innerHTML = RING_DEFS.map(r =>
      `<li><span class="dot" style="background:${r.color}"></span>${r.label}: <strong id="legend-${r.key}">—</strong></li>`
    ).join("");
  }

  function updateRings(progress) {
    RING_DEFS.forEach((ring, i) => {
      const r = RING_RADII[i];
      const circumference = 2 * Math.PI * r;
      const el = document.getElementById(`ring-${ring.key}`);
      const frac = progress[ring.key];
      if (frac === null || frac === undefined) {
        el.setAttribute("stroke-dashoffset", circumference.toFixed(2));
        el.setAttribute("opacity", "0.25");
      } else {
        el.setAttribute("opacity", "1");
        el.setAttribute("stroke-dashoffset", (circumference * (1 - clamp(frac, 0, 1))).toFixed(2));
      }
    });
  }

  function setLegend(key, text) {
    const el = document.getElementById(`legend-${key}`);
    if (el) el.textContent = text;
  }

  /* =========================================================
     Main render loop
     ========================================================= */
  function startClock() {
    tick();
    setInterval(tick, 1000);
  }

  function tick() {
    const now = new Date();
    const progress = getProgress(now);
    updateRings(progress);
    updateCenterClock(now);
    updateLegendText(now, progress);
    updateStats(now, progress);
    updateDailyCards(progress);
  }

  function updateCenterClock(now) {
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    document.getElementById("nowClockText").textContent = `${h}:${m}`;
  }

  function updateLegendText(now, progress) {
    const secLeftInMin = 60 - now.getSeconds();
    setLegend("minute", `${now.getSeconds()}s / 60s`);
    setLegend("hour", `${now.getMinutes()}m / 60m`);
    setLegend("day", `${now.getHours()}h / 24h`);
    setLegend("week", `${progress.raw.isoDay + 1} / 7 days`);
    setLegend("month", `${progress.raw.dayOfMonth} / ${progress.raw.daysInMonth} days`);
    setLegend("year", `${progress.raw.dayOfYear + 1} / ${progress.raw.daysInYear} days`);
    if (progress.life !== null) {
      setLegend("life", `${(progress.life * 100).toFixed(1)}%`);
    } else {
      setLegend("life", "add birthday");
    }
  }

  /* =========================================================
     Stats section
     ========================================================= */
  function updateStats(now, progress) {
    const greeting = document.getElementById("greeting");
    greeting.textContent = settings.name ? `${settings.name}'s Life Clock` : "Your Life Clock";

    const yearOfLifeText = document.getElementById("yearOfLifeText");
    const lifespanPctText = document.getElementById("lifespanPctText");
    const chaptersText = document.getElementById("chaptersText");

    if (!settings.birthday) {
      yearOfLifeText.textContent = "Add your birthday to see your year of life";
      lifespanPctText.textContent = `— % of an assumed ${settings.lifespan}-year life`;
      chaptersText.textContent = "You may have roughly — chapters left.";
      ["remYears", "remMonths", "remWeeks", "remDays"].forEach(id => document.getElementById(id).textContent = "—");
      renderFiveYear(null, now);
      return;
    }

    const birth = parseBirthday(settings.birthday);
    const ageYears = (now - birth) / MS_YEAR;
    const yearOfLife = Math.floor(ageYears) + 1;
    const lifespanPct = clamp((ageYears / settings.lifespan) * 100, 0, 100);

    yearOfLifeText.textContent = `Year ${yearOfLife} of your life`;
    lifespanPctText.textContent = `${lifespanPct.toFixed(1)}% of an assumed ${settings.lifespan}-year life`;

    const remainingYears = Math.max(settings.lifespan - ageYears, 0);
    const remainingMonths = remainingYears * 12;
    const remainingWeeks = remainingYears * 52.1775;
    const remainingDays = remainingYears * 365.2425;

    chaptersText.textContent = `If life were a ${settings.lifespan}-year story, you may have roughly ${Math.round(remainingYears)} chapters left.`;
    document.getElementById("remYears").textContent = Math.round(remainingYears);
    document.getElementById("remMonths").textContent = Math.round(remainingMonths);
    document.getElementById("remWeeks").textContent = Math.round(remainingWeeks);
    document.getElementById("remDays").textContent = Math.round(remainingDays);

    renderFiveYear({ birth, ageYears }, now);
  }

  function renderFiveYear(data, now) {
    const pct = 5 / settings.lifespan * 100;
    document.getElementById("fiveYearPct").textContent = `${pct.toFixed(1)}%`;
    document.getElementById("fiveYearLead").textContent =
      `Your five-year plan is only ${pct.toFixed(1)}% of a ${settings.lifespan}-year life.`;

    const circumference = 2 * Math.PI * 50;
    const ring = document.getElementById("fiveYearRing");
    const offset = circumference * (1 - clamp(pct / 100, 0, 1));
    ring.setAttribute("stroke-dasharray", circumference.toFixed(2));
    ring.setAttribute("stroke-dashoffset", offset.toFixed(2));

    if (!data) {
      document.getElementById("fyAge").textContent = "—";
      document.getElementById("fyYear").textContent = String(now.getFullYear() + 5);
      document.getElementById("fyBirthdays").textContent = "—";
      return;
    }

    const { birth, ageYears } = data;
    const targetDate = new Date(now);
    targetDate.setFullYear(targetDate.getFullYear() + 5);

    document.getElementById("fyAge").textContent = Math.floor(ageYears + 5);
    document.getElementById("fyYear").textContent = String(targetDate.getFullYear());

    let birthdayCount = 0;
    for (let y = now.getFullYear() + 1; y <= now.getFullYear() + 5; y++) {
      const bday = new Date(y, birth.getMonth(), birth.getDate());
      if (bday <= targetDate) birthdayCount++;
    }
    document.getElementById("fyBirthdays").textContent = birthdayCount;
  }

  /* =========================================================
     Daily perspective cards
     ========================================================= */
  function buildDailyCards() {
    const grid = document.getElementById("dailyGrid");
    grid.innerHTML = DAILY_CARDS.map(c => {
      const color = RING_DEFS.find(r => r.key === c.key).color;
      return `
      <div class="daily-card${c.today ? " daily-card--today" : ""}" style="--card-accent:${color}">
        <p class="daily-card__label">${c.title}</p>
        <p class="daily-card__question">${c.question}</p>
        <div class="daily-card__bar"><span id="bar-${c.key}" style="width:0%"></span></div>
        <p class="daily-card__meta" id="meta-${c.key}">—</p>
      </div>`;
    }).join("");
  }

  function updateDailyCards(progress) {
    DAILY_CARDS.forEach(c => {
      const bar = document.getElementById(`bar-${c.key}`);
      const frac = progress[c.key];
      bar.style.width = `${clamp(frac, 0, 1) * 100}%`;
    });
    document.getElementById("meta-minute").textContent = `${Math.floor(progress.minute * 60)} of 60 seconds gone`;
    document.getElementById("meta-hour").textContent = `${Math.floor(progress.hour * 60)} of 60 minutes gone`;
    document.getElementById("meta-day").textContent = `${progress.raw.hours}:${String(new Date().getMinutes()).padStart(2, "0")} — ${Math.round(progress.day * 100)}% of today gone`;
    document.getElementById("meta-week").textContent = `Day ${progress.raw.isoDay + 1} of 7`;
    document.getElementById("meta-month").textContent = `Day ${progress.raw.dayOfMonth} of ${progress.raw.daysInMonth}`;
    document.getElementById("meta-year").textContent = `Day ${progress.raw.dayOfYear + 1} of ${progress.raw.daysInYear}`;
  }

  /* =========================================================
     Reflection prompts
     ========================================================= */
  function startReflectionRotation() {
    const el = document.getElementById("reflectionText");
    el.textContent = REFLECTIONS[0];
    if (prefersReducedMotion) {
      setInterval(() => {
        reflectionIndex = (reflectionIndex + 1) % REFLECTIONS.length;
        el.textContent = REFLECTIONS[reflectionIndex];
      }, 16000);
      return;
    }
    setInterval(() => {
      el.classList.add("fade");
      setTimeout(() => {
        reflectionIndex = (reflectionIndex + 1) % REFLECTIONS.length;
        el.textContent = REFLECTIONS[reflectionIndex];
        el.classList.remove("fade");
      }, 500);
    }, 15000);
  }

  /* =========================================================
     Constellation / goals
     ========================================================= */
  function renderConstellation() {
    const map = document.getElementById("constellationMap");
    const addBtn = document.getElementById("addStarBtn");

    if (goals.length === 0) {
      map.innerHTML = `<div class="empty-state">No stars placed yet. Add the first thing you're steering toward.</div>`;
    } else {
      map.innerHTML = goals.map(g => `
        <button type="button" class="star-card" data-id="${g.id}">
          <svg class="star-card__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" fill="var(--gold)"/>
          </svg>
          <p class="star-card__name">${escapeHtml(g.name)}</p>
          <p class="star-card__step"><strong>Next:</strong> ${escapeHtml(g.tinyStep || "—")}</p>
        </button>
      `).join("");

      map.querySelectorAll(".star-card").forEach(card => {
        card.addEventListener("click", () => openGoalDialog(card.getAttribute("data-id")));
      });
    }

    addBtn.disabled = goals.length >= 5;
    addBtn.textContent = goals.length >= 5 ? "Your constellation is full (5 stars)" : "+ Place a star";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function openGoalDialog(id) {
    editingGoalId = id;
    const dialog = document.getElementById("goalDialog");
    const deleteBtn = document.getElementById("deleteGoalBtn");
    const title = document.getElementById("goalDialogTitle");

    if (id) {
      const g = goals.find(g => g.id === id);
      title.textContent = "Edit your star";
      document.getElementById("goalName").value = g.name || "";
      document.getElementById("goalFiveYear").value = g.fiveYear || "";
      document.getElementById("goalYear").value = g.thisYear || "";
      document.getElementById("goalMonth").value = g.thisMonth || "";
      document.getElementById("goalTiny").value = g.tinyStep || "";
      deleteBtn.hidden = false;
    } else {
      if (goals.length >= 5) return;
      title.textContent = "Place a star";
      document.getElementById("goalForm").reset();
      deleteBtn.hidden = true;
    }
    dialog.showModal();
  }

  function closeGoalDialog() {
    document.getElementById("goalDialog").close();
    editingGoalId = null;
  }

  function saveGoalFromForm() {
    const data = {
      name: document.getElementById("goalName").value.trim(),
      fiveYear: document.getElementById("goalFiveYear").value.trim(),
      thisYear: document.getElementById("goalYear").value.trim(),
      thisMonth: document.getElementById("goalMonth").value.trim(),
      tinyStep: document.getElementById("goalTiny").value.trim(),
    };
    if (!data.name) return;

    if (editingGoalId) {
      const g = goals.find(g => g.id === editingGoalId);
      Object.assign(g, data);
    } else {
      if (goals.length >= 5) return;
      goals.push({ id: `star-${Date.now()}`, ...data });
    }
    saveGoals();
    renderConstellation();
  }

  /* =========================================================
     Full render (on settings change)
     ========================================================= */
  function renderAll() {
    renderConstellation();
    tick();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
