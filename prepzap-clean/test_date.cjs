// Let's test the date parsing logic
const created_at = "2026-09-23T18:14:54.000Z";
const dStr = created_at.split("T")[0];

const dateObj = new Date(created_at);
const localStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');

console.log("UTC String:", dStr);
console.log("Local String:", localStr);
