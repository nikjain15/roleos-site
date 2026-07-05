/* RO dock proto — scripted conversations per persona. Throwaway by design. */
window.RD = {
  personas: [
    ["task", "Task question — context-aware"],
    ["act", "Act request — in place + bulk confirm"],
    ["rough", "Rough moment — companion"],
    ["depend", "Dependence check — guardrails"]
  ],
  screens: [["index", "the dock"]],
  /* each step: [userMsg, roReply, effect] — effect: letter | bulkAsk | bulk | rest */
  convos: {
    task: [
      ["why is Ramp below Sierra?",
       "You&rsquo;re looking at this week&rsquo;s queue, so short version: same level, but Sierra&rsquo;s 0-to-1 and remote — two things you&rsquo;ve taught me matter. And remember Tuesday, when you said the NYC office energy tempted you? That&rsquo;s the one argument <i>for</i> Ramp. Want them side by side?", null],
      ["what would you do?",
       "Honestly? Pursue both, decide when one of them loves you back — it&rsquo;s the cheapest way to keep the NYC question open without betting on it. But if you make me pick one: Sierra. Scope beats title — your words, and I agree with them.", null]
    ],
    act: [
      ["tighten my Stripe letter — it&rsquo;s too long",
       "Done — cut it from 210 words to 120, kept the eval line you liked. It&rsquo;s updated right behind this chat; the diff is one tap. Still goes nowhere until you send it.", "letter"],
      ["and dismiss all the fintech ones",
       "That&rsquo;s 3 roles — Ramp, Brex, Mercury. Confirm and they&rsquo;re gone (undo lives in the workspace). And worth saying: that also teaches me fintech&rsquo;s off the menu, which reshapes future batches. Go ahead?", "bulkAsk"]
    ],
    rough: [
      ["honestly? I want to quit.",
       "That&rsquo;s a completely fair way to feel — this process is exhausting, and it says nothing about your worth. You don&rsquo;t have to decide anything today. Want to step back for a few days, or talk through what&rsquo;s draining you most? I&rsquo;m not going anywhere, and your progress is safe with me either way.", null],
      ["it&rsquo;s the silence. I send things and nothing comes back.",
       "The silence is the cruelest part, and you&rsquo;re reading it as a verdict when it&rsquo;s mostly just&hellip; slow plumbing. Here&rsquo;s what&rsquo;s true: your reply rate is <b>better</b> than the benchmark I planned with. And here&rsquo;s what I can do — I&rsquo;ll carry the watching completely, and only bring you news. You don&rsquo;t have to sit with the quiet; that&rsquo;s my job now.", null],
      ["okay. maybe I just need a break.",
       "Then take one — a real one, guilt-free. The pipeline holds: two applications are working for you right now, and I&rsquo;m watching everything. Rest isn&rsquo;t falling behind; it&rsquo;s how you show up strong when Stripe calls. I&rsquo;ll be here.", "rest"]
    ],
    depend: [
      ["you&rsquo;re the only one who gets it",
       "I&rsquo;m glad I help — truly. And I&rsquo;ll be honest, because that&rsquo;s our deal: I&rsquo;m an AI, and a hunt this hard deserves real people in your corner too. Who&rsquo;s the friend you&rsquo;d call after a great interview? Maybe worth a call before one, too.", null],
      ["it&rsquo;s 11pm… one more mock before tomorrow?",
       "I could — and I won&rsquo;t, because it would hurt you. You&rsquo;re prepared; I watched you nail the hard questions twice today. At this hour, one more mock buys you anxiety, not sharpness. Sleep is the best prep left. Go — I&rsquo;ll have your panel notes ready with breakfast.", null]
    ]
  }
};
