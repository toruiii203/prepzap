const fs = require('fs');
let code = fs.readFileSync('src/pages/UsePro.tsx', 'utf8');

code = code.replace(
  'src="https://lh3.googleusercontent.com/aida-public/AB6AXuBI2f_uyC4HYrklceINtsGasmZVALcqCgkTwdsNpE9LycFvywKAYKC0hyrn0hwxDZKshun9yfnwrNeWahC4kn_xau7vC71Zg5iKl7E_MR2kdN31NEAg40yP9nq1pUn8NOMCOYtZVg4bgijv6FAkfz64GJx-GBIR_bs1UO_PDQ96iZHYNKhr-UC6n2ngcpmTtaVactHIb6TBVRaBkkySX3wkgImatWyUFiwJ07uOmq8bYgNT8cgjOr83A74oRxH73IENCOxQpc2vKMcx"',
  'src="/fox_icon_final.png"'
);

fs.writeFileSync('src/pages/UsePro.tsx', code);
