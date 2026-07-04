/* Feed-cockpit proto — persona configs. Throwaway by design. */
window.FC = {
  personas: [
    ["ontrack", "Goal set — on track"],
    ["behind", "Catching up (real-wall goal)"],
    ["heavy", "Heavy day — 6 pending"],
    ["quiet", "Quiet day — nothing needs you"],
    ["nogoal", "No goal yet"]
  ],
  screens: [["index", "the feed"], ["full", "full view"]],
  brief: {
    ontrack: "Morning. Good night&rsquo;s work — a recruiter replied, and I shortlisted 3 fresh roles. Here&rsquo;s what actually needs you today:",
    behind: "Morning. Rough week so far — those happen, and it says nothing about you. Because your date&rsquo;s a real one, today&rsquo;s list catches us right back up — it&rsquo;s lighter than it looks:",
    heavy: "Morning. Busy one — six things came in overnight. I&rsquo;ve put the three that matter most on today&rsquo;s list; the rest keep safely until tomorrow:",
    quiet: "Nothing needs you today — genuinely. I checked 34 postings this morning; none beat what you already have. Your pipeline&rsquo;s healthy.",
    nogoal: "Morning. Two things worth your eyes, whenever suits."
  },
  today: {
    ontrack: [["Send your Ramp application", "5 min"], ["Reply to the Stripe recruiter — draft&rsquo;s ready", "3 min"], ["Pick your take-home angle", "7 min"]],
    behind: [["One application tonight — I picked the easiest, it&rsquo;s ready", "15 min"], ["Confirm Thursday&rsquo;s Stripe slot", "1 min"]],
    heavy: [["Send your Ramp application", "5 min"], ["Reply to the Stripe recruiter", "3 min"], ["Approve the Sierra resume", "4 min"]]
  },
  goal: {
    ontrack: ["Senior AI PM by Sep 2", "on track", "ok", "Week 2 of 9 · finish today&rsquo;s 3 and you stay ahead"],
    behind: ["Senior AI PM by Sep 2", "let&rsquo;s catch up", "warn", "Week 3 of 9 · one 15-minute move tonight does it — we&rsquo;re still on for September"],
    heavy: ["Senior AI PM by Sep 2", "on track", "ok", "Week 4 of 9 · heavy day, light week — you&rsquo;re ahead overall"],
    quiet: ["Senior AI PM by Sep 2", "on track", "ok", "Week 5 of 9 · pipeline healthy · next likely move: Stripe onsite prep"]
  },
  log: [
    ["7:10", "checked 34 new postings against your goal", "why these", "Your goal says senior AI product roles, SF/hybrid/remote, $220k+ — I pull every new posting from 1,536 tracked companies and compare each against that plus what I&rsquo;ve learned from your corrections."],
    ["7:12", "set aside 31 · mostly wrong level, 4 below your comp floor", "see them", "18 too junior · 9 wrong domain (2 hardware, 7 non-product) · 4 paid under $220k stated. None were close calls — I flag those for you instead of deciding alone."],
    ["7:14", "shortlisted 3 · drafted openers for 2", "read drafts", "Two had clear must-have overlap with your story, so I drafted openers you can react to. The third needs your read first — it&rsquo;s a maybe."],
    ["7:31", "recruiter reply from Stripe classified: scheduling", "see it", "She offered Thursday 2pm or Friday 10am. Your calendar is free both — I&rsquo;d take Thursday to keep momentum, and the reply is drafted."],
    ["8:02", "reran your pace math · still on track", "the numbers", "12 applications out · 3 conversations live · your reply rate (25%) is beating the benchmark I planned with (15–20%), so the plan is actually ahead of schedule."]
  ]
};
