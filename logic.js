// const SUITS = ["H", "D", "C", "S"];
// const WAR_SLOTS_START = 3;
// const WAR_SLOTS_CAP = 7;
// const DECK_CAP = 30;

// function rankName(r) {
//   if (r === 11) return "J";
//   if (r === 12) return "Q";
//   if (r === 13) return "K";
//   if (r === 14) return "A";
//   return String(r);
// }

// function shuffle(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

// function stdCard(r, s) {
//   return { kind: "std", r, s };
// }

// function specialCard(id, name, text, timing, effect) {
//   return { kind: "special", id, name, text, timing, effect };
// }

// function copySpecial(card) {
//   return specialCard(card.id, card.name, card.text, card.timing, card.effect);
// }

// const SPECIAL_POOL = [
//   specialCard("boost3", "Boost", "+3 rank this flip. Destroy after use.", "onReveal", (ctx) => {
//     ctx.playerBonus += 3;
//     ctx.destroyCurrentReveal = true;
//   }),
//   specialCard("rigged", "Rigged", "If revealed rank is 2–6, treat as 10.", "onReveal", (ctx) => {
//     if (ctx.playerBaseRank >= 2 && ctx.playerBaseRank <= 6) {
//       ctx.playerBaseRank = 10;
//     }
//   }),
//   specialCard("ceasefire", "Ceasefire", "First tie becomes a push. Destroy after use.", "onWarTrigger", (ctx) => {
//     if (!ctx.usedCeasefire) {
//       ctx.usedCeasefire = true;
//       ctx.cancelWar = true;
//       ctx.destroyCurrentReveal = true;
//     }
//   })
// ];

// function makeStarterDeck() {
//   const deck = [];
//   const add = (r, n) => {
//     for (let i = 0; i < n; i++) {
//       deck.push(stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]));
//     }
//   };

//   add(4, 2);
//   add(5, 2);
//   add(6, 3);
//   add(7, 3);
//   add(8, 3);
//   add(9, 3);
//   add(10, 2);
//   add(12, 1);
//   add(13, 1);

//   deck.push(copySpecial(SPECIAL_POOL[0]));
//   deck.push(copySpecial(SPECIAL_POOL[1]));

//   return shuffle(deck);
// }

// function createState() {
//   return {
//     ante: 1,
//     coins: 0,
//     warSlots: WAR_SLOTS_START,
//     drawPile: makeStarterDeck(),
//     discardPile: [],
//     destroyed: [],
//     lost: [],
//     lootStash: [],
//     gameOver: false,
//     battleCount: 0
//   };
// }

// function deckSize(state) {
//   return state.drawPile.length + state.discardPile.length;
// }

// function draw(state) {
//   if (state.drawPile.length === 0) {
//     state.drawPile = shuffle(state.discardPile.splice(0));
//   }
//   return state.drawPile.shift() || null;
// }

// function opponentRevealForAnte(ante) {
//   const base = 6 + ante;
//   const r = Math.max(2, Math.min(14, base + Math.floor(Math.random() * 7) - 3));
//   return stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]);
// }

// function opponentPotLoot(ante, count) {
//   const loot = [];
//   for (let i = 0; i < count; i++) {
//     const bias = 5 + ante;
//     const r = Math.max(2, Math.min(14, bias + Math.floor(Math.random() * 9) - 4));
//     loot.push(stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]));
//   }
//   return loot;
// }

// function baseRankForCard(card) {
//   return card.kind === "std" ? card.r : 7;
// }

// function applySpecialIfTiming(card, timing, ctx) {
//   if (card.kind === "special" && card.timing === timing) {
//     card.effect(ctx);
//   }
// }

// function cardLabel(card) {
//   if (!card) return "?";
//   return card.kind === "std" ? `${rankName(card.r)}${card.s}` : card.name;
// }

// function resolveCard(card, ctx) {
//   ctx.playerBaseRank = baseRankForCard(card);
//   ctx.playerBonus = 0;
//   ctx.destroyCurrentReveal = false;

//   applySpecialIfTiming(card, "onReveal", ctx);

//   return ctx.playerBaseRank + ctx.playerBonus;
// }

// function playBattle(state) {
//   if (state.gameOver) {
//     return { ended: true, reason: "game_over" };
//   }

//   state.battleCount += 1;

//   const reveal = draw(state);
//   if (!reveal) {
//     state.gameOver = true;
//     return { ended: true, reason: "out_of_cards" };
//   }

//   const ctx = {
//     cancelWar: false,
//     usedCeasefire: false,
//     playerBaseRank: 0,
//     playerBonus: 0,
//     destroyCurrentReveal: false
//   };

//   const opponent = opponentRevealForAnte(state.ante);
//   const playerRank = resolveCard(reveal, ctx);
//   const opponentRank = opponent.r;

//   if (playerRank > opponentRank) {
//     if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
//     else state.discardPile.push(reveal);

//     state.coins += 5;

//     return {
//       ended: false,
//       win: true,
//       war: false,
//       playerCard: reveal,
//       opponentCard: opponent,
//       playerRank,
//       opponentRank,
//       message: `You win the battle.`
//     };
//   }

//   if (playerRank < opponentRank) {
//     if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
//     else state.discardPile.push(reveal);

//     state.gameOver = true;

//     return {
//       ended: false,
//       win: false,
//       war: false,
//       playerCard: reveal,
//       opponentCard: opponent,
//       playerRank,
//       opponentRank,
//       message: `You lost the battle. Run over.`
//     };
//   }

//   applySpecialIfTiming(reveal, "onWarTrigger", ctx);

//   if (ctx.cancelWar) {
//     if (ctx.destroyCurrentReveal) state.destroyed.push(reveal);
//     else state.discardPile.push(reveal);

//     state.coins += 3;

//     return {
//       ended: false,
//       win: true,
//       war: false,
//       pushed: true,
//       playerCard: reveal,
//       opponentCard: opponent,
//       playerRank,
//       opponentRank,
//       message: `Tie avoided. Push survived.`
//     };
//   }

//   const commitSlots = Math.min(state.warSlots, WAR_SLOTS_CAP);
//   const potPlayer = [reveal];

//   for (let i = 0; i < commitSlots; i++) {
//     const c = draw(state);
//     if (!c) {
//       state.gameOver = true;
//       return { ended: true, reason: "out_of_cards_in_war" };
//     }
//     potPlayer.push(c);
//   }

//   const warReveal = draw(state);
//   if (!warReveal) {
//     state.gameOver = true;
//     return { ended: true, reason: "out_of_cards_in_war" };
//   }

//   const warOpponent = opponentRevealForAnte(state.ante);
//   const warPlayerRank = resolveCard(warReveal, ctx);
//   const warOpponentRank = warOpponent.r;
//   potPlayer.push(warReveal);

//   if (warPlayerRank > warOpponentRank) {
//     for (const c of potPlayer) {
//       if (c === warReveal && ctx.destroyCurrentReveal) state.destroyed.push(c);
//       else state.discardPile.push(c);
//     }

//     const loot = opponentPotLoot(state.ante, commitSlots + 2);
//     state.lootStash.push(...loot);
//     state.coins += 7;

//     return {
//       ended: false,
//       win: true,
//       war: true,
//       playerCard: warReveal,
//       opponentCard: warOpponent,
//       playerRank: warPlayerRank,
//       opponentRank: warOpponentRank,
//       lootCount: loot.length,
//       playerCommitted: potPlayer.length,
//       message: `You won the WAR and captured loot.`
//     };
//   }

//   state.lost.push(...potPlayer);
//   state.gameOver = true;

//   return {
//     ended: false,
//     win: false,
//     war: true,
//     playerCard: warReveal,
//     opponentCard: warOpponent,
//     playerRank: warPlayerRank,
//     opponentRank: warOpponentRank,
//     playerCommitted: potPlayer.length,
//     message: `You lost the WAR and your committed cards are gone.`
//   };
// }

// function removeOneWeakestStd(state) {
//   const all = [...state.drawPile, ...state.discardPile];
//   const lows = all.filter(c => c.kind === "std").sort((a, b) => a.r - b.r);
//   if (!lows.length) return null;

//   const target = lows[0];
//   const removeFrom = (pile) => {
//     const i = pile.indexOf(target);
//     if (i >= 0) pile.splice(i, 1);
//   };

//   removeFrom(state.drawPile);
//   removeFrom(state.discardPile);
//   state.destroyed.push(target);
//   return target;
// }

// function shop(state) {
//   if (state.gameOver) {
//     return { message: "Game over. Shop closed." };
//   }

//   let messages = [];

//   if (state.lootStash.length > 0) {
//     const take = state.lootStash.splice(0, Math.min(2, state.lootStash.length));
//     for (const c of take) {
//       if (deckSize(state) < DECK_CAP) {
//         state.drawPile.push(c);
//         messages.push(`Loot added: ${cardLabel(c)}`);
//       }
//     }
//     shuffle(state.drawPile);
//   }

//   if (state.coins >= 8) {
//     const offer = copySpecial(SPECIAL_POOL[Math.floor(Math.random() * SPECIAL_POOL.length)]);
//     state.coins -= 8;

//     if (deckSize(state) < DECK_CAP) {
//       state.drawPile.push(offer);
//       shuffle(state.drawPile);
//       messages.push(`Bought: ${offer.name}`);
//     }
//   }

//   if (state.coins >= 5) {
//     const removed = removeOneWeakestStd(state);
//     if (removed) {
//       state.coins -= 5;
//       messages.push(`Destroyed: ${cardLabel(removed)}`);
//     }
//   }

//   if (state.warSlots < WAR_SLOTS_CAP && state.coins >= 10) {
//     state.coins -= 10;
//     state.warSlots += 1;
//     messages.push(`War Slots increased to ${state.warSlots}`);
//   }

//   while (deckSize(state) > DECK_CAP) {
//     const removed = removeOneWeakestStd(state);
//     if (!removed) break;
//     messages.push(`Forced destroy for deck cap: ${cardLabel(removed)}`);
//   }

//   return {
//     message: messages.length ? messages.join(" | ") : "Nothing happened in shop."
//   };
// }


// previous written code, just in case new
const SUITS = ["H", "D", "C", "S"];
const STARTING_DECK_SIZE = 15;
const DECK_CAP = 40;
const WAR_SLOTS_START = 3;
const WAR_SLOTS_CAP = 7;
const TOTAL_BATTLES = 7;
const MAX_ROUNDS_PER_BATTLE = 50;
const COINS_PER_ROUND_WIN = 1;
const COINS_PER_WAR_WIN = 2;
const COINS_PER_BATTLE_WIN = 5;
const SHOP_REFRESH_COST = 2;
const SPECIAL_COST = 8;
const DESTROY_COST = 5;
const WAR_SLOT_COST = 10;

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
    ctx.destroyRevealed = true;
  }),
  specialCard("rigged", "Rigged", "If revealed rank is 2–6, treat as 10.", "onReveal", (ctx) => {
    if (ctx.playerBaseRank >= 2 && ctx.playerBaseRank <= 6) ctx.playerBaseRank = 10;
  }),
  specialCard("ceasefire", "Ceasefire", "First tie each round becomes a push. Destroy after.", "onWarTrigger", (ctx) => {
    if (!ctx.usedCeasefire) {
      ctx.usedCeasefire = true;
      ctx.cancelWar = true;
      ctx.destroyRevealed = true;
    }
  }),
  specialCard("insurance", "Insurance", "If you lose a WAR, salvage 1 committed card. Destroy after.", "onWarTrigger", (ctx) => {
    ctx.salvageOnWarLoss += 1;
    ctx.destroyRevealed = true;
  }),
  specialCard("escalator", "Escalator", "This WAR commits +1 extra face-down. Destroy after.", "onWarTrigger", (ctx) => {
    ctx.tempWarSlotsBonus += 1;
    ctx.destroyRevealed = true;
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

function deckSizeFromPiles(drawPile, discardPile) {
  return drawPile.length + discardPile.length;
}

function drawFromPiles(drawPile, discardPile) {
  if (drawPile.length === 0) {
    if (discardPile.length === 0) return null;
    drawPile.push(...shuffle(discardPile.splice(0)));
  }
  return drawPile.shift() || null;
}

function baseRankForCard(card) {
  return card.kind === "std" ? card.r : 7;
}

function applySpecialIfTiming(card, timing, ctx) {
  if (card.kind !== "special") return;
  if (card.timing === timing) card.effect(ctx);
}

function cardLabel(card) {
  if (!card) return "?";
  return card.kind === "std" ? `${rankName(card.r)}${card.s}` : card.name;
}

function cardDescription(card) {
  if (!card) return "";
  if (card.kind === "std") return `Standard card • Rank ${rankName(card.r)}`;
  return `${card.timing} • ${card.text}`;
}

function getCardId(card) {
  if (!card._id) {
    getCardId.counter += 1;
    card._id = `card_${getCardId.counter}`;
  }
  return card._id;
}
getCardId.counter = 0;

function allRunDeckCards(state) {
  return [...state.runDeck.drawPile, ...state.runDeck.discardPile];
}

function runDeckSize(state) {
  return deckSizeFromPiles(state.runDeck.drawPile, state.runDeck.discardPile);
}

function opponentDeckForBattle(battleNumber, size) {
  const deck = [];
  const minRank = Math.min(10, 4 + battleNumber - 1);
  const maxRank = Math.min(14, 10 + Math.floor((battleNumber - 1) / 2));

  for (let i = 0; i < size; i++) {
    const r = Math.max(2, Math.min(14, minRank + Math.floor(Math.random() * (maxRank - minRank + 1))));
    deck.push(stdCard(r, SUITS[Math.floor(Math.random() * SUITS.length)]));
  }

  return shuffle(deck);
}

function createState() {
  return {
    coins: 0,
    warSlots: WAR_SLOTS_START,
    battleNumber: 1,
    battleWins: 0,
    gameOver: false,
    shopOpen: false,
    readyForNextBattle: false,
    destroyed: [],
    shopOffers: [],
    runDeck: {
      drawPile: makeStarterDeck(),
      discardPile: []
    },
    battle: null
  };
}

function resolvePlayerFlip(card, ctx) {
  ctx.playerBaseRank = baseRankForCard(card);
  ctx.playerBonus = 0;
  applySpecialIfTiming(card, "onReveal", ctx);
  return ctx.playerBaseRank + ctx.playerBonus;
}

function startBattle(state) {
  if (state.gameOver) return { ok: false, message: "Run over." };
  if (state.battleNumber > TOTAL_BATTLES) return { ok: false, message: "All battles cleared." };

  const playerDraw = [...state.runDeck.drawPile];
  const playerDiscard = [...state.runDeck.discardPile];
  const opponentSize = Math.min(STARTING_DECK_SIZE + ((state.battleNumber - 1) * 5), DECK_CAP);

  state.battle = {
    number: state.battleNumber,
    roundNumber: 0,
    playerDraw,
    playerDiscard,
    opponentDraw: opponentDeckForBattle(state.battleNumber, opponentSize),
    opponentDiscard: [],
    roundWins: 0,
    roundLosses: 0,
    warWins: 0,
    warLosses: 0,
    over: false,
    winner: null,
    lastResult: null
  };

  state.shopOpen = false;
  state.readyForNextBattle = false;
  return { ok: true, message: `Battle ${state.battleNumber} started.` };
}

function totalBattleCards(battle, who) {
  if (!battle) return 0;
  if (who === "player") return deckSizeFromPiles(battle.playerDraw, battle.playerDiscard);
  return deckSizeFromPiles(battle.opponentDraw, battle.opponentDiscard);
}

function collectPot(battle, winner, potPlayer, potOpponent) {
  if (winner === "player") {
    battle.playerDiscard.push(...potPlayer, ...potOpponent);
  } else {
    battle.opponentDiscard.push(...potPlayer, ...potOpponent);
  }
}

function finalizeBattleState(state, battleWinner) {
  state.runDeck.drawPile = shuffle([...state.battle.playerDraw, ...state.battle.playerDiscard]);
  state.runDeck.discardPile = [];
  state.battle.over = true;
  state.battle.winner = battleWinner;

  if (battleWinner === "player") {
    state.coins += COINS_PER_BATTLE_WIN;
    state.battleWins += 1;
    state.shopOpen = true;
    state.readyForNextBattle = state.battleNumber < TOTAL_BATTLES;
    return { won: true, message: `Battle ${state.battle.number} won. +${COINS_PER_BATTLE_WIN} battle bonus coins.` };
  }

  state.gameOver = true;
  state.shopOpen = false;
  state.readyForNextBattle = false;
  return { won: false, message: `Battle ${state.battle.number} lost. Run over.` };
}

function maybeEndBattle(state) {
  const battle = state.battle;
  const playerCards = totalBattleCards(battle, "player");
  const opponentCards = totalBattleCards(battle, "opponent");

  if (playerCards === 0 && opponentCards === 0) {
    return finalizeBattleState(state, "opponent");
  }
  if (opponentCards === 0) {
    return finalizeBattleState(state, "player");
  }
  if (playerCards === 0) {
    return finalizeBattleState(state, "opponent");
  }
  if (battle.roundNumber >= MAX_ROUNDS_PER_BATTLE) {
    const winner = playerCards > opponentCards ? "player" : "opponent";
    return finalizeBattleState(state, winner);
  }
  return null;
}

function playRound(state) {
  if (state.gameOver) return { ended: true, reason: "game_over" };
  if (!state.battle || state.battle.over) return { ended: true, reason: "no_active_battle" };
  if (state.shopOpen) return { ended: true, reason: "shop_open" };

  const battle = state.battle;
  battle.roundNumber += 1;

  const reveal = drawFromPiles(battle.playerDraw, battle.playerDiscard);
  const oppReveal = drawFromPiles(battle.opponentDraw, battle.opponentDiscard);

  if (!reveal || !oppReveal) {
    const end = maybeEndBattle(state);
    return { ended: true, reason: end ? end.message : "battle_deck_empty" };
  }

  const ctx = {
    cancelWar: false,
    usedCeasefire: false,
    destroyRevealed: false,
    salvageOnWarLoss: 0,
    tempWarSlotsBonus: 0,
    playerBaseRank: 0,
    playerBonus: 0
  };

  const playerRank = resolvePlayerFlip(reveal, ctx);
  const opponentRank = oppReveal.r;
  const potPlayer = [reveal];
  const potOpponent = [oppReveal];

  let result = null;

  if (playerRank > opponentRank) {
    if (ctx.destroyRevealed) {
      state.destroyed.push(reveal);
      potPlayer.pop();
    }
    collectPot(battle, "player", potPlayer, potOpponent);
    battle.roundWins += 1;
    state.coins += COINS_PER_ROUND_WIN;
    result = {
      ended: false,
      win: true,
      war: false,
      playerCard: reveal,
      opponentCard: oppReveal,
      playerRank,
      opponentRank,
      message: `Round ${battle.roundNumber}: WIN | ${cardLabel(reveal)}(${playerRank}) vs ${cardLabel(oppReveal)}(${opponentRank}) | +${COINS_PER_ROUND_WIN} coin`
    };
  } else if (playerRank < opponentRank) {
    if (ctx.destroyRevealed) {
      state.destroyed.push(reveal);
      potPlayer.pop();
    }
    collectPot(battle, "opponent", potPlayer, potOpponent);
    battle.roundLosses += 1;
    result = {
      ended: false,
      win: false,
      war: false,
      playerCard: reveal,
      opponentCard: oppReveal,
      playerRank,
      opponentRank,
      message: `Round ${battle.roundNumber}: LOSS | ${cardLabel(reveal)}(${playerRank}) vs ${cardLabel(oppReveal)}(${opponentRank})`
    };
  } else {
    applySpecialIfTiming(reveal, "onWarTrigger", ctx);

    if (ctx.cancelWar) {
      if (ctx.destroyRevealed) {
        state.destroyed.push(reveal);
        potPlayer.pop();
      }
      collectPot(battle, "player", potPlayer, potOpponent);
      battle.roundWins += 1;
      state.coins += COINS_PER_ROUND_WIN;
      result = {
        ended: false,
        win: true,
        war: false,
        pushed: true,
        playerCard: reveal,
        opponentCard: oppReveal,
        playerRank,
        opponentRank,
        message: `Round ${battle.roundNumber}: PUSH SURVIVED | ${cardLabel(reveal)} tied ${cardLabel(oppReveal)} | +${COINS_PER_ROUND_WIN} coin`
      };
    } else {
      const commitSlots = Math.min(state.warSlots + ctx.tempWarSlotsBonus, WAR_SLOTS_CAP + 1);

      for (let i = 0; i < commitSlots; i++) {
        const playerFaceDown = drawFromPiles(battle.playerDraw, battle.playerDiscard);
        const opponentFaceDown = drawFromPiles(battle.opponentDraw, battle.opponentDiscard);
        if (!playerFaceDown || !opponentFaceDown) {
          const end = finalizeBattleState(state, playerFaceDown ? "player" : "opponent");
          return { ended: true, reason: end.message };
        }
        potPlayer.push(playerFaceDown);
        potOpponent.push(opponentFaceDown);
      }

      const warReveal = drawFromPiles(battle.playerDraw, battle.playerDiscard);
      const oppWarReveal = drawFromPiles(battle.opponentDraw, battle.opponentDiscard);
      if (!warReveal || !oppWarReveal) {
        const end = finalizeBattleState(state, warReveal ? "player" : "opponent");
        return { ended: true, reason: end.message };
      }

      potPlayer.push(warReveal);
      potOpponent.push(oppWarReveal);

      const warPlayerRank = resolvePlayerFlip(warReveal, ctx);
      const warOpponentRank = oppWarReveal.r;

      if (warPlayerRank > warOpponentRank) {
        if (ctx.destroyRevealed) {
          state.destroyed.push(warReveal);
          const idx = potPlayer.indexOf(warReveal);
          if (idx >= 0) potPlayer.splice(idx, 1);
        }
        collectPot(battle, "player", potPlayer, potOpponent);
        battle.roundWins += 1;
        battle.warWins += 1;
        state.coins += COINS_PER_ROUND_WIN + COINS_PER_WAR_WIN;
        result = {
          ended: false,
          win: true,
          war: true,
          playerCard: warReveal,
          opponentCard: oppWarReveal,
          playerRank: warPlayerRank,
          opponentRank: warOpponentRank,
          playerCommitted: potPlayer.length,
          message: `Round ${battle.roundNumber}: WAR WIN | ${cardLabel(warReveal)}(${warPlayerRank}) vs ${cardLabel(oppWarReveal)}(${warOpponentRank}) | Pot ${potPlayer.length + potOpponent.length} cards | +${COINS_PER_ROUND_WIN + COINS_PER_WAR_WIN} coins`
        };
      } else {
        const salvaged = [];
        if (ctx.salvageOnWarLoss > 0 && potPlayer.length > 0) {
          const idx = Math.floor(Math.random() * potPlayer.length);
          salvaged.push(potPlayer.splice(idx, 1)[0]);
        }
        if (ctx.destroyRevealed) {
          const idx = potPlayer.indexOf(warReveal);
          if (idx >= 0) potPlayer.splice(idx, 1);
          state.destroyed.push(warReveal);
        }
        battle.playerDiscard.push(...salvaged);
        collectPot(battle, "opponent", potPlayer, potOpponent);
        battle.roundLosses += 1;
        battle.warLosses += 1;
        result = {
          ended: false,
          win: false,
          war: true,
          playerCard: warReveal,
          opponentCard: oppWarReveal,
          playerRank: warPlayerRank,
          opponentRank: warOpponentRank,
          playerCommitted: potPlayer.length,
          message: `Round ${battle.roundNumber}: WAR LOSS | ${cardLabel(warReveal)}(${warPlayerRank}) vs ${cardLabel(oppWarReveal)}(${warOpponentRank}) | Opponent captures ${potPlayer.length + potOpponent.length} cards`
        };
      }
    }
  }

  battle.lastResult = result;
  const battleEnd = maybeEndBattle(state);
  if (battleEnd) {
    result.battleEnded = true;
    result.battleMessage = battleEnd.message;
  }
  return result;
}

function refreshShopOffers(state) {
  if (!state.shopOpen) return { ok: false, message: "Shop is closed." };
  if (state.coins < SHOP_REFRESH_COST && state.shopOffers.length > 0) return { ok: false, message: `Need ${SHOP_REFRESH_COST} coins to refresh.` };

  if (state.shopOffers.length > 0) state.coins -= SHOP_REFRESH_COST;
  state.shopOffers = shuffle(SPECIAL_POOL.map(copySpecial)).slice(0, 3);
  return { ok: true, message: "Shop offers refreshed." };
}

function buyOffer(state, index) {
  if (!state.shopOpen) return { ok: false, message: "Shop is closed." };
  const offer = state.shopOffers[index];
  if (!offer) return { ok: false, message: "That offer is gone." };
  if (state.coins < SPECIAL_COST) return { ok: false, message: `Need ${SPECIAL_COST} coins.` };
  if (runDeckSize(state) >= DECK_CAP) return { ok: false, message: "Run deck is at cap. Destroy a card first." };

  state.coins -= SPECIAL_COST;
  state.runDeck.drawPile.push(copySpecial(offer));
  shuffle(state.runDeck.drawPile);
  state.shopOffers.splice(index, 1);
  return { ok: true, message: `Bought ${offer.name}.` };
}

function buyWarSlot(state) {
  if (!state.shopOpen) return { ok: false, message: "Shop is closed." };
  if (state.warSlots >= WAR_SLOTS_CAP) return { ok: false, message: "War Slots are already capped." };
  if (state.coins < WAR_SLOT_COST) return { ok: false, message: `Need ${WAR_SLOT_COST} coins.` };

  state.coins -= WAR_SLOT_COST;
  state.warSlots += 1;
  return { ok: true, message: `War Slots increased to ${state.warSlots}.` };
}

function destroyCardById(state, id) {
  if (!state.shopOpen) return { ok: false, message: "Shop is closed." };
  const piles = [state.runDeck.drawPile, state.runDeck.discardPile];
  for (const pile of piles) {
    const index = pile.findIndex((card) => getCardId(card) === id);
    if (index >= 0) {
      if (state.coins < DESTROY_COST) return { ok: false, message: `Need ${DESTROY_COST} coins.` };
      const [removed] = pile.splice(index, 1);
      state.coins -= DESTROY_COST;
      state.destroyed.push(removed);
      return { ok: true, message: `Destroyed ${cardLabel(removed)}.` };
    }
  }
  return { ok: false, message: "Card not found." };
}

function startNextBattle(state) {
  if (state.gameOver) return { ok: false, message: "Run over." };
  if (!state.readyForNextBattle) return { ok: false, message: "You are not ready for the next battle yet." };
  state.battleNumber += 1;
  state.shopOpen = false;
  state.readyForNextBattle = false;
  state.shopOffers = [];
  return startBattle(state);
}