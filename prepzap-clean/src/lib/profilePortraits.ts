import type { PresetAvatar } from "@/lib/userProfileStore";
/** Original, local SVG portraits. Existing saved avatar URLs are never migrated. */
export const PROFILE_PORTRAITS: readonly PresetAvatar[] = [
  {id:"seedling",name:"Seedling",category:"character",src:"/avatars/seedling.svg",isImage:true},
  {id:"sunny-side",name:"Sunny side",category:"character",src:"/avatars/sunny-side.svg",isImage:true},
  {id:"moonlit",name:"Moonlit",category:"character",src:"/avatars/moonlit.svg",isImage:true},
  {id:"page-pal",name:"Page pal",category:"character",src:"/avatars/page-pal.svg",isImage:true},
  {id:"orbit",name:"Orbit",category:"character",src:"/avatars/orbit.svg",isImage:true},
  {id:"bright-idea",name:"Bright idea",category:"character",src:"/avatars/bright-idea.svg",isImage:true},
  {id:"cloud-nine",name:"Cloud nine",category:"character",src:"/avatars/cloud-nine.svg",isImage:true},
  {id:"paper-flight",name:"Paper flight",category:"character",src:"/avatars/paper-flight.svg",isImage:true},
];
