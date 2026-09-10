// Simple controlled scoring for matching a set of detected needs to verified churches.
const CAPABILITY_BY_TYPE = {
  transportation: "supports_transportation",
  food: "supports_food",
  resources: "supports_resource_sharing",
  building: "supports_resource_sharing",
  church_planting: "supports_church_planting",
  fundraising: "supports_church_planting",
  disaster: "supports_disaster_response",
};

export function matchChurches(needTypes, churches) {
  const verified = churches.filter((c) => c.verification_status === "verified");
  const scored = verified.map((church) => {
    let score = 1; // base score for being verified
    needTypes.forEach((type) => {
      const cap = CAPABILITY_BY_TYPE[type];
      if (cap && church[cap]) score += 2;
      if (type === "church_connection") score += 1.5;
      if (type === "prayer") score += 1;
    });
    const maxPossible = 1 + needTypes.length * 2;
    const percent = Math.min(99, Math.round((score / maxPossible) * 100));
    return { church, percent };
  });
  return scored.sort((a, b) => b.percent - a.percent).slice(0, 3);
}