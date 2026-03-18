const FRAME_COUNT = 10;

const frameEls = [];
const gameState = Array.from({ length: FRAME_COUNT }, () => ({
  roll1: null,
  roll2: null,
  roll3: null,
}));

const framesContainer = document.getElementById("framesContainer");
const frameTemplate = document.getElementById("frameTemplate");
const grandTotalEl = document.getElementById("grandTotal");
const resetBtn = document.getElementById("resetBtn");
const installBtn = document.getElementById("installBtn");

let deferredInstallPrompt = null;

init();

function init() {
  renderFrames();
  updateUI();
  resetBtn.addEventListener("click", resetGame);
  setupInstallFlow();
}

function renderFrames() {
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const fragment = frameTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".frame-card");

    const title = card.querySelector(".frame-title");
    title.textContent = `Frame ${i + 1}`;

    const select1 = card.querySelector('select[data-roll="1"]');
    const select2 = card.querySelector('select[data-roll="2"]');
    const select3 = card.querySelector('select[data-roll="3"]');
    const roll3Wrap = card.querySelector(".roll-3-wrap");
    const status = card.querySelector(".frame-status");
    const frameScore = card.querySelector(".frame-score");
    const cumulative = card.querySelector(".frame-cumulative");

    select1.addEventListener("change", (event) => {
      gameState[i].roll1 = parseSelectValue(event.target.value);
      gameState[i].roll2 = null;
      if (i === FRAME_COUNT - 1) {
        gameState[i].roll3 = null;
      }
      updateUI();
    });

    select2.addEventListener("change", (event) => {
      gameState[i].roll2 = parseSelectValue(event.target.value);
      if (i === FRAME_COUNT - 1) {
        gameState[i].roll3 = null;
      }
      updateUI();
    });

    select3.addEventListener("change", (event) => {
      gameState[i].roll3 = parseSelectValue(event.target.value);
      updateUI();
    });

    frameEls.push({
      card,
      status,
      frameScore,
      cumulative,
      select1,
      select2,
      select3,
      roll3Wrap,
      index: i,
    });

    framesContainer.appendChild(fragment);
  }
}

function updateUI() {
  frameEls.forEach((frameEl) => {
    const { index } = frameEl;
    populateFrameOptions(index, frameEl);
    syncSelectValues(index, frameEl);
  });

  const breakdown = calculateBreakdown(gameState);

  frameEls.forEach((frameEl) => {
    const frameResult = breakdown.frames[frameEl.index];
    frameEl.status.textContent = frameResult.complete ? "Complete" : "Pending";
    frameEl.status.classList.toggle("complete", frameResult.complete);
    frameEl.frameScore.textContent =
      frameResult.score === null ? "-" : String(frameResult.score);
    frameEl.cumulative.textContent =
      frameResult.cumulative === null ? "-" : String(frameResult.cumulative);

    if (frameEl.index === FRAME_COUNT - 1) {
      frameEl.roll3Wrap.classList.toggle("hidden", !frameResult.allowThirdRoll);
      frameEl.select3.disabled = !frameResult.allowThirdRoll;
      if (!frameResult.allowThirdRoll) {
        frameEl.select3.value = "";
      }
    }
  });

  grandTotalEl.textContent = String(breakdown.total);
}

function populateFrameOptions(index, frameEl) {
  const state = gameState[index];
  const isTenth = index === FRAME_COUNT - 1;

  if (!isTenth) {
    setSelectOptions(frameEl.select1, range(0, 10));
    if (state.roll1 === null) {
      setSelectOptions(frameEl.select2, []);
      frameEl.select2.disabled = true;
      return;
    }

    const secondMax = Math.max(0, 10 - state.roll1);
    setSelectOptions(frameEl.select2, range(0, secondMax));
    frameEl.select2.disabled = state.roll1 === 10;
    if (state.roll1 === 10) {
      gameState[index].roll2 = null;
    }
    return;
  }

  setSelectOptions(frameEl.select1, range(0, 10));

  if (state.roll1 === null) {
    frameEl.select2.disabled = true;
    frameEl.select3.disabled = true;
    setSelectOptions(frameEl.select2, []);
    setSelectOptions(frameEl.select3, []);
    return;
  }

  const secondMax = state.roll1 === 10 ? 10 : 10 - state.roll1;
  setSelectOptions(frameEl.select2, range(0, secondMax));
  frameEl.select2.disabled = false;

  const canUseThird =
    state.roll1 === 10 ||
    (state.roll1 !== null && state.roll2 !== null && state.roll1 + state.roll2 === 10);

  if (!canUseThird) {
    setSelectOptions(frameEl.select3, []);
    frameEl.select3.disabled = true;
    return;
  }

  let thirdMax = 10;
  if (state.roll1 === 10 && state.roll2 !== null && state.roll2 < 10) {
    thirdMax = 10 - state.roll2;
  }

  setSelectOptions(frameEl.select3, range(0, thirdMax));
  frameEl.select3.disabled = state.roll2 === null;
}

function setSelectOptions(selectEl, allowedValues) {
  const currentValue = selectEl.value;

  selectEl.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "-";
  selectEl.appendChild(blank);

  allowedValues.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    selectEl.appendChild(option);
  });

  const hasCurrent = allowedValues.some((v) => String(v) === currentValue);
  if (hasCurrent) {
    selectEl.value = currentValue;
  } else {
    selectEl.value = "";
  }
}

function syncSelectValues(index, frameEl) {
  const state = gameState[index];
  frameEl.select1.value = valueOrBlank(state.roll1);
  frameEl.select2.value = valueOrBlank(state.roll2);
  frameEl.select3.value = valueOrBlank(state.roll3);
}

function calculateBreakdown(frames) {
  const results = [];
  const flattened = [];
  const rollMap = [];

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const f = frames[i];
    if (i < FRAME_COUNT - 1) {
      if (f.roll1 !== null) {
        flattened.push(f.roll1);
        rollMap.push({ frame: i, roll: 1 });
      }
      if (f.roll1 !== 10 && f.roll2 !== null) {
        flattened.push(f.roll2);
        rollMap.push({ frame: i, roll: 2 });
      }
    } else {
      if (f.roll1 !== null) {
        flattened.push(f.roll1);
        rollMap.push({ frame: i, roll: 1 });
      }
      if (f.roll2 !== null) {
        flattened.push(f.roll2);
        rollMap.push({ frame: i, roll: 2 });
      }
      if (f.roll3 !== null) {
        flattened.push(f.roll3);
        rollMap.push({ frame: i, roll: 3 });
      }
    }
  }

  let scanIndex = 0;
  let runningTotal = 0;

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const frame = frames[frameIndex];

    if (frameIndex < FRAME_COUNT - 1) {
      if (frame.roll1 === null) {
        results.push(makePending(frame));
        continue;
      }

      const nextTwo = [flattened[scanIndex + 1], flattened[scanIndex + 2]];
      const nextOne = flattened[scanIndex + 2 - (frame.roll1 === 10 ? 1 : 0)];

      if (frame.roll1 === 10) {
        if (nextTwo[0] === undefined || nextTwo[1] === undefined) {
          results.push(makePending(frame));
          scanIndex += 1;
          continue;
        }

        const score = 10 + nextTwo[0] + nextTwo[1];
        runningTotal += score;
        results.push({
          score,
          cumulative: runningTotal,
          complete: true,
          allowThirdRoll: false,
        });
        scanIndex += 1;
        continue;
      }

      if (frame.roll2 === null) {
        results.push(makePending(frame));
        scanIndex += 1;
        continue;
      }

      if (frame.roll1 + frame.roll2 === 10) {
        if (nextOne === undefined) {
          results.push(makePending(frame));
          scanIndex += 2;
          continue;
        }

        const score = 10 + nextOne;
        runningTotal += score;
        results.push({
          score,
          cumulative: runningTotal,
          complete: true,
          allowThirdRoll: false,
        });
        scanIndex += 2;
        continue;
      }

      const openScore = frame.roll1 + frame.roll2;
      runningTotal += openScore;
      results.push({
        score: openScore,
        cumulative: runningTotal,
        complete: true,
        allowThirdRoll: false,
      });
      scanIndex += 2;
      continue;
    }

    const allowThirdRoll =
      frame.roll1 === 10 ||
      (frame.roll1 !== null && frame.roll2 !== null && frame.roll1 + frame.roll2 === 10);

    if (frame.roll1 === null || frame.roll2 === null) {
      results.push({ score: null, cumulative: null, complete: false, allowThirdRoll });
      continue;
    }

    if (allowThirdRoll && frame.roll3 === null) {
      results.push({ score: null, cumulative: null, complete: false, allowThirdRoll });
      continue;
    }

    const tenthScore =
      frame.roll1 + frame.roll2 + (allowThirdRoll && frame.roll3 !== null ? frame.roll3 : 0);
    runningTotal += tenthScore;
    results.push({
      score: tenthScore,
      cumulative: runningTotal,
      complete: true,
      allowThirdRoll,
    });
  }

  const total = results.reduce((acc, frameRes) => acc + (frameRes.score ?? 0), 0);

  return {
    frames: results,
    total,
    rollMap,
  };
}

function makePending(frame) {
  return {
    score: null,
    cumulative: null,
    complete: false,
    allowThirdRoll:
      frame.roll1 === 10 ||
      (frame.roll1 !== null && frame.roll2 !== null && frame.roll1 + frame.roll2 === 10),
  };
}

function range(min, max) {
  const values = [];
  for (let i = min; i <= max; i += 1) {
    values.push(i);
  }
  return values;
}

function parseSelectValue(value) {
  if (value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function valueOrBlank(value) {
  return value === null ? "" : String(value);
}

function resetGame() {
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    gameState[i].roll1 = null;
    gameState[i].roll2 = null;
    gameState[i].roll3 = null;
  }
  updateUI();
}

function setupInstallFlow() {
  if (!installBtn) {
    return;
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    installBtn.hidden = true;
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
