let state = createState();
startBattle(state);

const battleNumberEl = document.getElementById("battleNumber");
const coinsEl = document.getElementById("coins");
const warSlotsEl = document.getElementById("warSlots");
const roundNumberEl = document.getElementById("roundNumber");
const playerBattleCardsEl = document.getElementById("playerBattleCards");
const opponentBattleCardsEl = document.getElementById("opponentBattleCards");
const runDeckSizeEl = document.getElementById("runDeckSize");
const destroyedEl = document.getElementById("destroyed");
const battleWinsEl = document.getElementById("battleWins");
const shopStatusEl = document.getElementById("shopStatus");
const statusBadgeEl = document.getElementById("statusBadge");
const deckSummaryEl = document.getElementById("deckSummary");

const playerCardEl = document.getElementById("playerCard");
const opponentCardEl = document.getElementById("opponentCard");
const playerRankEl = document.getElementById("playerRank");
const opponentRankEl = document.getElementById("opponentRank");
const resultTextEl = document.getElementById("resultText");
const battleSummaryTextEl = document.getElementById("battleSummaryText");
const logEl = document.getElementById("log");

const deckListEl = document.getElementById("deckList");
const shopOffersEl = document.getElementById("shopOffers");
const destroyListEl = document.getElementById("destroyList");

const playRoundBtn = document.getElementById("playRoundBtn");
const openShopBtn = document.getElementById("openShopBtn");
const nextBattleBtn = document.getElementById("nextBattleBtn");
const resetBtn = document.getElementById("resetBtn");
const refreshShopBtn = document.getElementById("refreshShopBtn");
const warSlotBtn = document.getElementById("warSlotBtn");

function addLog(message) {
  const line = document.createElement("div");
  line.className = "log-entry";
  line.textContent = message;
  logEl.prepend(line);
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

function resetBoardCards() {
  playerCardEl.textContent = "?";
  opponentCardEl.textContent = "?";
  playerCardEl.classList.add("back");
  opponentCardEl.classList.add("back");
  playerRankEl.textContent = "-";
  opponentRankEl.textContent = "-";
}

function updateStats() {
  battleNumberEl.textContent = state.battleNumber;
  coinsEl.textContent = state.coins;
  warSlotsEl.textContent = state.warSlots;
  roundNumberEl.textContent = state.battle ? state.battle.roundNumber : 0;
  playerBattleCardsEl.textContent = state.battle ? totalBattleCards(state.battle, "player") : 0;
  opponentBattleCardsEl.textContent = state.battle ? totalBattleCards(state.battle, "opponent") : 0;
  runDeckSizeEl.textContent = runDeckSize(state);
  destroyedEl.textContent = state.destroyed.length;
  battleWinsEl.textContent = state.battleWins;
  shopStatusEl.textContent = state.shopOpen ? "Open" : "Closed";
  deckSummaryEl.textContent = `${runDeckSize(state)} cards`;
  statusBadgeEl.textContent = state.gameOver ? "Run Over" : state.shopOpen ? "Shop Open" : "Battle Active";
  statusBadgeEl.classList.toggle("result-loss", state.gameOver);
  statusBadgeEl.classList.toggle("result-win", !state.gameOver);

  playRoundBtn.disabled = state.gameOver || !state.battle || state.battle.over || state.shopOpen;
  openShopBtn.disabled = !state.shopOpen;
  nextBattleBtn.disabled = !state.readyForNextBattle || state.gameOver;
  refreshShopBtn.disabled = !state.shopOpen || (state.shopOffers.length > 0 && state.coins < SHOP_REFRESH_COST);
  warSlotBtn.disabled = !state.shopOpen || state.coins < WAR_SLOT_COST || state.warSlots >= WAR_SLOTS_CAP;
}

function renderDeckList() {
  deckListEl.innerHTML = "";
  const cards = allRunDeckCards(state)
    .map((card) => ({ card, label: cardLabel(card), desc: cardDescription(card) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  for (const item of cards) {
    const div = document.createElement("div");
    div.className = "mini-card";
    div.innerHTML = `<div><strong>${item.label}</strong><small>${item.desc}</small></div>`;
    deckListEl.appendChild(div);
  }
}

function renderShopOffers() {
  shopOffersEl.innerHTML = "";

  if (!state.shopOpen) {
    const closed = document.createElement("div");
    closed.className = "mini-card";
    closed.innerHTML = `<div><strong>Shop closed</strong><small>Win the current battle to buy upgrades.</small></div>`;
    shopOffersEl.appendChild(closed);
    return;
  }

  if (!state.shopOffers.length) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.innerHTML = `<div><strong>No offers</strong><small>Refresh the shop.</small></div>`;
    shopOffersEl.appendChild(empty);
    return;
  }

  state.shopOffers.forEach((offer, index) => {
    const div = document.createElement("div");
    div.className = "mini-card";
    const disabled = state.coins < SPECIAL_COST || runDeckSize(state) >= DECK_CAP;
    div.innerHTML = `
      <div>
        <strong>${offer.name}</strong>
        <small>${offer.text}</small>
      </div>
      <button data-offer-index="${index}" ${disabled ? "disabled" : ""}>Buy (${SPECIAL_COST})</button>
    `;
    shopOffersEl.appendChild(div);
  });
}

function renderDestroyList() {
  destroyListEl.innerHTML = "";

  if (!state.shopOpen) {
    const closed = document.createElement("div");
    closed.className = "mini-card";
    closed.innerHTML = `<div><strong>Destroy locked</strong><small>Available only in the shop.</small></div>`;
    destroyListEl.appendChild(closed);
    return;
  }

  const cards = allRunDeckCards(state)
    .filter((card) => card.kind === "std")
    .sort((a, b) => a.r - b.r)
    .slice(0, 8);

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.innerHTML = `<div><strong>No standard cards</strong><small>Nothing to destroy.</small></div>`;
    destroyListEl.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "mini-card";
    const id = getCardId(card);
    const disabled = state.coins < DESTROY_COST;
    div.innerHTML = `
      <div>
        <strong>${cardLabel(card)}</strong>
        <small>${cardDescription(card)}</small>
      </div>
      <button data-destroy-id="${id}" ${disabled ? "disabled" : ""}>Destroy (${DESTROY_COST})</button>
    `;
    destroyListEl.appendChild(div);
  });
}

function renderAll() {
  updateStats();
  renderDeckList();
  renderShopOffers();
  renderDestroyList();
}

function handleRound() {
  const result = playRound(state);

  if (result.ended) {
    resultTextEl.textContent = result.reason;
    battleSummaryTextEl.textContent = result.reason;
    addLog(result.reason);
    renderAll();
    return;
  }

  renderCard(playerCardEl, result.playerCard);
  renderCard(opponentCardEl, result.opponentCard);
  playerRankEl.textContent = `Rank: ${result.playerRank}`;
  opponentRankEl.textContent = `Rank: ${result.opponentRank}`;

  if (result.war && result.win) {
    resultTextEl.textContent = "WAR WIN";
    resultTextEl.className = "result-text result-win";
  } else if (result.war && !result.win) {
    resultTextEl.textContent = "WAR LOSS";
    resultTextEl.className = "result-text result-loss";
  } else if (result.pushed) {
    resultTextEl.textContent = "PUSH";
    resultTextEl.className = "result-text";
  } else if (result.win) {
    resultTextEl.textContent = "WIN";
    resultTextEl.className = "result-text result-win";
  } else {
    resultTextEl.textContent = "LOSS";
    resultTextEl.className = "result-text result-loss";
  }

  battleSummaryTextEl.textContent = result.message;
  addLog(result.message);

  if (result.battleEnded) {
    addLog(result.battleMessage);
    battleSummaryTextEl.textContent = result.battleMessage;
    if (state.shopOpen && state.shopOffers.length === 0) {
      refreshShopOffers(state);
    }
  }

  renderAll();
}

function handleOpenShop() {
  resultTextEl.textContent = "SHOP OPEN";
  resultTextEl.className = "result-text";
  battleSummaryTextEl.textContent = "Spend your battle winnings before the next fight.";
  if (state.shopOffers.length === 0) {
    const result = refreshShopOffers(state);
    addLog(`SHOP | ${result.message}`);
  }
  renderAll();
}

function handleNextBattle() {
  const result = startNextBattle(state);
  addLog(result.message);
  resetBoardCards();
  resultTextEl.textContent = "NEXT BATTLE";
  resultTextEl.className = "result-text";
  battleSummaryTextEl.textContent = result.message;
  renderAll();
}

function handleReset() {
  state = createState();
  startBattle(state);
  resetBoardCards();
  resultTextEl.textContent = "Press Play Round to begin battle 1";
  resultTextEl.className = "result-text";
  battleSummaryTextEl.textContent = "Win rounds to steal enemy cards. Win the whole battle to reach the shop.";
  logEl.innerHTML = "";
  addLog("New run started.");
  renderAll();
}

playRoundBtn.addEventListener("click", handleRound);
openShopBtn.addEventListener("click", handleOpenShop);
nextBattleBtn.addEventListener("click", handleNextBattle);
resetBtn.addEventListener("click", handleReset);
refreshShopBtn.addEventListener("click", () => {
  const result = refreshShopOffers(state);
  addLog(`SHOP | ${result.message}`);
  renderAll();
});
warSlotBtn.addEventListener("click", () => {
  const result = buyWarSlot(state);
  addLog(`SHOP | ${result.message}`);
  renderAll();
});

shopOffersEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-offer-index]");
  if (!button) return;
  const index = Number(button.dataset.offerIndex);
  const result = buyOffer(state, index);
  addLog(`SHOP | ${result.message}`);
  renderAll();
});

destroyListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-destroy-id]");
  if (!button) return;
  const id = button.dataset.destroyId;
  const result = destroyCardById(state, id);
  addLog(`DESTROY | ${result.message}`);
  renderAll();
});

resetBoardCards();
addLog("New run started.");
renderAll();