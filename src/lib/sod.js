// Separation of Duties (SOD) helpers — prevent a user from acting on their own requests

export function isOwnRequest(journey, userId) {
  if (!journey || !userId) return false;
  return journey.requester_id === userId || journey.created_by_id === userId;
}

// Returns a Set of journey IDs that belong to the given user
export function getOwnJourneyIds(journeys, userId) {
  return new Set(
    (journeys || []).filter(j => isOwnRequest(j, userId)).map(j => j.id)
  );
}