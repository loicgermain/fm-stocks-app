// battery-sim.js — simulation ANALYTIQUE de la conso batterie de FM Stocks
// sur une journée de fête. Ce n'est PAS une mesure physique (pas de vraie
// batterie/radio ici) : c'est un modèle qui chiffre les postes de conso
// (réveils radio, écran, CPU) pour comparer AVANT / APRÈS optimisation.
//
// Lancer :  node tools/battery-sim.js
// Toutes les constantes sont ajustables ci-dessous.

// ───────────── Profil de journée (paramètres fournis) ─────────────
const DAY = {
  startPct: 100,           // 7h30 = 100 %
  firstUse: "9h30",        // pas d'ouverture avant (inventaires avant fête)
  endHour:  "3h00",        // fin de journée
  usageHours: 17.5,        // 9h30 → 3h00
  peakHours: 6,            // "heures pleines"
  // le reste en "heures creuses" :
  get offpeakHours() { return this.usageHours - this.peakHours; }, // 11.5
  actPerHourPeak:    10,   // activations / h en heures pleines
  actPerHourOffpeak: 5,    // activations / h en heures creuses
};

// ───────────── Hypothèses matérielles (modifiables) ─────────────
const HW = {
  batteryWh: 15.4,         // ~4000 mAh @ 3.85 V (smartphone milieu de gamme)
  standbyPctPerHour: 0.7,  // décharge de fond du tél (écran éteint), hors app
  sessionSec: 40,          // durée moyenne d'une activation (consultation/tap)
  screenW: 0.6,            // puissance écran allumé (lumineux, extérieur)
  cpuW: 0.3,               // pic CPU au rendu
  radioW: 0.9,             // puissance radio active (réveil + traîne)
  keepaliveSec: 45,        // intervalle keepalive WebSocket Firebase
  keepaliveWakeSec: 6,     // durée effective d'un réveil radio keepalive
  reconnectSec: 8,         // burst radio à la reconnexion + resync
  dbEventsPerHourPeak: 60, // mises à jour DB reçues / h (pleines)
  dbEventsPerHourOff: 20,  // idem (creuses)
  dbEventCpuSec: 1.5,      // rendu déclenché par un event reçu
  dbEventRadioSec: 2,      // réception radio d'un event
};

const J_PER_WH = 3600;
const toWh = j => j / J_PER_WH;
const pct  = wh => (wh / HW.batteryWh) * 100;

const totalActivations =
  DAY.peakHours * DAY.actPerHourPeak +
  DAY.offpeakHours * DAY.actPerHourOffpeak;

// ───────────── Énergie d'une activation (1er plan) ─────────────
// Identique avant/après : écran + CPU + 1 reconnexion/keepalive.
function energyPerActivationJ() {
  const screen = HW.screenW * HW.sessionSec;
  const cpu    = HW.cpuW * 3;                         // ~3 s de rendu
  const radio  = HW.radioW * (HW.reconnectSec + HW.keepaliveWakeSec);
  return screen + cpu + radio;
}
const foregroundWh = toWh(energyPerActivationJ() * totalActivations);

// ───────────── Conso en arrière-plan (le cœur de l'optim) ─────────────
// AVANT : socket maintenue toute la fenêtre d'usage → keepalives + réception
//         de TOUTES les mises à jour DB, même téléphone en poche.
// APRÈS : goOffline en arrière-plan → ~0 réseau hors activations.
function backgroundBeforeWh() {
  const connectedSec = DAY.usageHours * 3600;
  const keepalives = connectedSec / HW.keepaliveSec;
  const keepaliveJ = keepalives * HW.radioW * HW.keepaliveWakeSec;
  const dbEvents = DAY.peakHours * HW.dbEventsPerHourPeak +
                   DAY.offpeakHours * HW.dbEventsPerHourOff;
  const dbJ = dbEvents * (HW.cpuW * HW.dbEventCpuSec + HW.radioW * HW.dbEventRadioSec);
  return { wh: toWh(keepaliveJ + dbJ), keepalives: Math.round(keepalives), dbEvents };
}
const bgBefore = backgroundBeforeWh();
const bgAfterWh = 0; // déconnecté en arrière-plan

// ───────────── Réveils radio (indicateur clé) ─────────────
const radioWakesBefore = bgBefore.keepalives + bgBefore.dbEvents + totalActivations;
const radioWakesAfter  = totalActivations; // 1 reconnexion par activation

// ───────────── Standby téléphone (identique, pour le total) ─────────────
const standbyPct = HW.standbyPctPerHour * 19.5; // 7h30 → 3h00

// ───────────── Résultats ─────────────
const appBeforeWh = foregroundWh + bgBefore.wh;
const appAfterWh  = foregroundWh + bgAfterWh;

const endBefore = DAY.startPct - standbyPct - pct(appBeforeWh);
const endAfter  = DAY.startPct - standbyPct - pct(appAfterWh);

const f = n => n.toFixed(1);
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  FM Stocks — simulation conso batterie (modèle analytique)     ║
╚══════════════════════════════════════════════════════════════╝

Profil : 7h30 (100%) · 1ʳᵉ ouverture 9h30 · fin 3h00
Usage  : ${DAY.usageHours} h  (${DAY.peakHours} h pleines + ${DAY.offpeakHours} h creuses)
Activations : ${DAY.peakHours}×${DAY.actPerHourPeak} (pleines) + ${DAY.offpeakHours}×${DAY.actPerHourOffpeak} (creuses)
              = ${totalActivations} ouvertures sur la journée

────────────────────────────────────────────────────────────────
RÉVEILS RADIO (le poste dominant en veille)
  Avant : ${radioWakesBefore}   (keepalive ${bgBefore.keepalives} + events ${bgBefore.dbEvents} + ${totalActivations} ouvertures)
  Après : ${radioWakesAfter}    (1 reconnexion par ouverture)
  → réduction : ${f((1 - radioWakesAfter / radioWakesBefore) * 100)} %

────────────────────────────────────────────────────────────────
CONSO ATTRIBUABLE À L'APP
  1ᵉʳ plan (identique)        : ${f(pct(foregroundWh))} %  (${f(foregroundWh)} Wh)
  Arrière-plan AVANT          : ${f(pct(bgBefore.wh))} %  (${f(bgBefore.wh)} Wh)
  Arrière-plan APRÈS          : 0.0 %
  ─────────────────────────────────────────
  Total app AVANT             : ${f(pct(appBeforeWh))} %
  Total app APRÈS             : ${f(pct(appAfterWh))} %
  → économie app              : ${f(pct(appBeforeWh - appAfterWh))} points (${f((1 - appAfterWh / appBeforeWh) * 100)} %)

────────────────────────────────────────────────────────────────
BATTERIE EN FIN DE JOURNÉE (app + standby tél ${f(standbyPct)} %)
  Avant optimisation : ~${f(endBefore)} %  restants
  Après optimisation : ~${f(endAfter)} %  restants
  → ${f(endAfter - endBefore)} points de batterie gagnés

⚠️  Estimation, pas une mesure. L'écran allumé domine quand il l'est,
   et l'app n'y peut rien. La valeur sûre est le COMPARATIF.
`);
