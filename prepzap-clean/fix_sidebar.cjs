const fs = require('fs');
let content = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

const regex = /const ROUTE_TO_TOOL_NAME: Record<string, string> = Object\.fromEntries\(\s*NAV_SECTIONS\.flatMap\(\(section\) => section\.items\)\.map\(\(item\) => \[item\.route, item\.label\]\)\s*\);/;

const replacement = `const ROUTE_TO_TOOL_NAME: Record<string, string> = Object.fromEntries(
  NAV_SECTIONS.flatMap((section) => section.items).map((item) => [item.route, item.label])
);
// DO NOT log time for non-study tools just because they are in the nav.
delete ROUTE_TO_TOOL_NAME["/dashboard"];
delete ROUTE_TO_TOOL_NAME["/sources"];
delete ROUTE_TO_TOOL_NAME["/analytics"];
delete ROUTE_TO_TOOL_NAME["/planner"];`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/SharedSidebar.tsx', content, 'utf8');
