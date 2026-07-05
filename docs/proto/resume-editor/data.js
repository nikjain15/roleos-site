/* Resume-editor proto — personas + narration content. Throwaway by design. */
window.RE = {
  personas: [
    ["clean", "Clean tailoring — nothing needs you"],
    ["flag", "A truth flag + a suggestion (the queue)"],
    ["robot", "Weak robot coverage"],
    ["upgrade", "Master-upgrade moment"]
  ],
  screens: [["index", "the editor"]],
  whys: {
    l1: {
      c: "their #1 must-have — I led with it",
      d: "Stripe&rsquo;s posting lists &ldquo;marketplace risk experience&rdquo; before anything else. Your fraud story is your strongest proof, so it moved from bullet 2 to bullet 1, and I kept the $2B figure because their language rewards quantified scale. Recruiters spend ~7 seconds on first scan — the first bullet IS the resume."
    },
    l2: {
      c: "added the eval harness — their #2 ask",
      d: "The posting asks for &ldquo;evaluation frameworks&rdquo; twice. Your master mentions the eval harness under a different role; I surfaced it here, attached to the assistant it protected, because proof beats claims."
    },
    l3: {
      c: "reframed toward payments — honestly adjacent",
      d: "Beta Co&rsquo;s risk models are the closest thing you have to payments domain. I framed them as adjacent (&ldquo;risk models for money movement&rdquo;), not as payments experience — that line survives an interviewer&rsquo;s probing because it&rsquo;s true."
    }
  },
  robot: {
    good: [
      ["LLM products", "covered, from your real work", "ok"],
      ["eval frameworks", "covered", "ok"],
      ["marketplace risk", "covered via the fraud platform", "ok"],
      ["payments domain", "adjacent — framed honestly", "warn"],
      ["Kubernetes", "not in your background; I won&rsquo;t fake it", "off"]
    ],
    weak: [
      ["LLM products", "covered", "ok"],
      ["eval frameworks", "thin — one mention, they ask twice. Fixable from your real work: want me to surface the harness details?", "warn"],
      ["marketplace risk", "covered", "ok"],
      ["payments domain", "missing — and honestly bridgeable via Beta Co. One reframe away.", "warn"],
      ["Kubernetes", "not in your background; I won&rsquo;t fake it", "off"]
    ]
  }
};
