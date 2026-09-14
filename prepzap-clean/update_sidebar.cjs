const fs = require('fs');
let sidebar = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  '{ icon: "pets",           label: "Study Pet",      route: "/pet" },',
  '{ icon: "edit_document",  label: "Notes",          route: "/notes" },'
);
fs.writeFileSync('src/components/SharedSidebar.tsx', sidebar);
console.log("Updated SharedSidebar.tsx");
