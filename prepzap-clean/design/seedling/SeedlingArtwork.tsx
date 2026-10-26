import { useId } from "react";
import type { MascotArtworkState } from "@/components/Mascot";
import "./seedling.css";

/** Hand-drawn vector draft. No raster, filters, gradients or external assets. */
export function SeedlingArtwork({ mood, blink, underShadow = false }: MascotArtworkState & { underShadow?: boolean }) {
  const prefix = `seedling-${useId().replace(/:/g, "")}`;
  const layer = (part: string) => ({ id: `${prefix}-${part}`, "data-layer": part });
  const pose = mood === "encouraging" ? "encourage" : mood === "cheering" ? "celebrate" : mood;
  const joyful = pose === "happy" || pose === "celebrate";
  return <svg className="seedling-art" viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false" data-pose={pose} data-blink={blink}>
    <g {...layer("shadow")} opacity={underShadow ? 0.5 : 0}><ellipse cx="200" cy="367" rx="96" ry="12" fill="#F3C0A0" /></g>
    <g data-layer="actor">
      <g {...layer("feet-left")}><path d="M139 332C126 344 126 360 140 365C153 369 172 361 173 347L166 331Z" fill="#F3C0A0" /></g>
      <g {...layer("feet-right")}><path d="M234 332L227 347C228 361 247 369 260 365C274 360 274 344 261 332Z" fill="#F3C0A0" /></g>
      <g data-layer="breath">
        <g {...layer("body-lower")}><path d="M84 270C82 323 120 352 200 352C280 352 318 323 316 270Z" fill="#F3C0A0" /></g>
        <g {...layer("arm-left")}><path d="M91 257C75 268 68 290 78 300C85 305 94 293 99 281Z" fill="#FCEBCB" /><path d="M78 283C74 292 77 300 81 301C86 303 91 297 92 292Z" fill="#F3C0A0" /></g>
        <g {...layer("arm-right")}><path d="M309 257C325 268 332 290 322 300C315 305 306 293 301 281Z" fill="#FCEBCB" /><path d="M322 283C326 292 323 300 319 301C314 303 309 297 308 292Z" fill="#F3C0A0" /></g>
        <g {...layer("body")}><path d="M200 135C131 135 87 181 86 239C85 265 92 274 86 286C78 313 128 331 200 331C272 331 322 313 314 286C308 274 315 265 314 239C313 181 269 135 200 135Z" fill="#FCEBCB" /></g>
        <g {...layer("sprout-stem")}><path d="M205 139Q209 120 220 108" stroke="#9BC464" strokeWidth="10" strokeLinecap="round" /></g>
        <g {...layer("tendril")}><path d="M209 138C184 139 171 125 178 109C185 93 207 96 209 109C211 121 195 127 191 117" stroke="#9BC464" strokeWidth="8" strokeLinecap="round" /></g>
        <g {...layer("leaf")}><path d="M212 118C220 77 249 55 277 61C302 66 321 84 325 101C306 86 302 112 276 119C252 127 234 112 212 118Z" fill="#9BC464" /></g>
        <g {...layer("blush-left")} opacity={joyful ? 1 : 0.82}><ellipse cx="147" cy="266" rx="18" ry="11" fill="#F9BFA9" /></g>
        <g {...layer("blush-right")} opacity={joyful ? 1 : 0.82}><ellipse cx="253" cy="266" rx="18" ry="11" fill="#F9BFA9" /></g>
        {(["left", "right"] as const).map((side, index) => <g key={side} {...layer(`eye-${side}`)}>
          <g data-eye="open" opacity={joyful ? 0 : 1}><ellipse cx={166 + index * 68} cy="243" rx="12" ry="21" fill="#232328" transform={`rotate(${index ? -5 : 9} ${166 + index * 68} 243)`} /></g>
          <g data-eye="happy" opacity={joyful ? 1 : 0}><path d={`M${155 + index * 68} 245Q${166 + index * 68} 227 ${177 + index * 68} 245`} stroke="#232328" strokeWidth="5" strokeLinecap="round" /></g>
          <g {...layer(`eyelid-${side}`)}><path d={`M${151 + index * 68} 229H${181 + index * 68}`} stroke="#FCEBCB" strokeWidth="25" /></g>
          <g data-eye="blink"><path d={`M${156 + index * 68} 245Q${166 + index * 68} 250 ${176 + index * 68} 245`} stroke="#232328" strokeWidth="3" strokeLinecap="round" /></g>
        </g>)}
        <g {...layer("mouth-states")} stroke="#232328" strokeWidth="2.5" strokeLinecap="round">
          <g data-mouth="smile"><path d="M190 269Q200 280 210 269" /></g>
          <g data-mouth="open"><path d="M188 267Q200 289 212 267Z" fill="#232328" stroke="none" /></g>
          <g data-mouth="flat"><path d="M194 274H206" /></g>
          <g data-mouth="sad"><path d="M190 277Q200 266 210 277" /></g>
        </g>
      </g>
    </g>
    <g data-layer="typing" fill="#9BC464"><circle cx="170" cy="385" r="4" /><circle cx="200" cy="385" r="4" /><circle cx="230" cy="385" r="4" /></g>
    <g data-layer="burst" fill="#9BC464"><path d="M75 130L78 139L87 142L78 145L75 154L72 145L63 142L72 139Z" /><path d="M324 185L327 194L336 197L327 200L324 209L321 200L312 197L321 194Z" /><circle cx="108" cy="92" r="4" /><circle cx="303" cy="145" r="4" /></g>
  </svg>;
}
