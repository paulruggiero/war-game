// war_extract.js
// Node MVP: One-loss run ends. Wars risk YOUR cards (extraction pot).
// You can add/remove cards (shop). War commits are limited by WAR_SLOTS (cap).
//
// Run: node war_extract.js

const SUITS = ["H","D","C","S"];
const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14]; // 11=J,12=Q,13=K,14=A

const DECK_START = 20;
const DECK_CAP = 30;

const WAR_SLOTS_START = 3;
const WAR_SLOTS_CAP = 7;

const SHOP_EVERY_BATTLES = 2;

const rankName = r => r===11?"J":r===12?"Q":r===13?"K":r===14?"A":String(r);
const shuffle = (a) => { for (let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a; };

function stdCard(r,s){ return { kind:"std", r, s }; }

function specialCard(id, name, text, timing, effect){
  return { kind:"special", id, name, text, timing, effect };
}
function copySpecial(card) {
  return specialCard(card.id, card.name, card.text, card.timing, card.effect);
}

// --------- Specials (MVP) ---------
// Timing windows in this MVP:
// - "onReveal" (applies when your reveal flips)
// - "onWarTrigger" (applies when tie triggers war BEFORE committing pot)
// - "afterWin" / "afterLose" (after resolution; lose ends run anyway)
const SPECIAL_POOL = [
  specialCard("boost3", "Boost", "+3 rank this flip. Destroy after use.", "onReveal", (ctx) => {
    ctx.playerBonus += 3;
    ctx.destroyRevealed = true;
  }),
  specialCard("rigged_low_to_10", "Rigged", "If revealed rank is 2–6, treat as 10.", "onReveal", (ctx) => {
    if (ctx.playerBaseRank >= 2 && ctx.playerBaseRank <= 6) ctx.playerBaseRank = 10;
  }),
  specialCard("ceasefire", "Ceasefire", "First tie each battle becomes a PUSH (no war). Destroy after.", "onWarTrigger", (ctx) => {
    if (!ctx.usedCeasefire) {
      ctx.usedCeasefire = true;
      ctx.cancelWar = true;
      ctx.destroyRevealed = true;
    }
  }),
  specialCard("insurance", "Insurance", "If you lose a WAR, salvage 1 committed card (random). Destroy after.", "onWarTrigger", (ctx) => {
    ctx.salvageOnWarLoss += 1;
    ctx.destroyRevealed = true;
  }),
  specialCard("escalator", "Escalator", "This WAR commits +1 extra face-down (can exceed cap by +1). Destroy after.", "onWarTrigger", (ctx) => {
    ctx.tempWarSlotsBonus += 1;
    ctx.destroyRevealed = true;
  }),
];

// --------- Starter deck ---------
function makeStarterDeck(){
  // A mid-heavy 18 std + 2 specials = 20
  const deck = [];
  const add = (r, n) => { for(let i=0;i<n;i++) deck.push(stdCard(r, SUITS[(Math.random()*4)|0])); };
  add(4,2); add(5,2); add(6,3); add(7,3); add(8,3); add(9,3); add(10,2); add(12,1); add(13,1); // 18
  deck.push(copySpecial(SPECIAL_POOL[0]));
  deck.push(copySpecial(SPECIAL_POOL[1]));
  
  return shuffle(deck);
}

function draw(state){
  if (state.drawPile.length === 0) state.drawPile = shuffle(state.discardPile.splice(0));
  return state.drawPile.shift() || null;
}

function removeOneWeakestStd(state){
  // remove lowest-rank standard card from draw or discard
  const all = [...state.drawPile, ...state.discardPile];
  const lows = all.filter(c => c.kind==="std").sort((a,b)=>a.r-b.r);
  if (!lows.length) return null;
  const target = lows[0];
  const rm = (pile) => { const i = pile.indexOf(target); if (i>=0) pile.splice(i,1); };
  rm(state.drawPile); rm(state.discardPile);
  state.destroyed.push(target);
  return target;
}

function deckSize(state){
  return state.drawPile.length + state.discardPile.length;
}

// --------- Opponent model (MVP) ---------
function opponentRevealForAnte(ante){
  // Slightly biased higher as ante rises
  const base = 6 + ante; // ante 1 -> 7
  const r = Math.max(2, Math.min(14, base + ((Math.random()*7)|0) - 3));
  const s = SUITS[(Math.random()*4)|0];
  return stdCard(r,s);
}

function opponentPotLoot(ante, count){
  // When you win a war you "capture" opponent committed cards as loot.
  // MVP: generate loot cards. Later we can track a real opponent deck.
  const loot = [];
  for (let i=0;i<count;i++){
    const bias = 5 + ante; // deeper antes slightly better loot
    const r = Math.max(2, Math.min(14, bias + ((Math.random()*9)|0) - 4));
    loot.push(stdCard(r, SUITS[(Math.random()*4)|0]));
  }
  return loot;
}

// --------- Reveal resolution ---------
function baseRankForCard(card){
  // Specials have a base rank so they can still "flip" like a card.
  // Tweakable: 7 makes specials roughly mid unless they boost.
  return card.kind === "std" ? card.r : 7;
}

function applySpecialIfTiming(card, timing, ctx){
  if (card.kind !== "special") return;
  if (card.timing === timing) card.effect(ctx);
}

function resolveFlip(state, revealedCard, ante, ctx){
  const opp = opponentRevealForAnte(ante);

  ctx.playerBaseRank = baseRankForCard(revealedCard);
  ctx.playerBonus = 0;

  // onReveal effects
  applySpecialIfTiming(revealedCard, "onReveal", ctx);

  const pRank = ctx.playerBaseRank + ctx.playerBonus;
  const oRank = opp.r;

  return { opp, pRank, oRank };
}

// --------- Battle with extraction WAR ---------
function playBattle(state){
  state.battleIndex += 1;

  // Draw reveal card
  const reveal = draw(state);
  if (!reveal) return { ended:true, reason:"out_of_cards" };

  // Context for this battle (resets each battle)
  const ctx = {
    cancelWar: false,
    usedCeasefire: false,
    destroyRevealed: false,
    salvageOnWarLoss: 0,
    tempWarSlotsBonus: 0,
    playerBaseRank: 0,
    playerBonus: 0,
  };

  const first = resolveFlip(state, reveal, state.ante, ctx);

  const labelReveal = reveal.kind === "std" ? `${rankName(reveal.r)}${reveal.s}` : `${reveal.name}`;
  const labelOpp = `${rankName(first.opp.r)}${first.opp.s}`;

  // non-tie outcome
  if (first.pRank !== first.oRank) {
    const win = first.pRank > first.oRank;

    // revealed card goes to discard unless destroyed
    if (ctx.destroyRevealed) state.destroyed.push(reveal);
    else state.discardPile.push(reveal);

    return {
      ended:false,
      win,
      war:false,
      reveal, opp: first.opp,
      pRank:first.pRank, oRank:first.oRank,
      labelReveal, labelOpp,
      pot: null,
      lootGained: [],
      cardsLost: [],
    };
  }

  // Tie: attempt War trigger effects
  applySpecialIfTiming(reveal, "onWarTrigger", ctx);

  if (ctx.cancelWar) {
    // PUSH: treat as neither win nor loss, but still consumes revealed card
    if (ctx.destroyRevealed) state.destroyed.push(reveal);
    else state.discardPile.push(reveal);

    return {
      ended:false,
      win:true, // treat as "survived" for MVP flow; you still get small reward
      war:false,
      pushed:true,
      reveal, opp: first.opp,
      pRank:first.pRank, oRank:first.oRank,
      labelReveal, labelOpp,
      pot: null,
      lootGained: [],
      cardsLost: [],
    };
  }

  // WAR begins: build the pot
  // Commit: WAR_SLOTS face-down from player deck + 1 deciding face-up later.
  // Cap handling:
  const baseSlots = Math.min(state.warSlots, WAR_SLOTS_CAP);
  const tempSlots = ctx.tempWarSlotsBonus; // may exceed cap by +1 (design choice)
  const commitSlots = Math.min(baseSlots + tempSlots, WAR_SLOTS_CAP + 1);

  const potPlayer = [reveal]; // revealed card is in the pot (at risk)
  const potOppCountBase = 1; // opponent reveal is "in pot" conceptually; we model via loot gen

  // face-down commits from player
  for (let i=0;i<commitSlots;i++){
    const c = draw(state);
    if (!c) return { ended:true, reason:"out_of_cards_in_war_commit" };
    potPlayer.push(c);
  }

  // deciding face-up
  const warReveal = draw(state);
  if (!warReveal) return { ended:true, reason:"out_of_cards_in_war_reveal" };

  // reset reveal-based bonuses for warReveal but keep ctx items like salvage/slots
  const warFlip = resolveFlip(state, warReveal, state.ante, ctx);

  const warLabelPlayer = warReveal.kind === "std" ? `${rankName(warReveal.r)}${warReveal.s}` : `${warReveal.name}`;
  const warLabelOpp = `${rankName(warFlip.opp.r)}${warFlip.opp.s}`;

  // pot includes the warReveal card as well (at stake)
  potPlayer.push(warReveal);

  // Resolve War
  if (warFlip.pRank > warFlip.oRank) {
    // WIN WAR: you keep your pot cards (return to discard),
    // and you capture opponent pot as loot
    const oppPotCount = potOppCountBase + commitSlots + 1; // rough symmetry: reveal + facedown + deciding
    const loot = opponentPotLoot(state.ante, oppPotCount);

    // handle destroyed revealed cards
    // If reveal/warReveal were specials that self-destroy, they should be destroyed; others go to discard
    // We'll process each pot card: if it is the warReveal and ctx.destroyRevealed is set it applies only to current revealed card,
    // but in MVP we treat "destroy after use" as applying when it was revealed (either reveal or warReveal).
    // So we track destruction by checking if the card is special and its text includes "Destroy after" AND it was revealed in that flip.
    // Simplify: if a special has timing onReveal/onWarTrigger and set ctx.destroyRevealed at that moment, we can't distinguish.
    // MVP simplification: if ctx.destroyRevealed is true, destroy the *last revealed* card only.
    // We'll implement: if ctx.destroyRevealed -> destroy warReveal (because it was last revealed).
    // And separately, if the original reveal is special with onWarTrigger and destroyRevealed occurred before commit, we already set ctx.destroyRevealed true.
    // This is a simplification; in Godot version we'll track per-card flags properly.

    // Put all pot cards back unless destroyed
    if (ctx.destroyRevealed) {
      // destroy warReveal, keep the rest
      state.destroyed.push(warReveal);
      // put rest to discard
      for (const c of potPlayer) if (c !== warReveal) state.discardPile.push(c);
    } else {
      state.discardPile.push(...potPlayer);
    }

    // Add loot to a stash; player chooses to add to deck in shop (Balatro-ish)
    state.lootStash.push(...loot);

    return {
      ended:false,
      win:true,
      war:true,
      reveal, opp:first.opp,
      pRank:warFlip.pRank, oRank:warFlip.oRank,
      labelReveal: warLabelPlayer,
      labelOpp: warLabelOpp,
      pot: { playerCommitted: potPlayer.length, opponentCommitted: oppPotCount },
      lootGained: loot,
      cardsLost: [],
    };
  } else {
    // LOSE WAR (or tie again treated as loss for MVP): you lose committed cards permanently
    // salvage: keep 1 random committed card if Insurance
    const lost = [...potPlayer];
    const salvaged = [];

    if (ctx.salvageOnWarLoss > 0 && lost.length > 0) {
      // salvage up to N random cards
      for (let k=0;k<ctx.salvageOnWarLoss;k++){
        if (!lost.length) break;
        const idx = (Math.random()*lost.length)|0;
        salvaged.push(lost.splice(idx,1)[0]);
      }
    }

    state.lost.push(...lost);
    state.discardPile.push(...salvaged); // salvaged goes back into your deck cycle

    return {
      ended:false,
      win:false,
      war:true,
      reveal, opp:first.opp,
      pRank:warFlip.pRank, oRank:warFlip.oRank,
      labelReveal: warLabelPlayer,
      labelOpp: warLabelOpp,
      pot: { playerCommitted: potPlayer.length, opponentCommitted: potOppCountBase + commitSlots + 1 },
      lootGained: [],
      cardsLost: lost,
      salvaged,
    };
  }
}

// --------- Shop ---------
function pickOffers(){
  const offers = shuffle(SPECIAL_POOL.map(x => copySpecial(x))).slice(0,3);
  return offers;
}

function shop(state){
  state.log.push(`\n=== SHOP (Coins: ${state.coins}) ===`);

  // 1) Convert some loot into "offers" too (extraction vibe)
  // Show up to 2 loot cards as free/cheap adds (MVP: auto-add one if space)
  if (state.lootStash.length) {
    const take = state.lootStash.splice(0, Math.min(2, state.lootStash.length));
    // MVP: auto-add them to draw pile if under cap
    for (const c of take) {
      if (deckSize(state) < DECK_CAP) {
        state.drawPile.push(c);
        state.log.push(`LOOT ADDED: ${rankName(c.r)}${c.s}`);
      } else {
        // if full, stash returns (or destroy)
        state.destroyed.push(c);
        state.log.push(`LOOT DESTROYED (deck cap): ${rankName(c.r)}${c.s}`);
      }
    }
    shuffle(state.drawPile);
  }

  // 2) Buy a special card (cost)
  const cost = 8;
  const offers = pickOffers();
  if (state.coins >= cost) {
    const pick = offers[(Math.random()*offers.length)|0];
    state.coins -= cost;
    if (deckSize(state) < DECK_CAP) {
      state.drawPile.push(pick);
      shuffle(state.drawPile);
      state.log.push(`BOUGHT: ${pick.name} (-${cost})`);
    } else {
      state.destroyed.push(pick);
      state.log.push(`BOUGHT then DESTROYED (cap): ${pick.name} (-${cost})`);
    }
  } else {
    state.log.push(`Couldn't afford special card (need ${cost}).`);
  }

  // 3) Destroy to manage cap / improve odds
  const destroyCost = 5;
  if (state.coins >= destroyCost) {
    const removed = removeOneWeakestStd(state);
    if (removed) {
      state.coins -= destroyCost;
      state.log.push(`DESTROYED: ${rankName(removed.r)}${removed.s} (-${destroyCost})`);
    }
  }

  // 4) Optional: upgrade War Slots (rare)
  // MVP: small chance the shop offers it
  if (state.warSlots < WAR_SLOTS_CAP && Math.random() < 0.35 && state.coins >= 10) {
    state.coins -= 10;
    state.warSlots += 1;
    state.log.push(`UPGRADE: War Slots +1 (now ${state.warSlots}) (-10)`);
  }

  // 5) If above deck cap, force destroy until at cap (anti-abuse)
  while (deckSize(state) > DECK_CAP) {
    const removed = removeOneWeakestStd(state);
    if (!removed) break;
    state.log.push(`FORCED DESTROY (cap): ${rankName(removed.r)}${removed.s}`);
  }
}

// --------- Run ---------
function run(){
  const state = {
    ante: 1,
    coins: 0,
    warSlots: WAR_SLOTS_START,
    drawPile: makeStarterDeck(),
    discardPile: [],
    destroyed: [],
    lost: [],
    lootStash: [],
    log: [],
    battleIndex: 0,
  };

  state.log.push(`START RUN | Deck: ${deckSize(state)} cards | War Slots: ${state.warSlots}`);

  // MVP: 3 antes, 4 battles each. One loss ends run.
  for (let ante=1; ante<=3; ante++){
    state.ante = ante;
    state.log.push(`\n=== ANTE ${ante} ===`);

    for (let b=1; b<=4; b++){
      const r = playBattle(state);
      if (r.ended) {
        state.log.push(`Ended: ${r.reason}`);
        console.log(state.log.join("\n"));
        return;
      }

      if (r.pushed) {
        const reward = 2 + ante;
        state.coins += reward;
        state.log.push(`Battle ${b}: PUSH (tie avoided) | +${reward} coins (total ${state.coins})`);
      } else if (r.win) {
        const reward = 4 + ante + (r.war ? 2 : 0);
        state.coins += reward;
        const warTag = r.war ? ` WAR POT: you risked ${r.pot.playerCommitted} cards; captured loot x${r.lootGained.length}` : "";
        state.log.push(`Battle ${b}: WIN | You: ${r.labelReveal}(${r.pRank}) vs Opp: ${r.labelOpp}(${r.oRank}) | +${reward} coins (total ${state.coins})${warTag}`);
      } else {
        // One loss ends run, but now you ALSO lost committed cards if it was war.
        const lossLine = r.war
          ? `LOSE (WAR) | You lost ${r.cardsLost.length} of your own cards permanently.`
          : `LOSE | Run over.`;
        state.log.push(`Battle ${b}: ${lossLine}`);
        state.log.push(`War never changes.`);
        state.log.push(`Final deck size (remaining): ${deckSize(state)} | Destroyed: ${state.destroyed.length} | Lost: ${state.lost.length}`);
        console.log(state.log.join("\n"));
        return;
      }

      if (state.battleIndex % SHOP_EVERY_BATTLES === 0) shop(state);
    }
  }

  state.log.push(`\nCLEARED MVP RUN! Coins: ${state.coins} | Deck: ${deckSize(state)} | War Slots: ${state.warSlots}`);
  console.log(state.log.join("\n"));
}

run();
