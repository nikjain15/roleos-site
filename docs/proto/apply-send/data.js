/* Apply/Send proto — personas + bundle content. Throwaway by design. */
window.AS = {
  personas: [
    ["strong", "Strong bundle (87)"],
    ["weak", "Needs work (61)"],
    ["truth", "Truth-gate question inside"],
    ["email", "Email apply — no ATS form"]
  ],
  screens: [["index", "1 review"], ["handoff", "2 the send"], ["sent", "3 sent"]],
  pieces: {
    resume: "NIK JAIN — Senior Product Manager\n\n• Shipped an LLM support assistant that cut response time 40% and deflected 30% of tickets — led 0-to-1.\n• Built the fraud platform that cleared $2B in marketplace risk — their posting's first must-have.\n• 8 years product; last 4 on AI/ML. Eval frameworks, ML-eng partnership, SF.",
    letter: "Dear Stripe team —\n\nI have extensive experience with LLM products: an assistant that cut response time 40%, and the eval discipline to keep it honest in production. Your posting leads with applied-AI judgment — that's the last four years of my life.\n\nI'd love to bring that to payments.",
    answers: "Q: Why Stripe?\nA: You're putting AI where the money actually moves — I want the stakes that come with that.\n\nQ: Describe a hard product tradeoff.\nA: I killed our most-requested feature to protect latency — and kept the customers…"
  }
};
