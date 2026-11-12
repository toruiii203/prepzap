// Mirror the nested Cloudflare Pages project structure without duplicating
// security-sensitive PayPal code. Both Pages deployment roots use this handler.
export { onRequestPost } from "../../prepzap-clean/functions/api/paypal-sandbox";
