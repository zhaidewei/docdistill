import type { Card, Graph } from "./types";

const PREFIX = "swipe:";
const isBrowser = typeof localStorage !== "undefined";

export type SwipeStatus = "unseen" | "mastered" | "review";

interface SwipeRecord {
  status: SwipeStatus;
  lastSeen: number; // timestamp
}

export function getSwipeStatus(cardId: string): SwipeRecord {
  if (!isBrowser) return { status: "unseen", lastSeen: 0 };
  const raw = localStorage.getItem(PREFIX + cardId);
  if (!raw) return { status: "unseen", lastSeen: 0 };
  return JSON.parse(raw);
}

export function setSwipeStatus(cardId: string, status: SwipeStatus) {
  if (!isBrowser) return;
  const record: SwipeRecord = { status, lastSeen: Date.now() };
  localStorage.setItem(PREFIX + cardId, JSON.stringify(record));
}

export function getSwipeStats(cards: Card[]): { unseen: number; review: number; mastered: number } {
  const stats = { unseen: 0, review: 0, mastered: 0 };
  for (const card of cards) {
    const { status } = getSwipeStatus(card.id);
    stats[status]++;
  }
  return stats;
}

/**
 * Pick the next card to show.
 * Priority: unseen > review (oldest first).
 * Within each group, prefer cards related to lastCardId (via graph edges).
 */
export function pickNextCard(
  cards: Card[],
  graph: Graph,
  lastCardId: string | null,
  excludeId?: string
): Card | null {
  // Split cards by status
  const unseen: { card: Card; lastSeen: number }[] = [];
  const review: { card: Card; lastSeen: number }[] = [];

  for (const card of cards) {
    if (card.id === excludeId) continue;
    const rec = getSwipeStatus(card.id);
    if (rec.status === "unseen") unseen.push({ card, lastSeen: rec.lastSeen });
    else if (rec.status === "review") review.push({ card, lastSeen: rec.lastSeen });
    // mastered cards are skipped
  }

  // Find related card IDs from graph
  const relatedIds = new Set<string>();
  if (lastCardId) {
    for (const edge of graph.edges) {
      if (edge.from === lastCardId) relatedIds.add(edge.to);
      if (edge.to === lastCardId) relatedIds.add(edge.from);
    }
  }

  // Sort: related first, then by lastSeen (oldest first for review)
  function sortWithRelated(items: { card: Card; lastSeen: number }[]) {
    return items.sort((a, b) => {
      const aRel = relatedIds.has(a.card.id) ? 0 : 1;
      const bRel = relatedIds.has(b.card.id) ? 0 : 1;
      if (aRel !== bRel) return aRel - bRel;
      return a.lastSeen - b.lastSeen;
    });
  }

  // Try unseen first
  if (unseen.length > 0) {
    return sortWithRelated(unseen)[0].card;
  }

  // Then review
  if (review.length > 0) {
    return sortWithRelated(review)[0].card;
  }

  return null; // all mastered
}
