const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// The desktop header looks like:
// <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
//   <div className="flex items-end gap-4">
//     <button ...>... arrow_back</span>Dashboard</button>
//     <div><h1...

const startStr = '<header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">\n        <div className="flex items-end gap-4">\n          <button\n            onClick={() => navigate("/dashboard")}';

if (content.includes(startStr)) {
    const endStr = 'Dashboard\n          </button>\n          <div>\n            <h1';
    const startIndex = content.indexOf(startStr);
    const endIndex = content.indexOf(endStr) + endStr.length - '          <div>\n            <h1'.length;
    
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    content = before + '<header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">\n        <div className="flex items-end gap-4">\n          <div>\n            <h1' + after;
}

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
console.log("Updated Arena layout properly");
