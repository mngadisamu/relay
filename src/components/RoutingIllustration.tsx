// Home page illustration (S2-02): requests come in from anywhere, meet at Relay,
// and leave on a coloured line to the team that should answer them, like a
// transit map. The small tickets travel along the lines; they're hidden for
// people who ask their device for reduced motion.

const TEAMS = [
  { name: "HR", y: 70, color: "#5eead4" },
  { name: "IT", y: 170, color: "#8cc4ff" },
  { name: "Finance", y: 270, color: "#fcd34d" },
  { name: "Operations", y: 370, color: "#c4b5fd" },
];

const SOURCES = [
  { name: "Office", y: 100, path: "M64 100 H140 L210 220 H228" },
  { name: "Site", y: 220, path: "M64 220 H228" },
  { name: "On the road", y: 340, path: "M64 340 H140 L210 220 H228" },
];

// From the hub to a team's station: straight out, one bend, straight on.
const teamPath = (y: number) => `M292 220 H330 L380 ${y} H470`;

// The tickets on their way: where each starts, where it goes, and when it sets off.
const TRIPS = [
  { from: 0, to: 1, begin: "0s" },
  { from: 2, to: 3, begin: "1.5s" },
  { from: 1, to: 0, begin: "3s" },
  { from: 0, to: 2, begin: "4.5s" },
];

export function RoutingIllustration() {
  return (
    <svg
      viewBox="0 0 640 440"
      role="img"
      aria-label="Requests from the office, a site and the road meet at Relay, which sends each one to HR, IT, Finance or Operations."
      className="h-auto w-full"
    >
      {/* Incoming lines */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        {SOURCES.map((s) => (
          <path key={s.name} d={s.path} />
        ))}
      </g>

      {/* Outgoing lines, one colour per team */}
      <g fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        {TEAMS.map((t) => (
          <path key={t.name} d={teamPath(t.y)} stroke={t.color} />
        ))}
      </g>

      {/* Where requests come from */}
      {SOURCES.map((s) => (
        <g key={s.name}>
          <circle cx="64" cy={s.y} r="9" fill="#0b3d73" stroke="#ffffff" strokeWidth="3" />
          <text x="64" y={s.y - 20} textAnchor="middle" fontSize="18" fontWeight="500" fill="#d6e2f2">
            {s.name}
          </text>
        </g>
      ))}

      {/* The teams */}
      {TEAMS.map((t) => (
        <g key={t.name}>
          <circle cx="470" cy={t.y} r="11" fill="#0b3d73" stroke={t.color} strokeWidth="4" />
          <text x="492" y={t.y + 7} fontSize="21" fontWeight="600" fill="#ffffff">
            {t.name}
          </text>
        </g>
      ))}

      {/* Tickets travelling from where they were sent to the team that answers them */}
      <g className="motion-reduce:hidden">
        {TRIPS.map((trip, i) => {
          const team = TEAMS[trip.to];
          const route = SOURCES[trip.from].path + " H292 " + teamPath(team.y).replace("M292 220 ", "");
          return (
            <g key={i} opacity="0">
              <rect x="-13" y="-8" width="26" height="16" rx="3" fill={team.color} stroke="#0b3d73" strokeWidth="2" />
              <path d="M-6 -1h12M-6 3h7" stroke="#0b3d73" strokeWidth="1.6" strokeLinecap="round" />
              <animateMotion dur="6s" begin={trip.begin} repeatCount="indefinite" path={route} />
              <animate attributeName="opacity" dur="6s" begin={trip.begin} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.06;0.9;1" />
            </g>
          );
        })}
      </g>

      {/* Relay in the middle: the logo's arrow in a white ring */}
      <rect x="220" y="182" width="80" height="76" rx="18" fill="#0b3d73" />
      <rect x="228" y="188" width="64" height="64" rx="14" fill="#0f5fb8" stroke="#ffffff" strokeWidth="3" />
      <path d="M246 220h24M262 208l12 12-12 12" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="260" y="292" textAnchor="middle" fontSize="17" fontWeight="500" fill="#d6e2f2">
        Sorted by Relay
      </text>
    </svg>
  );
}