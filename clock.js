(() => {
  "use strict";

  const LIFESPAN = 90; // matches "90-year life" in the copy
  const MS_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "lifePieces.birthday.v1";

  const ringEl = document.getElementById("fiveYearRing");
  const pctEl = document.getElementById("fiveYearPct");
  const leadEl = document.getElementById("fiveYearLead");
  const ageEl = document.getElementById("fyAge");
  const yearEl = document.getElementById("fyYear");
  const bdaysEl = document.getElementById("fyBirthdays");
  const birthdayInput = document.getElementById("birthdayInput");

  const CIRCUMFERENCE = 2 * Math.PI * 50;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function parseBirthday(str) {
    const parts = str.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function render() {
    const now = new Date();
    const pct = (5 / LIFESPAN) * 100;

    pctEl.textContent = `${pct.toFixed(1)}%`;
    leadEl.textContent = `Your five-year plan is only ${pct.toFixed(1)}% of a ${LIFESPAN}-year life.`;

    const offset = CIRCUMFERENCE * (1 - clamp(pct / 100, 0, 1));
    ringEl.setAttribute("stroke-dasharray", CIRCUMFERENCE.toFixed(2));
    ringEl.setAttribute("stroke-dashoffset", offset.toFixed(2));

    const targetDate = new Date(now);
    targetDate.setFullYear(targetDate.getFullYear() + 5);
    yearEl.textContent = String(targetDate.getFullYear());

    const birthdayStr = birthdayInput.value;
    const birth = birthdayStr ? parseBirthday(birthdayStr) : null;

    if (!birth) {
      ageEl.textContent = "—";
      bdaysEl.textContent = "—";
      return;
    }

    const ageYears = (now - birth) / MS_YEAR;
    ageEl.textContent = Math.floor(ageYears + 5);

    let count = 0;
    for (let y = now.getFullYear() + 1; y <= now.getFullYear() + 5; y++) {
      const bday = new Date(y, birth.getMonth(), birth.getDate());
      if (bday <= targetDate) count++;
    }
    bdaysEl.textContent = count;
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) birthdayInput.value = saved;

    birthdayInput.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEY, birthdayInput.value);
      render();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

  document.addEventListener("DOMContentLoaded", init);
})();
