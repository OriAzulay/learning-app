import { BACKEND_TOPICS, BACKEND_BANK } from "./backendBank.js";
import { backendTemplates } from "./backendTemplates.js";
import { CPP_TOPICS, CPP_BANK } from "./cppBank.js";
import { parseBank } from "./bankParser.js";

// The roles (learning tracks). To add a role: write a topics object and a bank
// file, add an entry here, and run `npm run seed`.
export const ROLES = [
  {
    id: "backend",
    label: "Backend",
    topics: BACKEND_TOPICS,
    questions: () => parseBank(BACKEND_BANK).concat(backendTemplates()),
  },
  {
    id: "cpp",
    label: "Basic C++‎",
    topics: CPP_TOPICS,
    questions: () => parseBank(CPP_BANK, "¦"),
  },
];

// Values that used to be hardcoded in the page.
export const DEFAULT_SETTINGS = { user_name: "אורי", role: "backend" };
