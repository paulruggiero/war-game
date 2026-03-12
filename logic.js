const SUITS = ["H", "D", "C", "S"];
const WAR_SLOTS_START = 3;
const WAR_SLOTS_CAP = 7;
const DECK_CAP = 30;

function rankName(r) {
  if (r === 11) return "J";
  if (r === 12) return "Q";
  if (r === 13) return "K";
  if (r === 14) return "A";
  return String(r);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function stdCard(r, s) {
  return { kind: "std", r, s };
}

function specialCard(id, name, text, timing, effect) {
  return { kind: "special", id, name, text, timing, effect };
}

function copySpecial(card) {
  return specialCard(card.id, card.name, card.text, card.timing, card.effect);
}

const SPECIAL_POOL = [
  specialCard("boost3", "Boost", "+3 rank this flip. Destroy after use.", "onReveal", (ctx) => {
    ctx.playerBonus += 3;
    ctx.destroyCurrentReveal = true;
  }),
  specialCard("rigged", "Rigged", "If revealed rank is 2–6, treat as 10.", "onReveal", (ctx) => {
    if (ctx.playerBaseRank >= 2 && ctx.playerBaseRank <= 6) {
      ctx.playerBaseRank = 10;
    }
  }),
  specialCard("ceasefire", "Ceasefire", "First tie becomes a push. Destroy after use.", "onWarTrigger", (ctx) => {
    if (!ctx.usedCeasefire) {
      ctx.usedCeasefire = true;
      ctx.cancelWar = true;
      ctx.destroyCurrentReveal = true;
    }
  })
];

function makeStarterDeck() {
  const deck = [];
  const add = (r, n) => {
    for (let i = 0; i < n; i++) {
      deck.push(stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]));
    }
  };

  add(4, 2);
  add(5, 2);
  add(6, 3);
  add(7, 3);
  add(8, 3);
  add(9, 3);
  add(10, 2);
  add(12, 1);
  add(13, 1);

  deck.push(copySpecial(SPECIAL_POOL[0]));
  deck.push(copySpecial(SPECIAL_POOL[1]));

  return shuffle(deck);
}

function createState() {
  return {
    ante: 1,
    coins: 0,
    warSlots: WAR_SLOTS_START,
    drawPile: makeStarterDeck(),
    discardPile: [],
    destroyed: [],
    lost: [],
    lootStash: [],
    gameOver: false,
    battleCount: 0
  };
}

function deckSize(state) {
  return state.drawPile.length + state.discardPile.length;
}

function draw(state) {
  if (state.drawPile.length === 0) {
    state.drawPile = shuffle(state.discardPile.splice(0));
  }
  return state.drawPile.shift() || null;
}

function opponentRevealForAnte(ante) {
  const base = 6 + ante;
  const r = Math.max(2, Math.min(14, base + Math.floor(Math.random() * 7) - 3));
  return stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]);
}

function opponentPotLoot(ante, count) {
  const loot = [];
  for (let i = 0; i < count; i++) {
    const bias = 5 + ante;
    const r = Math.max(2, Math.min(14, bias + Math.floor(Math.random() * 9) - 4));
    loot.push(stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]));
  }
  return loot;
}

function baseRankForCard(card) {
  return card.kind === "std" ? card.r : 7;
}

function applySpecialIfTiming(card, timing, ctx) {
  if (card.kind === "special" && card.timing === timing) {
    card.effect(ctx);
  }
}

function cardLabel(card) {
  if (!card) return "?";
  return card.kind === "std" ? `${rankName(card.r)}${card.s}` : card.name;
}

function resolveCard(card, ctx) {
  ctx.playerBaseRank = baseRankForCard(card);
  ctx.playerBonus = 0;
  ctx.destroyCurrentReveal = false;

  applySpecialIfTiming(card, "onReveal", ctx);

  return ctx.playerBaseRank + ctx.playerBonus;
}

function playBattle(state) {
  if (state.gameOver) {
    return { ended: true, reason: "game_over" };
  }

  state.battleCount += 1;

  const reveal = draw(state);
  if (!reveal) {
    state.gameOver = true;
    return { ended: true, reason: "out_of_cards" };
  }

  const ctx = {
    cancelWar: false,
    usedCeasefire: false,
    playerBaseRank: 0,
    playerBonus: 0,
    destroyCurrentReveal: false
  };

  const opponent = opponentRevealForAnte(state.ante);
  const playerRank = resolveCard(reveal, ctx);
  const opponentRank = opponent.r;

  if (playerRank > opponentRank) {
    if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
    else state.discardPile.push(reveal);

    state.coins += 5;

    return {
      ended: false,
      win: true,
      war: false,
      playerCard: reveal,
      opponentCard: opponent,
      playerRank,
      opponentRank,
      message: `You win the battle.`
    };
  }

  if (playerRank < opponentRank) {
    if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
    else state.discardPile.push(reveal);

    state.gameOver = true;

    return {
      ended: false,
      win: false,
      war: false,
      playerCard: reveal,
      opponentCard: opponent,
      playerRank,
      opponentRank,
      message: `You lost the battle. Run over.`
    };
  }

  applySpecialIfTiming(reveal, "onWarTrigger", ctx);

  if (ctx.cancelWar) {
    if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
    else state.discardPile.push(reveal);

    state.coins += 3;

    return {
      ended: false,
      win: true,
      war: false,
      pushed: true,
      playerCard: reveal,
      opponentCard: opponent,
      playerRank,
      opponentRank,
      message: `Tie avoided. Push survived.`
    };
  }

  const commitSlots = Math.min(state.warSlots, WAR_SLOTS_CAP);
  const potPlayer = [reveal];

  for (let i = 0; i < commitSlots; i++) {
    const c = draw(state);
    if (!c) {
      state.gameOver = true;
      return { ended: true, reason: "out_of_cards_in_war" };
    }
    potPlayer.push(c);
  }

  const warReveal = draw(state);
  if (!warReveal) {
    state.gameOver = true;
    return { ended: true, reason: "out_of_cards_in_war" };
  }

  const warOpponent = opponentRevealForAnte(state.ante);
  const warPlayerRank = resolveCard(warReveal, ctx);
  const warOpponentRank = warOpponent.r;
  potPlayer.push(warReveal);

  if (warPlayerRank > warOpponentRank) {
    for (const c of potPlayer) {
      if (c === warReveal && ctx.destroyCurrentReveal) state.destroyed.push(c);
      else state.discardPile.push(c);
    }

    const loot = opponentPotLoot(state.ante, commitSlots + 2);
    state.lootStash.push(...loot);
    state.coins += 7;

    return {
      ended: false,
      win: true,
      war: true,
      playerCard: warReveal,
      opponentCard: warOpponent,
      playerRank: warPlayerRank,
      opponentRank: warOpponentRank,
      lootCount: loot.length,
      playerCommitted: potPlayer.length,
      message: `You won the WAR and captured loot.`
    };
  }

  state.lost.push(...potPlayer);
  state.gameOver = true;

  return {
    ended: false,
    win: false,
    war: true,
    playerCard: warReveal,
    opponentCard: warOpponent,
    playerRank: warPlayerRank,
    opponentRank: warOpponentRank,
    playerCommitted: potPlayer.length,
    message: `You lost the WAR and your committed cards are gone.`
  };
}

function removeOneWeakestStd(state) {
  const all = [...state.drawPile, ...state.discardPile];
  const lows = all.filter(c => c.kind === "std").sort((a, b) => a.r - b.r);
  if (!lows.length) return null;

  const target = lows[0];
  const removeFrom = (pile) => {
    const i = pile.indexOf(target);
    if (i >= 0) pile.splice(i, 1);
  };

  removeFrom(state.drawPile);
  removeFrom(state.discardPile);
  state.destroyed.push(target);
  return target;
}

function shop(state) {
  if (state.gameOver) {
    return { message: "Game over. Shop closed." };
  }

  let messages = [];

  if (state.lootStash.length > 0) {
    const take = state.lootStash.splice(0, Math.min(2, state.lootStash.length));
    for (const c of take) {
      if (deckSize(state) < DECK_CAP) {
        state.drawPile.push(c);
        messages.push(`Loot added: ${cardLabel(c)}`);
      }
    }
    shuffle(state.drawPile);
  }

  if (state.coins >= 8) {
    const offer = copySpecial(SPECIAL_POOL[Math.floor(Math.random() * SPECIAL_POOL.length)]);
    state.coins -= 8;

    if (deckSize(state) < DECK_CAP) {
      state.drawPile.push(offer);
      shuffle(state.drawPile);
      messages.push(`Bought: ${offer.name}`);
    }
  }

  if (state.coins >= 5) {
    const removed = removeOneWeakestStd(state);
    if (removed) {
      state.coins -= 5;
      messages.push(`Destroyed: ${cardLabel(removed)}`);
    }
  }

  if (state.warSlots < WAR_SLOTS_CAP && state.coins >= 10) {
    state.coins -= 10;
    state.warSlots += 1;
    messages.push(`War Slots increased to ${state.warSlots}`);
  }

  while (deckSize(state) > DECK_CAP) {
    const removed = removeOneWeakestStd(state);
    if (!removed) break;
    messages.push(`Forced destroy for deck cap: ${cardLabel(removed)}`);
  }

  return {
    message: messages.length ? messages.join(" | ") : "Nothing happened in shop."
  };
}