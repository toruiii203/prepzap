/**
 * Formats user names into friendly, natural display names.
 * Handles "LASTNAME, FIRSTNAME MIDDLE" formats from OAuth / institution profiles,
 * cleans up ALL-CAPS names, and extracts the primary first name.
 * 
 * Example: "TRINIDAD, MIGUEL ALFONSO" -> "Miguel"
 * Example: "trinidad, miguel" -> "Miguel"
 * Example: "Miguel Trinidad" -> "Miguel"
 * Example: "miguel" -> "Miguel"
 */
export function formatFriendlyName(rawName?: string | null): string {
  if (!rawName) return "Scholar";
  let clean = rawName.trim();

  // If in "LastName, FirstName Middle" format
  if (clean.includes(",")) {
    const parts = clean.split(",");
    if (parts.length > 1 && parts[1].trim()) {
      clean = parts[1].trim(); // "MIGUEL ALFONSO"
    }
  }

  // Extract first word (the given name)
  const firstWord = clean.split(/\s+/)[0];
  if (!firstWord) return "Scholar";

  // Title-case the name (e.g. "MIGUEL" -> "Miguel")
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

/**
 * Returns a natural greeting based on local client time.
 */
export function getLocalGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Returns a clean, pleasant handle without double underscores or raw institutional formatting.
 * Example: "@trinidad__miguel_alfonso" with rawName "TRINIDAD, MIGUEL ALFONSO" -> "@miguel"
 */
export function formatCleanHandle(rawHandle?: string | null, rawName?: string | null): string {
  const friendly = formatFriendlyName(rawName);
  
  if (!rawHandle || rawHandle === "@student" || rawHandle === "@scholar" || rawHandle === "@student_scholar") {
    return friendly && friendly !== "Scholar" ? `@${friendly.toLowerCase()}` : "@scholar";
  }

  let clean = rawHandle.trim().replace(/^@/, "");

  // If the handle was generated from a raw "LAST, FIRST" name, it often has double underscores
  // or contains both the surname and given name. Simplify to given name.
  if (clean.includes("__") || (friendly && friendly !== "Scholar" && clean.toLowerCase().includes(friendly.toLowerCase()))) {
    if (friendly && friendly !== "Scholar") {
      return `@${friendly.toLowerCase()}`;
    }
  }

  // Collapse consecutive underscores and strip edge underscores
  clean = clean.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  if (!clean) return friendly && friendly !== "Scholar" ? `@${friendly.toLowerCase()}` : "@scholar";
  return `@${clean}`;
}
