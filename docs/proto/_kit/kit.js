/* RoleOS proto kit — debug bar + state/persona switching. Throwaway by design.
 *
 * Usage in a proto page:
 *   <script>
 *   window.PROTO = {
 *     feature: "onboarding",
 *     screen:  "landing",                       // this page's id in the flow
 *     screens: [["landing","Landing"],["work","RO works"]],  // flow nav (hrefs = <id>.html)
 *     states:  ["default","empty","loading","error","success"],
 *     personas:[["sr-pm","Senior PM (rich CV)"],["thin","Thin input"],["hostile","Hostile input"],["returning","Returning user"]]
 *   };
 *   </script>
 *   <script src="../_kit/kit.js"></script>
 *
 * kit.js sets body[data-state] and body[data-persona].
 * Markup opts in with data-show="stateA,stateB" (CSS hides by default).
 * Optional hook: window.PROTO.onChange = (state, persona) => {...}
 */
(function () {
  var P = window.PROTO || {};
  var states = P.states || ["default"];
  var personas = P.personas || [];
  var key = "proto." + (P.feature || "x");

  function get(k, fallback) {
    try { return localStorage.getItem(key + "." + k) || fallback; } catch (e) { return fallback; }
  }
  function set(k, v) { try { localStorage.setItem(key + "." + k, v); } catch (e) {} }

  var qs = new URLSearchParams(location.search);
  var state = qs.get("state") || get("state", states[0]);
  if (states.indexOf(state) < 0) state = states[0];
  var persona = qs.get("persona") || get("persona", personas.length ? personas[0][0] : "");

  function apply() {
    document.body.dataset.state = state;
    document.body.dataset.persona = persona;
    // data-show="a,b" → visible only when state matches
    document.querySelectorAll("[data-show]").forEach(function (el) {
      var on = el.getAttribute("data-show").split(",").indexOf(state) >= 0;
      el.style.display = on ? (el.dataset.display || "block") : "none";
    });
    // data-persona-show="p1,p2" → visible only for those personas
    document.querySelectorAll("[data-persona-show]").forEach(function (el) {
      var on = el.getAttribute("data-persona-show").split(",").indexOf(persona) >= 0;
      el.style.display = on ? (el.dataset.display || "block") : "none";
    });
    document.querySelectorAll("#kitbar [data-st]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.st === state));
    });
    if (typeof P.onChange === "function") P.onChange(state, persona);
  }

  function bar() {
    var el = document.createElement("div");
    el.id = "kitbar";
    var h = '<span class="lbl">' + (P.feature || "proto") + "</span>";
    if (P.screens && P.screens.length) {
      h += '<span class="grp"><span class="lbl">screen</span>';
      P.screens.forEach(function (s) {
        h += s[0] === P.screen
          ? "<button aria-pressed='true' disabled>" + s[1] + "</button>"
          : "<a href='" + s[0] + ".html'>" + s[1] + "</a>";
      });
      h += "</span>";
    }
    h += '<span class="grp"><span class="lbl">state</span>';
    states.forEach(function (s) { h += "<button data-st='" + s + "'>" + s + "</button>"; });
    h += "</span>";
    if (personas.length) {
      h += '<span class="grp"><span class="lbl">persona</span><select id="kitpersona">';
      personas.forEach(function (p) {
        h += "<option value='" + p[0] + "'" + (p[0] === persona ? " selected" : "") + ">" + p[1] + "</option>";
      });
      h += "</select></span>";
    }
    var J = {
      "onboarding": ["goal-setup", "goal setup"],
      "goal-setup": ["feed-cockpit", "the feed"],
      "feed-cockpit": ["explore", "explore"],
      "explore": ["role-workspace", "workspace"],
      "role-workspace": ["resume-editor", "resume"],
      "resume-editor": ["cover-letters", "letters"],
      "cover-letters": ["apply-send", "apply"],
      "apply-send": ["tracker", "tracker"],
      "tracker": ["research-briefs", "briefs"],
      "research-briefs": ["mocks", "mocks"],
      "mocks": ["offers", "offers"],
      "offers": ["referrals", "referrals"],
      "referrals": ["weekly-review", "review"],
      "weekly-review": ["ro-dock", "RO dock"],
      "ro-dock": ["digests", "digests"],
      "digests": ["settings", "settings"]
    };
    if (J[P.feature]) {
      h += "<span class='grp'><span class='lbl'>journey</span><a href='../" + J[P.feature][0] + "/index.html' style='color:#9FE1CB'>next: " + J[P.feature][1] + " →</a></span>";
    }
    h += "<span class='grp'><a href='" + (P.home || "../index.html") + "'>index</a></span>";
    el.innerHTML = h;
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-st]");
      if (!b) return;
      state = b.dataset.st; set("state", state); apply();
    });
    var sel = el.querySelector("#kitpersona");
    if (sel) sel.addEventListener("change", function () {
      persona = sel.value; set("persona", persona); apply();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bar(); apply(); });
  } else { bar(); apply(); }

  window.Proto = {
    get state() { return state; },
    get persona() { return persona; },
    setState: function (s) { state = s; set("state", s); apply(); }
  };
})();
