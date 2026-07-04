/* Explore proto — roles + canned ask scenarios. Throwaway by design. */
window.EX = {
  personas: [["anon", "Anonymous skeptic"], ["member", "Signed in — has matches"]],
  screens: [["index", "explore"], ["role", "full read"]],
  roles: [
    { id: "stripe", c: "Stripe", t: "Senior AI PM", comp: "$210–260k", cl: "their number", posted: "3d ago", checked: "today", loc: "SF hybrid",
      needs: "you&rsquo;ve shipped an LLM product, you can talk evals, and payments curiosity helps.", fit: [92, "in your matches", "ok"], k: ["ai"] },
    { id: "sierra", c: "Sierra", t: "Senior PM, Agents", comp: "$200–250k", cl: "their number", posted: "1d ago", checked: "today", loc: "remote ok",
      needs: "agent-product instincts and a real 0-to-1 story — they say &lsquo;builder&rsquo; and mean it.", fit: [88, "in your matches", "ok"], k: ["ai", "remote"] },
    { id: "anthropic", c: "Anthropic", t: "PM, Claude Platform", comp: "$250–320k", cl: "their number", posted: "5d ago", checked: "today", loc: "remote ok",
      needs: "platform thinking, developer empathy, and comfort with fast-moving research neighbors.", fit: [81, "worth a look", "ok"], k: ["ai", "remote", "pay250"] },
    { id: "sierra2", c: "Sierra", t: "Staff PM", comp: "$260–300k", cl: "their number", posted: "2d ago", checked: "today", loc: "remote",
      needs: "you&rsquo;ve run a product area end to end and can show the scars.", fit: [76, "worth a look", "ok"], k: ["ai", "remote", "pay250"] },
    { id: "scale", c: "Scale", t: "Senior PM", comp: "&ldquo;$250k+&rdquo;", cl: "their claim — read on", posted: "6d ago", checked: "yesterday", loc: "SF",
      needs: "the posting is broad — my read: they want a generalist and will level in the interview.", warn: "may level down", fit: [64, "she passed on this", "warn"], k: ["ai", "pay250"] },
    { id: "vercel", c: "Vercel", t: "PM, AI SDK", comp: "$190–240k", cl: "my estimate from 9 similar roles", posted: "8d ago", checked: "today", loc: "remote",
      needs: "developer-tools taste; the scope reads a level junior for a senior hire.", fit: [68, "she passed on this", "warn"], k: ["ai", "remote"], gap: true },
    { id: "figma", c: "Figma", t: "Senior PM, AI", comp: "$200–250k", cl: "their number", posted: "12d ago", checked: "2h ago", loc: "SF hybrid",
      needs: "", closed: true, k: ["ai"] },
    { id: "notion", c: "Notion", t: "Senior PM, AI", comp: "$190–240k", cl: "their number", posted: "4d ago", checked: "today", loc: "SF hybrid",
      needs: "polish and craft over 0-to-1 — great if refinement is your love language.", fit: [71, "worth a look", "ok"], k: ["ai"] }
  ],
  asks: [
    "which of these pay $250k+ and stay remote?",
    "principal PM, climate tech, fully remote, $300k+?",
    "show me everything again"
  ]
};
