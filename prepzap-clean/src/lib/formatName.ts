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
