const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// Fix the bad fragment in MessageThread
content = content.replace('      </div>\n    </>\n    );\n  }', '      </div>\n    );\n  }');
content = content.replace('        <div ref={messagesEndRef} />\n      </div>\n    </>\n    );\n  }', '        <div ref={messagesEndRef} />\n      </div>\n    );\n  }');

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
