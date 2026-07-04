/* Tracker proto — pipeline data per persona. Throwaway by design. */
window.TR = {
  personas: [
    ["healthy", "Healthy pipeline — 12 live"],
    ["action", "Your move on 2"],
    ["ghost", "One gone quiet (24 days)"],
    ["rejection", "A rejection just landed"]
  ],
  screens: [["index", "the tracker"]],
  reads: {
    healthy: "Twelve live. Three real conversations going, Stripe onsite Thursday (prep&rsquo;s ready when you are), two gone quiet but well within normal, and nothing needs you today — the pipeline is genuinely healthy.",
    action: "Twelve live, and <b>two are waiting on you</b>: the Stripe recruiter offered times (reply&rsquo;s drafted — one tap to review), and Ramp&rsquo;s take-home is due Friday. Everything else is on me or on them.",
    ghost: "Eleven moving, one worry: Notion&rsquo;s gone quiet — 24 days, past their typical. Your nudge is drafted. And honestly? If it stays silent, that says nothing about your work.",
    rejection: "Some news, and I&rsquo;ll give it to you straight, the kind way — read the card below. The rest of your pipeline is moving well, and two finals are very much alive."
  },
  cols: [
    ["applied", "applied · 6", [
      ["Sierra", "Sr PM, Agents", "hers", "3d · fresh — replies typically take 1–2 weeks", ""],
      ["Anthropic", "PM, Claude Platform", "hers", "6d · normal quiet", ""],
      ["Vercel", "PM, AI SDK", "hers", "9d · day-10 follow-up ready tomorrow", ""]
    ]],
    ["convo", "in conversation · 3", [
      ["Stripe", "Senior AI PM", "yours", "recruiter offered Thu 2p / Fri 10a — reply drafted", "review the reply — 1 min"],
      ["Ramp", "Staff PM", "yours", "take-home due Friday — studio&rsquo;s ready when you are", "open the studio"],
      ["Linear", "PM", "theirs", "they&rsquo;re scheduling — nothing for either of us yet", ""]
    ]],
    ["interview", "interviewing · 2", [
      ["Stripe", "Senior AI PM", "yours", "onsite Thursday — prep + mock ready, panel researched", "start the prep"],
      ["Notion", "Sr PM, AI", "theirs", "final round done — decision promised this week", ""]
    ]]
  ]
};
