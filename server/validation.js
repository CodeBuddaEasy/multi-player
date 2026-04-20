const { COSMETIC_OPTIONS, GAME, KEY_ALIASES } = require("../shared/constants");

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 16);
}

function normalizeActionKey(key) {
  if (typeof key !== "string") return "";
  return KEY_ALIASES[key] || key;
}

function isValidSignal(key) {
  return GAME.SIGNALS.includes(key);
}

function validateCosmetics(input = {}) {
  const safe = {
    hatColor: COSMETIC_OPTIONS.hatColor[0],
    footwear: COSMETIC_OPTIONS.footwear[0],
    badge: COSMETIC_OPTIONS.badge[3],
    codingAffinity: COSMETIC_OPTIONS.codingAffinity[0],
  };

  if (COSMETIC_OPTIONS.hatColor.includes(input.hatColor)) safe.hatColor = input.hatColor;
  if (COSMETIC_OPTIONS.footwear.includes(input.footwear)) safe.footwear = input.footwear;
  if (COSMETIC_OPTIONS.badge.includes(input.badge)) safe.badge = input.badge;
  if (COSMETIC_OPTIONS.codingAffinity.includes(input.codingAffinity)) safe.codingAffinity = input.codingAffinity;
  return safe;
}

module.exports = {
  normalizeName,
  normalizeActionKey,
  isValidSignal,
  validateCosmetics,
};
