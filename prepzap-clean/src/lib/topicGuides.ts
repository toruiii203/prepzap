import type { StudyObjectKind } from "@/components/onboarding/StudyObject";
export interface GuideChapter {
  id: string;
  title: string;
  idea: string;
  example: string;
  prompt: string;
  options: readonly string[];
  correct: number;
  why: string;
}
export interface TopicGuide {
  id: string;
  subject: string;
  title: string;
  summary: string;
  kind: StudyObjectKind;
  chapters: readonly GuideChapter[];
}
const chapter = (
  id: string,
  title: string,
  idea: string,
  example: string,
  prompt: string,
  options: readonly string[],
  correct: number,
  why: string,
): GuideChapter => ({
  id,
  title,
  idea,
  example,
  prompt,
  options,
  correct,
  why,
});
/** Authored starter lessons, not generated from a student's uploaded material. */
export const TOPIC_GUIDES: readonly TopicGuide[] = [
  {
    id: "integral-basics",
    subject: "Math",
    title: "Integral basics",
    summary: "From reversing a derivative to understanding signed area.",
    kind: "blocks",
    chapters: [
      chapter(
        "antiderivative",
        "Reverse the derivative",
        "An antiderivative of f is a function F whose derivative is f. Indefinite integration asks you to find that family of functions.",
        "The derivative of x^2 is 2x, so an antiderivative of 2x is x^2.",
        "Which function has derivative 2x?",
        ["x^2", "2x^2", "2"],
        0,
        "Differentiating x^2 gives 2x.",
      ),
      chapter(
        "power-rule",
        "Raise the power, then divide",
        "To integrate x^n, increase n by one and divide by the new power. This rule requires n not to equal -1.",
        "An integral of x^2 is x^3 / 3 + C. Differentiating it gives x^2 again.",
        "What is an indefinite integral of x^3?",
        ["3x^2 + C", "x^4 / 4 + C", "x^4 + C"],
        1,
        "Raise 3 to 4, divide by 4, and include C.",
      ),
      chapter(
        "constant",
        "Keep the whole family",
        "Constants disappear when differentiated. That means an indefinite integral needs + C to represent every possible constant.",
        "x^2 + 4 and x^2 - 9 both have derivative 2x. Write x^2 + C to include both.",
        "Why include + C?",
        [
          "Every integral is positive",
          "The constant is always zero",
          "Many functions have the same derivative",
        ],
        2,
        "Adding a constant changes the function but not its derivative.",
      ),
      chapter(
        "signed-area",
        "Separate area from net change",
        "A definite integral measures signed accumulation. Regions below the horizontal axis contribute negatively. Total geometric area counts both sides positively.",
        "A region of area 5 above the axis and area 2 below it has signed integral 3, but total area 7.",
        "What is the signed integral in the example?",
        ["7", "3", "-7"],
        1,
        "Signed accumulation is 5 - 2 = 3; total area is a different question.",
      ),
    ],
  },
  {
    id: "linear-equations",
    subject: "Math",
    title: "Linear equations",
    summary: "Keep both sides balanced and solve for the unknown.",
    kind: "blocks",
    chapters: [
      chapter(
        "balance",
        "An equation is a balance",
        "Both sides name the same quantity. Applying the same reversible operation to each side keeps the equality true.",
        "From x + 4 = 9, subtract 4 from both sides to get x = 5.",
        "What should you subtract from each side of x + 6 = 10?",
        ["6", "10", "x"],
        0,
        "Subtracting 6 isolates x and leaves x = 4.",
      ),
      chapter(
        "undo",
        "Undo operations in reverse order",
        "To isolate an unknown, undo addition or subtraction around it, then undo multiplication or division.",
        "For 3x + 2 = 14: subtract 2 to get 3x = 12, then divide by 3 to get x = 4.",
        "What is x in 2x + 3 = 11?",
        ["7", "4", "8"],
        1,
        "Subtract 3 to get 2x = 8, then divide by 2.",
      ),
      chapter(
        "verify",
        "Check in the original equation",
        "Substitute your answer into the starting equation. Both sides must agree, not just the last line of your working.",
        "If x = 4, then 3x + 2 = 3(4) + 2 = 14, so the original equation is satisfied.",
        "Which expression checks x = 3 in 2x + 1 = 7?",
        ["2 + 3 + 1", "2(3) + 1", "3(2 + 1)"],
        1,
        "Replace x with 3 while preserving the original operations.",
      ),
    ],
  },
  {
    id: "cell-essentials",
    subject: "Biology",
    title: "Cell essentials",
    summary: "Connect each cell structure to what it does.",
    kind: "cell",
    chapters: [
      chapter(
        "membrane",
        "A selective boundary",
        "The cell membrane separates the inside from the surroundings and helps control which substances enter and leave.",
        "Oxygen can pass through the lipid membrane; many charged particles need transport proteins.",
        "Which structure helps regulate entry and exit?",
        ["Cell membrane", "Ribosome", "DNA"],
        0,
        "The membrane acts as a selective boundary, rather than a completely closed wall.",
      ),
      chapter(
        "nucleus",
        "Store the instructions",
        "In a typical eukaryotic cell, the nucleus houses most of the DNA. DNA contains instructions used to make proteins.",
        "A muscle cell and a skin cell use different parts of their genetic instructions for different jobs.",
        "Where is most DNA in a typical eukaryotic cell?",
        ["Cell membrane", "Nucleus", "Cell surface"],
        1,
        "The nucleus contains most of a eukaryotic cell's DNA; organelles such as mitochondria also contain some.",
      ),
      chapter(
        "energy",
        "Make usable energy",
        "Mitochondria carry out much of aerobic cellular respiration. This produces ATP, a molecule cells use to transfer energy for work.",
        "A cell doing energy-intensive work often has many mitochondria.",
        "Which molecule transfers energy for many cell processes?",
        ["ATP", "A cell wall", "A chromosome"],
        0,
        "ATP is an energy-transfer molecule; a mitochondrion is the organelle that produces much of it aerobically.",
      ),
    ],
  },
  {
    id: "photosynthesis",
    subject: "Biology",
    title: "Photosynthesis",
    summary: "Follow matter and energy through a plant's food-making process.",
    kind: "science",
    chapters: [
      chapter(
        "inputs",
        "Start with the inputs",
        "Plants use light energy to make sugars from carbon dioxide and water. Energy enters as light; matter enters mainly as those raw materials.",
        "A leaf takes in carbon dioxide from the air, while roots supply water.",
        "Which gas supplies carbon for making sugars?",
        ["Oxygen", "Carbon dioxide", "Nitrogen"],
        1,
        "Carbon atoms from carbon dioxide become part of the sugars.",
      ),
      chapter(
        "chloroplast",
        "Find the workspace",
        "In plants and algae, photosynthesis takes place in chloroplasts. Chlorophyll absorbs light that powers the process.",
        "The green pigment in a leaf helps capture light energy; it does not create energy from nothing.",
        "Which structure carries out photosynthesis in plant cells?",
        ["Chloroplast", "Nucleus", "Ribosome"],
        0,
        "Chloroplasts contain the machinery and pigments for photosynthesis.",
      ),
      chapter(
        "outputs",
        "Follow the products",
        "Photosynthesis stores captured energy in organic molecules and releases oxygen. Plants also respire to use energy from sugars.",
        "A plant can photosynthesize in the light and carry out cellular respiration both day and night.",
        "Which statement is accurate?",
        [
          "Plants never respire",
          "Plants create energy",
          "Plants photosynthesize and respire",
        ],
        2,
        "Photosynthesis captures energy; respiration transfers energy from fuels into usable forms such as ATP.",
      ),
    ],
  },
  {
    id: "force-motion",
    subject: "Science",
    title: "Forces and motion",
    summary: "Reason about net force, acceleration and mass.",
    kind: "science",
    chapters: [
      chapter(
        "net-force",
        "Look at the combined force",
        "Forces have direction. Net force is the vector sum of all forces acting on an object.",
        "A 10 N push right and a 4 N push left combine to a net force of 6 N right.",
        "What is the net force in that example?",
        ["14 N right", "6 N right", "6 N left"],
        1,
        "Opposite forces subtract; the larger force sets the remaining direction.",
      ),
      chapter(
        "acceleration",
        "A net force changes velocity",
        "Newton's second law relates net force, mass and acceleration: F = ma for an object of constant mass.",
        "A net force of 12 N on a 3 kg object gives acceleration 12 / 3 = 4 m/s^2.",
        "What acceleration does 10 N produce on a 2 kg object?",
        ["5 m/s^2", "20 m/s^2", "0.2 m/s^2"],
        0,
        "Use a = F / m = 10 / 2 = 5.",
      ),
      chapter(
        "inertia",
        "Zero force does not mean zero motion",
        "Zero net force means zero acceleration, so velocity remains constant. That constant velocity may be zero or nonzero.",
        "An ideal puck with no net force can keep sliding at a steady speed in a straight line.",
        "With zero net force, what must remain constant?",
        ["Position", "Velocity", "Every individual force"],
        1,
        "Velocity stays constant because acceleration is zero.",
      ),
    ],
  },
  {
    id: "sentence-building",
    subject: "English",
    title: "Building a sentence",
    summary: "Find the subject, verb and complete thought.",
    kind: "book",
    chapters: [
      chapter(
        "subject",
        "Who or what is the sentence about?",
        "The subject is the person, thing or idea doing or being something in a clause.",
        "In 'The student reads quietly,' the student is the subject.",
        "What is the subject of 'The river flows quickly'?",
        ["Quickly", "Flows", "The river"],
        2,
        "The sentence tells us what the river does.",
      ),
      chapter(
        "verb",
        "Find the action or state",
        "A verb expresses an action, occurrence or state of being. A main clause needs a finite verb.",
        "In 'Maya is curious,' is is the verb. A verb does not have to describe physical movement.",
        "Which word is the verb in 'The room seems quiet'?",
        ["Room", "Seems", "Quiet"],
        1,
        "Seems expresses a state and links the subject to its description.",
      ),
      chapter(
        "clause",
        "Make a complete thought",
        "An independent clause can stand alone as a sentence. A dependent clause needs another clause to complete its meaning.",
        "'Because the train was late' leaves us waiting. 'We walked because the train was late' completes the thought.",
        "Which can stand alone as a complete sentence?",
        ["Although it was raining", "The class began", "Because I studied"],
        1,
        "The class began contains an independent clause with a complete thought.",
      ),
    ],
  },
  {
    id: "historical-sources",
    subject: "History",
    title: "Reading historical sources",
    summary: "Ask who made a source, when, and for what purpose.",
    kind: "globe",
    chapters: [
      chapter(
        "origin",
        "Start with the source's origin",
        "Identify its creator, date, place and form. These details help you judge what the source can tell you.",
        "A diary written during an event offers a different perspective from a textbook written decades later.",
        "Which question investigates a source's origin?",
        [
          "Who created it, and when?",
          "Do I like it?",
          "Is it the longest source?",
        ],
        0,
        "Authorship and date establish where the account comes from.",
      ),
      chapter(
        "purpose",
        "Consider audience and purpose",
        "A source may inform, persuade, justify or entertain. Its intended audience and purpose can influence what it includes or leaves out.",
        "A campaign poster aims to persuade voters, so examine its claims rather than treating it as a neutral summary.",
        "Why examine a source's intended audience?",
        [
          "Audience proves it is false",
          "Audience determines its age",
          "Audience can shape its message",
        ],
        2,
        "Creators adapt their message to what they want an audience to think or do.",
      ),
      chapter(
        "corroboration",
        "Compare independent evidence",
        "Corroboration means comparing sources to find where evidence agrees or conflicts. Agreement is stronger when sources are genuinely independent.",
        "Two reports copied from one witness are not the same as two independent witnesses.",
        "Which comparison offers stronger corroboration?",
        [
          "Two independent accounts",
          "Two copies of the same report",
          "One unverified claim",
        ],
        0,
        "Independent evidence can support a claim without merely repeating the same original account.",
      ),
    ],
  },
  {
    id: "loop-basics",
    subject: "Computing",
    title: "Loops and logic",
    summary: "Repeat instructions deliberately and avoid endless loops.",
    kind: "code",
    chapters: [
      chapter(
        "repeat",
        "Repeat a set of instructions",
        "A loop runs instructions more than once according to a condition or over a sequence of items.",
        "To greet every student in a list, repeat the greeting for each student instead of writing it repeatedly.",
        "What does a loop do?",
        [
          "Repeats instructions",
          "Always stops a program",
          "Deletes the instructions",
        ],
        0,
        "Loops express repetition without duplicating the same code by hand.",
      ),
      chapter(
        "condition",
        "Decide whether to keep going",
        "A condition is an expression that can be true or false. A while loop continues while its condition is true.",
        "While count is less than 3, show count and add 1. Starting at 0 produces 0, 1, 2.",
        "When does this loop stop?",
        ["When count is 1", "When count reaches 3", "It never stops"],
        1,
        "At 3, the condition count < 3 becomes false.",
      ),
      chapter(
        "termination",
        "Make progress toward stopping",
        "A loop may run forever if its condition never becomes false. Check its starting state and how each iteration changes that state.",
        "If count starts at 0 and never changes, while count < 3 remains true forever.",
        "What prevents the example's infinite loop?",
        [
          "Removing the condition",
          "Setting count back to 0 each time",
          "Increasing count toward 3",
        ],
        2,
        "Updating count allows it to reach a value that makes the condition false.",
      ),
    ],
  },
  {
    id: "recall-foundations",
    subject: "Study skills",
    title: "Active recall foundations",
    summary: "Turn a reading session into a useful memory check.",
    kind: "cards",
    chapters: [
      chapter(
        "retrieve",
        "Try remembering before checking",
        "Active recall means trying to retrieve an idea from memory. The attempt shows which parts you can explain without looking.",
        "Close your notes and explain one concept in your own words, then reopen the notes to check.",
        "Which action practices active recall?",
        [
          "Rereading the same paragraph",
          "Answering with the notes closed",
          "Highlighting every sentence",
        ],
        1,
        "Trying to answer from memory exercises retrieval; looking afterward provides feedback.",
      ),
      chapter(
        "feedback",
        "Use the gap as information",
        "When an answer is incomplete, identify the missing idea, correct it, and try again. A mistake is information for the next attempt.",
        "If you confuse a cell membrane with a cell wall, compare their roles and then explain the difference again.",
        "What is a useful next step after an incorrect answer?",
        [
          "Hide the answer forever",
          "Assume you cannot learn it",
          "Find the gap, correct it and retry",
        ],
        2,
        "Specific feedback makes the next retrieval attempt more useful.",
      ),
      chapter(
        "space",
        "Return to the idea later",
        "Spacing spreads practice over time instead of putting every repetition into one sitting. A later retrieval attempt reveals what remains accessible.",
        "Review an idea today, try recalling it tomorrow, and return to it again as needed.",
        "Which is an example of spaced practice?",
        [
          "Revisit the idea on different days",
          "Read it ten times without a break",
          "Never revisit it",
        ],
        0,
        "Spacing separates practice sessions so retrieval happens after a gap.",
      ),
    ],
  },
];
export const GUIDE_SUBJECTS = [
  "Math",
  "Biology",
  "Science",
  "English",
  "History",
  "Computing",
  "Study skills",
] as const;
export function guideSubject(subject: string): string {
  const value = subject.toLowerCase();
  if (/math|calculus|algebra/.test(value)) return "Math";
  if (/biology|bio\b/.test(value)) return "Biology";
  if (/computer|computing|programming/.test(value)) return "Computing";
  return (
    GUIDE_SUBJECTS.find((item) => item.toLowerCase() === value) ||
    "Study skills"
  );
}
