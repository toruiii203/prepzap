const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// The file ends with:
//     </div>
//   );
// }
// </div>

content = content.replace(
`    </div>
  );
}
</div>`, 
`    </div>
    </div>
  );
}`
);

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
