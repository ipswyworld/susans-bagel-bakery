// Where the FastAPI backend lives. Empty string = storefront runs from menu.json only (orders still work).
// Set PRODUCTION_API to your deployed API URL (e.g. "https://your-api.onrender.com") once it exists.
const PRODUCTION_API = "https://susans-bagel-api.onrender.com";
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
window.BAGEL_CONFIG = {
  API_URL: isLocal ? "http://localhost:8710" : PRODUCTION_API,
};
