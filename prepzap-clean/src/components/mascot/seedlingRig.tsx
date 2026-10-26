import type { MascotArtwork } from "@/components/Mascot";
import { motionTokens } from "@/lib/motionTokens";
import { SeedlingArtwork } from "./SeedlingArtwork";

/** Approved option A: reference colors, no ground shadow. Import at the point of use. */
export const seedlingArtwork: MascotArtwork = {
  render: state => <SeedlingArtwork {...state} />,
  aspectRatio: "1 / 1",
  blinkInterval: motionTokens.seedlingBlink,
};
