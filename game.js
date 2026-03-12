let state = createState();

const anteEl = document.getElementById("ante");
const coinsEl = document.getElementById("coins");
const warSlotsEl = document.getElementById("warSlots");
const drawPileEl = document.getElementById("drawPile");
const discardPileEl = document.getElementById("discardPile");
const destroyedEl = document.getElementById("destroyed");
const lostEl = document.getElementById("lost");
const lootStashEl = document.getElementById("lootStash");

const playerCardEl = document.getElementById("playerCard");
const opponentCardEl = document.getElementById("opponentCard");
const playerRankEl = document.getElementById("playerRank");
const opponentRankEl = document.getElementById("opponentRank");
const resultTextEl = document.getElementById("resultText");
const logEl = document.getElementById("log");

const flipBtn = document.getElementById("flipBtn");
const shopBtn = document.getElementById("shopBtn");
const resetBtn = document.getElementById("resetBtn");

function updateStats() {
  anteEl.textContent = state.ante;
  coinsEl.textContent = state.coins;
  warSlotsEl.textContent = state.warSlots;
  drawPileEl.textContent = state.drawPile.length;
  discardPileEl.textContent = state.discardPile.length;
  destroyedEl.textContent = state.destroyed.length;
  lostEl.textContent = state.lost.length;
  lootStashEl.textContent = state.lootStash.length;
}

function renderCard(element, card) {
  if (!card) {
    element.textContent = "?";
    element.classList.add("back");
    return;
  }

  element.textContent = cardLabel(card);
  element.classList.remove("back");
}

function addLog(message) {
  const line = document.createElement("div");
  line.textContent = message;
  logEl.prepend(line);
}

function resetBoardCards() {
  playerCardEl.textContent = "?";
  opponentCardEl.textContent = "?";
  playerCardEl.classList.add("back");
  opponentCardEl.classList.add("back");
  playerRankEl.textContent = "-";
  opponentRankEl.textContent = "-";
}

function handleBattle() {
  const result = playBattle(state);

  if (result.ended) {
    resultTextEl.textContent = `Ended: ${result.reason}`;
    addLog(`Ended: ${result.reason}`);
    updateStats();
    return;
  }

  renderCard(playerCardEl, result.playerCard);
  renderCard(opponentCardEl, result.opponentCard);

  playerRankEl.textContent = `Rank: ${result.playerRank}`;
  opponentRankEl.textContent = `Rank: ${result.opponentRank}`;

  if (result.war && result.win) {
    resultTextEl.textContent = `WAR WIN`;
    addLog(`WAR WIN | ${result.message} | Risked ${result.playerCommitted} cards | Loot +${result.lootCount}`);
  } else if (result.war && !result.win) {
    resultTextEl.textContent = `WAR LOSS`;
    addLog(`WAR LOSS | ${result.message} | Lost ${result.playerCommitted} committed cards`);
  } else if (result.pushed) {
    resultTextEl.textContent = `PUSH`;
    addLog(`PUSH | ${result.message}`);
  } else if (result.win) {
    resultTextEl.textContent = `WIN`;
    addLog(`WIN | ${result.message}`);
  } else {
    resultTextEl.textContent = `LOSS`;
    addLog(`LOSS | ${result.message}`);
  }

  updateStats();

  if (state.gameOver) {
    addLog("Run over. Press Reset Run to start again.");
  }
}

function handleShop() {
  const result = shop(state);
  resultTextEl.textContent = "SHOP";
  addLog(`SHOP | ${result.message}`);
  updateStats();
}

function handleReset() {
  state = createState();
  updateStats();
  resetBoardCards();
  resultTextEl.textContent = "Press Flip Battle to begin";
  logEl.innerHTML = "";
  addLog("New run started.");
}

flipBtn.addEventListener("click", handleBattle);
shopBtn.addEventListener("click", handleShop);
resetBtn.addEventListener("click", handleReset);

updateStats();
resetBoardCards();
addLog("New run started.");