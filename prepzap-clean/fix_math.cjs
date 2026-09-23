const fs = require('fs');
let content = fs.readFileSync('src/pages/MathSolver.tsx', 'utf8');

const target = `{[-4, -3, -2, -1, 1, 2, 3, 4].map((n) => (
          <g key={\`xl\${n}\`}>
            <text x={cx + n * scale} y={cy + 14} textAnchor="middle" fontSize="9" fill="#888">{n}</text>
            <text x={cx - 14} y={cy - n * scale + 3} textAnchor="end" fontSize="9" fill="#888">{n}</text>
          </g>
        ))}`;

const replacement = `{[-4, -3, -2, -1, 1, 2, 3, 4].map((n) => (
          <g key={\`xl\${n}\`}>
            {/* X axis ticks and labels */}
            <line x1={cx + n * scale} y1={cy - 3} x2={cx + n * scale} y2={cy + 3} stroke="#000" strokeWidth="1" />
            <text x={cx + n * scale} y={cy + 15} textAnchor="middle" fontSize="10" fill="#888">{n}</text>
            {/* Y axis ticks and labels */}
            <line x1={cx - 3} y1={cy - n * scale} x2={cx + 3} y2={cy - n * scale} stroke="#000" strokeWidth="1" />
            <text x={cx - 8} y={cy - n * scale + 3} textAnchor="end" fontSize="10" fill="#888">{n}</text>
          </g>
        ))}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/MathSolver.tsx', content, 'utf8');
