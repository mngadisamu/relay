// Sensitive requests (responsible AI). Some requests need a person's care, not
// a quick AI reply. Relay spots them with plain word rules (not the AI model),
// so every rule is easy to read, test and explain to the panel.
//
// Every sensitive request:
//   - is marked on the ticket (tickets.is_sensitive and sensitive_kind, migration 0009);
//   - has its text kept away from Gemini (an outside AI service, POPIA);
//   - needs a personal reply: the starting template can't be sent unchanged.
// Each kind also decides where the request goes and how urgent it is (below).

export type SensitiveKind = "conduct" | "wellbeing" | "incident" | "security" | "personal";

type Rule = {
  kind: SensitiveKind;
  // "model" keeps the department the AI chose; otherwise it always goes here.
  department: "HR" | "IT" | "model";
  // The lowest priority it may have. null keeps what the person chose.
  minPriority: "high" | "urgent" | null;
  pattern: RegExp;
};

// Whole words only (\b), any capital letters (i). Kept to clear phrases, so
// everyday requests ("security threat" from antivirus, "my laptop crashed",
// "account disabled", "medical aid") aren't caught.
// Checked in this order: the first match wins.
const RULES: Rule[] = [
  {
    // Harassment, bullying, discrimination, threats: HR's, whatever the model guessed.
    kind: "conduct",
    department: "HR",
    minPriority: "high",
    pattern:
      /\b(harass(ed|es|ing|ment)?|bull(y|ying|ied|ies)|discriminat(e|ed|es|ing|ion)|racis[mt]|racial(ly)? abus\w*|sexual(ly)?|assault(ed|s)?|abus(ed|ive)|verbal(ly)? abus\w*|threaten(ed|s|ing)?|intimidat(e|ed|es|ing|ion)|victimi[sz](e|ed|ation)|inappropriate(ly)? touch\w*|unwanted (touch\w*|advances|contact)|hostile work)\b/i,
  },
  {
    // Someone's life or safety at home: HR, straight away.
    kind: "wellbeing",
    department: "HR",
    minPriority: "urgent",
    pattern:
      /\b(suicid(e|al)|kill myself|self[- ]?harm|end my life|hurt myself|don'?t want to live|domestic violence|gbv|gender[- ]based violence)\b/i,
  },
  {
    // Injuries, accidents and crime on the job (hijacking is a real risk for drivers):
    // the AI's department (usually Operations), straight away.
    kind: "incident",
    department: "model",
    minPriority: "urgent",
    pattern:
      /\b(injur(y|ies|ed)|hurt (my|his|her|their)|accident|bleeding|fell (off|from|down)|ambulance|hospital(ised|ized)?|hijack(ed|ing)?|robbe(d|ry)|armed (men|robbery)|at gunpoint|smash and grab|(car|truck|vehicle) crash|crashed into|collision|overturned|rolled over|(chemical|fuel|diesel|oil) spill|hazardous|drunk|under the influence|fell asleep (at|behind) the wheel)\b/i,
  },
  {
    // A hacked account, a stolen device, a phishing email: IT, quickly. The text
    // may hold passwords, another reason it never goes to Gemini.
    kind: "security",
    department: "IT",
    minPriority: "high",
    pattern:
      /\b(hack(ed|er|ers|ing)?|account (was |has been |got )?(compromised|taken over)|someone (is |has been )?(logging|logged) into my|(reading|accessing) my (emails?|account)|data breach|leaked|ransomware|(laptop|phone|tablet|device|computer) (was |got |has been )?(stolen|lost)|lost my (work )?(laptop|phone|tablet|device)|phishing|scam email|suspicious (email|link)|clicked (a|the|on a|on the) (link|attachment)|gave (out )?my password|asking for my (password|banking details|pin))\b/i,
  },
  {
    // Health and life events: private, HR's, at the priority the person chose.
    kind: "personal",
    department: "HR",
    minPriority: null,
    pattern:
      /\b(hiv|aids|cancer|chemo(therapy)?|diagnos(ed|is)|pregnan(t|cy)|miscarriage|mental health|depress(ed|ion)|anxiety|panic attacks?|disability|medical condition|surgery|tuberculosis|epilep(sy|tic)|diabet(es|ic)|passed away|death in (my|the) family|bereavement|funeral|disciplinary|dismiss(ed|al)|retrench(ed|ment)|garnishee|debt counsell?ing)\b/i,
  },
];

export type SensitiveCheck = { sensitive: false } | { sensitive: true; kind: SensitiveKind };

export function checkSensitive(subject: string, description: string): SensitiveCheck {
  const text = `${subject}\n${description}`;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return { sensitive: true, kind: rule.kind };
  }
  return { sensitive: false };
}

const ruleFor = (kind: SensitiveKind) => RULES.find((r) => r.kind === kind)!;

// Where a sensitive request goes: a fixed department, or the AI's choice.
export function departmentFor(kind: SensitiveKind, modelDepartment: string) {
  const { department } = ruleFor(kind);
  return department === "model" ? modelDepartment : department;
}

// Raise the priority to the kind's minimum; never lower what the person chose.
const RANK = { low: 0, medium: 1, high: 2, urgent: 3 } as const;
export function priorityFor(kind: SensitiveKind, priority: string) {
  const min = ruleFor(kind).minPriority;
  if (!min) return priority;
  return RANK[priority as keyof typeof RANK] >= RANK[min] ? priority : min;
}

// What the agent sees on the ticket, per kind.
export const SENSITIVE_LABEL: Record<SensitiveKind, { tag: string; note: string }> = {
  conduct: {
    tag: "Sensitive: conduct",
    note: "It reports harassment, bullying, discrimination or a threat. Keep it confidential and contact the person today.",
  },
  wellbeing: {
    tag: "Sensitive: wellbeing",
    note: "Someone may be at risk. Call the person now rather than only replying. SADAG's 24-hour suicide crisis line is 0800 567 567.",
  },
  incident: {
    tag: "Sensitive: incident",
    note: "It reports an injury, accident or crime. Check that everyone is safe and that emergency services were called if needed.",
  },
  security: {
    tag: "Sensitive: security",
    note: "It may be a hacked account, a lost device or a phishing email. Act quickly. If personal or customer data may have been exposed, tell a manager or compliance: POPIA may require it to be reported.",
  },
  personal: {
    tag: "Sensitive: personal",
    note: "It mentions health or a personal matter. Keep it confidential and reply personally.",
  },
};
