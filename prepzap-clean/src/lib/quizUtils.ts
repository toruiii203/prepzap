
export interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export function isAnswerCorrect(q: Question, userAnsLetter: string): boolean {
  if (!userAnsLetter) return false;
  
  // 1. Direct match ("A" == "A")
  if (q.correct_answer.trim().toUpperCase() === userAnsLetter) return true;
  
  // 2. Prefix match ("A. Something" starts with "A.")
  if (q.correct_answer.trim().toUpperCase().startsWith(userAnsLetter + ".") || 
      q.correct_answer.trim().toUpperCase().startsWith(userAnsLetter + ")")) {
    return true;
  }

  // 3. Option value match (AI returned the text instead of the letter)
  const optionLetters = ["A", "B", "C", "D"];
  const userAnsIndex = optionLetters.indexOf(userAnsLetter.toUpperCase());
  
  if (userAnsIndex >= 0 && userAnsIndex < q.options.length) {
    const selectedOptionText = q.options[userAnsIndex];
    if (selectedOptionText.trim() === q.correct_answer.trim()) return true;
    
    // Clean "A. text" to "text"
    const cleanOpt = selectedOptionText.replace(/^[A-D][\.\)]\s*/i, "").trim().toLowerCase();
    const cleanCorrect = q.correct_answer.replace(/^[A-D][\.\)]\s*/i, "").trim().toLowerCase();
    if (cleanOpt === cleanCorrect) return true;
  }
  
  return false;
}
