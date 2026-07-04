/* Onboarding proto — shared fake data + persona config. Throwaway by design. */
window.OB = {
  personas: [
    ["rich", "Rich profile (Sr AI PM)"],
    ["explore", "Arriving from Explore"],
    ["thin", "Thin input"],
    ["junk", "Junk input"],
    ["weak", "Weak match pool"],
    ["ret-anon", "Returning visitor (anon)"],
    ["ret-empty", "Signed in, no data yet"]
  ],
  screens: [
    ["index", "1 arrive"],
    ["working", "2 working"],
    ["results", "3+4 read & jobs"],
    ["save", "5 save"],
    ["login", "6 sign in"],
    ["feed", "7 feed"]
  ],
  mirror: [
    "Senior product manager, 8 years — strongest when you build something from zero.",
    "Your AI work is your headline: an LLM assistant that cut response time 40%. You undersell it.",
    "You've led ML products end to end — eval frameworks, working directly with engineers.",
    "Based in SF, open to hybrid."
  ],
  guess: "My guess: you want a senior AI product job, SF or hybrid, at a company past the science-project stage.",
  guessChips: ["Staff level, not senior", "Remote only", "Different field — tell her", "Comp matters most"],
  insightBold:
    "Worth knowing: jobs like yours are paying around $250k — more than most people in your spot ask for. I compared 12 similar postings; it's an estimate, not a promise.",
  insightFallback:
    "Worth knowing: the AI-assistant launch is your strongest card — most senior PM postings I see list exactly that outcome first. Lead with it.",
  matches: [
    { c: "Stripe", t: "Senior AI PM", v: "go", vw: "go for it", why: "Your AI launch story is exactly what they list first. Gap on payments — bridgeable.", comp: "$210k–$260k" },
    { c: "Sierra", t: "Senior PM, Agents", v: "go", vw: "go for it", why: "Agent product, 0-to-1 surface — the kind of scope you do best.", comp: "$200k–$250k" },
    { c: "Ramp", t: "Staff PM", v: "maybe", vw: "maybe", why: "Right level and real AI surface; finance is new ground for you.", comp: "$220k–$270k" },
    { c: "Notion", t: "Senior PM, AI", v: "maybe", vw: "maybe", why: "Strong brand, but the role reads more polish than build-from-zero.", comp: "$190k–$240k" }
  ],
  matchesResorted: [
    { c: "Sierra", t: "Senior PM, Agents", v: "go", vw: "go for it", why: "Moved up — fully remote, and agents are your lane.", comp: "$200k–$250k" },
    { c: "Stripe", t: "Senior AI PM", v: "go", vw: "go for it", why: "Still strong — hybrid, 3 days in SF office.", comp: "$210k–$260k" },
    { c: "Notion", t: "Senior PM, AI", v: "maybe", vw: "maybe", why: "Remote-friendly; still reads more polish than zero-to-one.", comp: "$190k–$240k" },
    { c: "Ramp", t: "Staff PM", v: "skip", vw: "skip", why: "Moved down — they want 4 days in office in NYC.", comp: "$220k–$270k" }
  ],
  weakMatches: [
    { c: "Anduril", t: "Sr PM, Hardware Systems", v: "maybe", vw: "maybe", why: "Closest I have — your systems depth fits, but it's adjacent, not core.", comp: "$200k–$255k" },
    { c: "Apple", t: "PM, Platform", v: "maybe", vw: "maybe", why: "Real hardware surface; the posting is vague on level.", comp: "not stated" }
  ]
};
