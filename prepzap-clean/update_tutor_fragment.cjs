const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// Fix the bad fragment in MessageThread
content = content.replace('      </div>\n    </>\n    );\n  }', '      </div>\n    );\n  }');

// Add the missing fragment at the end of AITutor
content = content.replace('      </div>\n\n    </div>\n  );\n}', '      </div>\n\n    </div>\n    </>\n  );\n}');

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
