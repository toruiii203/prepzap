export interface Buddy {
  id: string
  name: string
  role: string
  emoji: string
  imagePath: string
}

const ASSET_BASE = "/buddies/"

export const buddies: Buddy[] = [
  { id: "bear_mechanic", name: "Bolt", role: "Mechanic", emoji: "🐻", imagePath: `${ASSET_BASE}bear_mechanic.png` },
  { id: "cat_chef", name: "Cleo", role: "Chef", emoji: "🐱", imagePath: `${ASSET_BASE}cat_chef.png` },
  { id: "cow_athlete", name: "Champ", role: "Athlete", emoji: "🐮", imagePath: `${ASSET_BASE}cow_athlete.png` },
  { id: "deer_businessman", name: "Alden", role: "Business", emoji: "🦌", imagePath: `${ASSET_BASE}deer_businessman.png` },
  { id: "fox_scholar", name: "Finn", role: "Scholar", emoji: "🦊", imagePath: `${ASSET_BASE}fox_scholar.png` },
  { id: "frog_scientist", name: "Dr. Ribbit", role: "Scientist", emoji: "🐸", imagePath: `${ASSET_BASE}frog_scientist.png` },
  { id: "hedgehog_journalist", name: "Quill", role: "Journalist", emoji: "🦔", imagePath: `${ASSET_BASE}hedgehog_journalist.png` },
  { id: "owl_artist", name: "Iris", role: "Artist", emoji: "🦉", imagePath: `${ASSET_BASE}owl_artist.png` },
  { id: "koala_developer", name: "Kode", role: "Developer", emoji: "🐨", imagePath: `${ASSET_BASE}koala_developer.png` },
  { id: "wolf_astronaut", name: "Nova", role: "Astronaut", emoji: "🐺", imagePath: `${ASSET_BASE}wolf_astronaut.png` },
  { id: "rabbit_doctor", name: "Mila", role: "Doctor", emoji: "🐰", imagePath: `${ASSET_BASE}rabbit_doctor.png` },
]
