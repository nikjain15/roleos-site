/* Role-workspace proto — queue + roles. Throwaway by design. */
window.RW = {
  personas: [
    ["week", "Mid-week — 3 of 5 to decide"],
    ["tie", "A genuine tie (compare offer)"],
    ["backlog", "Big backlog — 14 saved"],
    ["done", "Queue finished"]
  ],
  screens: [["index", "the queue"], ["role", "one role"], ["compare", "compare"]],
  queue: [
    { c: "Sierra", t: "Sr PM, Agents", v: "go for it", pv: "ok" },
    { c: "Ramp", t: "Staff PM", v: "go for it", pv: "ok" },
    { c: "Notion", t: "Sr PM, AI", v: "maybe", pv: "warn" }
  ],
  saved: [
    ["Anthropic — PM, Claude Platform", "81 fit"],
    ["Vercel — PM, AI SDK", "68 fit"],
    ["Linear — PM", "64 fit"],
    ["Scale — Senior PM", "61 fit · reads like it levels down"]
  ]
};
