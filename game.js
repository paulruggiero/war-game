let state = createState();
refreshShopOffers(state);

const anteEl = document.getElementById("ante");
const coinsEl = document.getElementById("coins");
const warSlotsEl = document.getElementById("warSlots");
const drawPileEl = document.getElementById("drawPile");
const discardPileEl = document.getElementById("discardPile");
const destroyedEl = document.getElementById("destroyed");
const lostEl = document.getElementById("lost");
const lootStashEl = document.getElementById("lootStash");
const deckSizeEl = document.getElementById("deckSize");
const battleCountEl = document.getElementById("battleCount");
const statusBadgeEl = document.getElementById("statusBadge");
const deckSummaryEl = document.getElementById("deckSummary");

const playerCardEl = document.getElementById("playerCard");
const opponentCardEl = document.getElementById("opponentCard");
const playerRankEl = document.getElementById("playerRank");
const opponentRankEl = document.getElementById("opponentRank");
const resultTextEl = document.getElementById("resultText");
const logEl = document.getElementById("log");

const deckListEl = document.getElementById("deckList");
const shopOffersEl = document.getElementById("shopOffers");
const destroyListEl = document.getElementById("destroyList");
const lootListEl = document.getElementById("lootList");

const flipBtn = document.getElementById("flipBtn");
const shopBtn = document.getElementById("shopBtn");
const resetBtn = document.getElementById("resetBtn");
const refreshShopBtn = document.getElementById("refreshShopBtn");
const warSlotBtn = document.getElementById("warSlotBtn");

function updateStats() {
  anteEl.textContent = state.ante;
  coinsEl.textContent = state.coins;
  warSlotsEl.textContent = state.warSlots;
  drawPileEl.textContent = state.drawPile.length;
  discardPileEl.textContent = state.discardPile.length;
  destroyedEl.textContent = state.destroyed.length;
  lostEl.textContent = state.lost.length;
  lootStashEl.textContent = state.lootStash.length;
  deckSizeEl.textContent = deckSize(state);
  battleCountEl.textContent = state.battleCount;
  deckSummaryEl.textContent = `${deckSize(state)} cards`;
  statusBadgeEl.textContent = state.gameOver ? "Run Over" : "Run Active";
  statusBadgeEl.classList.toggle("result-loss", state.gameOver);
  statusBadgeEl.classList.toggle("result-win", !state.gameOver);

  warSlotBtn.disabled = state.gameOver || state.coins < WAR_SLOT_COST || state.warSlots >= WAR_SLOTS_CAP;
  refreshShopBtn.disabled = state.gameOver || (state.shopOffers.length > 0 && state.coins < SHOP_REFRESH_COST);
  flipBtn.disabled = state.gameOver;
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
  line.className = "log-entry";
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

function renderDeckList() {
  deckListEl.innerHTML = "";
  const cards = allDeckCards(state)
    .map(card => ({ card, label: cardLabel(card), desc: cardDescription(card) }))
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
    const buttonDisabled = state.gameOver || state.coins < SPECIAL_COST || deckSize(state) >= DECK_CAP;
    div.innerHTML = `
      <div>
        <strong>${offer.name}</strong>
        <small>${offer.text}</small>
      </div>
      <button data-offer-index="${index}" ${buttonDisabled ? "disabled" : ""}>Buy (${SPECIAL_COST})</button>
    `;
    shopOffersEl.appendChild(div);
  });
}

function renderDestroyList() {
  destroyListEl.innerHTML = "";
  const cards = allDeckCards(state)
    .filter(card => card.kind === "std")
    .sort((a, b) => a.r - b.r)
    .slice(0, 8);

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.innerHTML = `<div><strong>No standard cards</strong><small>Nothing to destroy.</small></div>`;
    destroyListEl.appendChild(empty);
    return;
  }

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "mini-card";
    const id = getCardId(card);
    const disabled = state.gameOver || state.coins < DESTROY_COST;
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

function renderLootList() {
  lootListEl.innerHTML = "";

  if (!state.lootStash.length) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.innerHTML = `<div><strong>No loot yet</strong><small>Win a WAR to capture cards.</small></div>`;
    lootListEl.appendChild(empty);
    return;
  }

  state.lootStash.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = "mini-card";
    const disabled = state.gameOver || deckSize(state) >= DECK_CAP;
    div.innerHTML = `
      <div>
        <strong>${cardLabel(card)}</strong>
        <small>${cardDescription(card)}</small>
      </div>
      <button data-loot-index="${index}" ${disabled ? "disabled" : ""}>Add</button>
    `;
    lootListEl.appendChild(div);
  });
}

function renderAll() {
  updateStats();
  renderDeckList();
  renderShopOffers();
  renderDestroyList();
  renderLootList();
}

function handleBattle() {
  const result = playBattle(state);

  if (result.ended) {
    resultTextEl.textContent = `Ended: ${result.reason}`;
    addLog(`Ended: ${result.reason}`);
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
    addLog(`WAR WIN | ${result.message}`);
  } else if (result.war && !result.win) {
    resultTextEl.textContent = "WAR LOSS";
    resultTextEl.className = "result-text result-loss";
    addLog(`WAR LOSS | ${result.message}`);
  } else if (result.pushed) {
    resultTextEl.textContent = "PUSH";
    resultTextEl.className = "result-text";
    addLog(`PUSH | ${result.message}`);
  } else if (result.win) {
    resultTextEl.textContent = "WIN";
    resultTextEl.className = "result-text result-win";
    addLog(`WIN | ${result.message}`);
  } else {
    resultTextEl.textContent = "LOSS";
    resultTextEl.className = "result-text result-loss";
    addLog(`LOSS | ${result.message}`);
  }

  const anteResult = nextAnteIfNeeded(state);
  if (anteResult.advanced) {
    addLog(anteResult.message);
  }

  const forced = forceDeckCap(state);
  if (forced.length) {
    addLog(`Deck cap cleanup: ${forced.map(cardLabel).join(", ")}`);
  }

  renderAll();

  if (state.gameOver) {
    addLog("Run over. Press Reset Run to start again.");
  }
}

function openShop() {
  resultTextEl.textContent = "SHOP OPEN";
  resultTextEl.className = "result-text";
  renderAll();
}

function handleReset() {
  state = createState();
  refreshShopOffers(state);
  resetBoardCards();
  resultTextEl.textContent = "Press Flip Battle to begin";
  resultTextEl.className = "result-text";
  logEl.innerHTML = "";
  addLog("New run started.");
  renderAll();
}

flipBtn.addEventListener("click", handleBattle);
shopBtn.addEventListener("click", openShop);
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

lootListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-loot-index]");
  if (!button) return;
  const index = Number(button.dataset.lootIndex);
  const result = addLootToDeck(state, index);
  addLog(`LOOT | ${result.message}`);
  renderAll();
});

resetBoardCards();
addLog("New run started.");
renderAll();