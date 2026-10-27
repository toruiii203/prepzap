import type { StudyObjectKind } from "./StudyObject";
import type { MascotMovement } from "@/lib/mascotMovement";
export type StoryScene = "welcome" | "subject" | "response" | "goal" | "goal-response" | "question" | "feedback" | "save" | "arrival";
export type SubjectName = "Math" | "Science" | "English" | "Biology" | "History" | "Computing";
export type Surface = "paper" | "yellow" | "leaf" | "forest";
export interface SubjectStory { kind: StudyObjectKind; surface: Surface; headline: string; support: string; signature: MascotMovement; question: string; options: readonly string[]; correct: number; why: string; }
export const subjectStories: Record<SubjectName, SubjectStory> = {
  Math: { kind:"blocks",surface:"yellow",headline:"Math? One step at a time.",support:"We'll start with one question.",signature:"spin",question:"What is 6 × 7?",options:["36","42","48"],correct:1,why:"Six groups of seven make 42." },
  Science: { kind:"science",surface:"leaf",headline:"Science? Let's find out why.",support:"Curiosity is the whole method.",signature:"twirl-jump",question:"Which gas do plants take in for photosynthesis?",options:["Oxygen","Carbon dioxide","Nitrogen"],correct:1,why:"Plants use carbon dioxide and water to make sugars during photosynthesis." },
  English: { kind:"book",surface:"forest",headline:"English? Words are fun.",support:"We'll start with one sentence.",signature:"curious",question:"Which word is a noun?",options:["Run","Quickly","Garden"],correct:2,why:"Garden names a place or thing, so it is a noun." },
  Biology: { kind:"cell",surface:"yellow",headline:"Biology? Let's look closer.",support:"Small things, big stories.",signature:"spin",question:"Which part of a cell makes most of its energy?",options:["Nucleus","Mitochondria","Membrane"],correct:1,why:"Mitochondria produce most of a eukaryotic cell's ATP, its usable energy." },
  History: { kind:"globe",surface:"leaf",headline:"History? Great stories ahead.",support:"We'll take it one era at a time.",signature:"curious",question:"Which civilization built the pyramids at Giza?",options:["Romans","Egyptians","Greeks"],correct:1,why:"The ancient Egyptians built the pyramids at Giza as royal tombs." },
  Computing: { kind:"code",surface:"paper",headline:"Computing? Let's build logic.",support:"Step by step, like code.",signature:"dance",question:"What does a loop do?",options:["Stops a program","Repeats instructions","Deletes code"],correct:1,why:"A loop repeats a set of instructions while its condition applies." },
};
export const customStory: SubjectStory = {kind:"book",surface:"paper",headline:"That sounds interesting.",support:"Let's see what we can do with it.",signature:"wave",question:"Which helps you remember longer?",options:["Reading it once","Trying to recall it","Highlighting"],correct:1,why:"Trying to retrieve an idea from memory gives you practice remembering it."};
export const subjectNames = Object.keys(subjectStories) as SubjectName[];
export const bigMovements: readonly MascotMovement[] = ["spin","twirl-jump","dance","cheer"];
/** Big gestures never repeat on successive reaction scenes. Quiet gestures remain quiet. */
export function signatureFor(desired: MascotMovement, previous?: MascotMovement): MascotMovement {
  return bigMovements.includes(desired) && desired === previous ? desired === "cheer" ? "spin" : "cheer" : desired;
}
export function reactionSequence(scene: StoryScene, subject: SubjectStory, outcome: "correct" | "incorrect" | "skipped", previous?: MascotMovement): MascotMovement[] {
  if (scene === "response") return ["peek-in", ...(bigMovements.includes(subject.signature) ? ["curious" as const] : []), signatureFor(subject.signature, previous)];
  if (scene === "goal-response") return ["peek-in", "bow", "wave"];
  if (scene === "feedback") return outcome === "correct" ? ["peek-in", signatureFor("twirl-jump", previous)] : outcome === "incorrect" ? ["peek-in", "somersault-lite", "curious"] : ["peek-in", "curious"];
  if (scene === "save") return ["peek-in", "bow", "wave"];
  if (scene === "arrival") return ["peek-in", signatureFor("spin", previous), "wave"];
  return [];
}

export const goalStories = [
  { label: "Catch up on class", headline: "Catching up works.", support: "We'll go at your pace.", kind: "book" },
  { label: "Prep for a test", headline: "Test coming?", support: "We'll make it count.", kind: "cards" },
  { label: "Just exploring", headline: "Exploring is a great start.", support: "", kind: "globe" },
] as const;
