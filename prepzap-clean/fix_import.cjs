const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!content.includes('useMemo')) {
  // It shouldn't happen since I used useMemo, but just in case
}
content = content.replace('import React, { useState, useEffect, useRef } from "react";', 'import React, { useState, useEffect, useRef, useMemo } from "react";');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
