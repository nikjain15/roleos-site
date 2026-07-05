/* Cover-letters proto — personas + tone variants. Throwaway by design. */
window.CL = {
  personas: [
    ["verdict", "Write it — Stripe (worth it)"],
    ["skip", "Skip it — Ramp (honest no)"],
    ["first", "First time — the voice interview"],
    ["outreach", "The outreach trio"]
  ],
  screens: [["index", "letters & outreach"]],
  letters: {
    direct: ["Dear Stripe team —", "I&rsquo;ve spent four years making LLMs useful where mistakes cost money.", "Your radar launch last quarter is exactly the surface I&rsquo;d want to build on.", "The fraud platform I built cleared $2B — and taught me the eval discipline your posting leads with.", "— Nik"],
    warm: ["Hi Stripe team,", "For four years I&rsquo;ve been making LLMs genuinely useful in places where mistakes cost real money — and honestly, loving it.", "When your radar launch shipped last quarter, it was the first thing I sent to a friend that week.", "The fraud platform I built cleared $2B, and it taught me the eval discipline your posting cares about most.", "Warmly, Nik"],
    formal: ["Dear Stripe Hiring Team,", "Over the past four years I have specialized in deploying LLM systems in high-stakes financial contexts.", "Your recent radar launch closely aligns with the product surface where I do my strongest work.", "The fraud platform I architected cleared $2B in marketplace risk and required the evaluation rigor your posting emphasizes.", "Sincerely, Nik Jain"]
  },
  whys: {
    0: ["opens with proof, not a greeting card", "your voice profile says direct — no &ldquo;I hope this finds you well&rdquo;"],
    1: ["research-grounded: their actual Q3 launch", "source: my Stripe company brief — real event, checkable. Specific beats flattering."],
    2: ["your strongest claim, tied to THEIR words", "&ldquo;eval discipline&rdquo; is lifted from their posting; the $2B is from your master — both true, both checkable."]
  }
};
