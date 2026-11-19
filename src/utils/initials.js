// src/utils/initials.js
export function initials(name, max = 2) {
  return String(name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, max)
    .join('')
    .toUpperCase();
}