// Let's test the formatDuration function logic
const formatDuration = (mins) => {
  if (!mins || mins <= 0) return "0m";
  if (mins < 1) return "<1m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
};

console.log("TESTING ARCADE SESSION (0.33 mins)");
console.log("Input: 0.33 mins -> Output:", formatDuration(0.33));
console.log("Input: 0.8 mins -> Output:", formatDuration(0.8));
console.log("Input: 1.5 mins -> Output:", formatDuration(1.5));
console.log("Input: 65 mins -> Output:", formatDuration(65));
console.log("Input: 0 mins -> Output:", formatDuration(0));
