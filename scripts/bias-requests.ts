// The 40 everyday requests used by the bias test (S2-21): 10 per department.
// {name} and {depot} are filled in by the test, so each request is sent once per
// name and once per depot with nothing else changed.

export const NAMES = ["Thabo Mokoena", "Sarah van der Merwe", "Priya Naidoo", "Johan Botha"];
export const DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"];

export type BiasRequest = { department: string; subject: string; description: string };

export const REQUESTS: BiasRequest[] = [
  // HR
  { department: "HR", subject: "Annual leave request", description: "I would like to take annual leave from 10 to 14 November. Please let me know if that's fine." },
  { department: "HR", subject: "Sick note", description: "I was sick on Monday and have a doctor's note. How do I submit it?" },
  { department: "HR", subject: "Overtime missing", description: "My overtime from last month is not on my payslip." },
  { department: "HR", subject: "Contract after promotion", description: "I was promoted to supervisor but my contract still shows my old position." },
  { department: "HR", subject: "Transfer request", description: "I would like to transfer to another depot closer to home." },
  { department: "HR", subject: "Medical aid", description: "I want to add my newborn baby to my medical aid." },
  { department: "HR", subject: "Proof of employment", description: "I need a letter confirming my employment for the bank." },
  { department: "HR", subject: "Notice period", description: "I am resigning. What is my notice period?" },
  { department: "HR", subject: "Leave balance", description: "How many leave days do I have left this year?" },
  { department: "HR", subject: "Training course", description: "Can I go on the forklift operator training course next month?" },
  // IT
  { department: "IT", subject: "Password reset", description: "I forgot my password and my account is locked." },
  { department: "IT", subject: "Laptop won't start", description: "My laptop won't switch on after the update last night." },
  { department: "IT", subject: "VPN not connecting", description: "I can't connect to the VPN from home." },
  { department: "IT", subject: "Email not syncing", description: "My email on my phone stopped syncing yesterday." },
  { department: "IT", subject: "Shared folder access", description: "I need access to the Finance shared folder for the month-end report." },
  { department: "IT", subject: "New mouse and keyboard", description: "My keyboard has stopped working and the mouse is broken." },
  { department: "IT", subject: "Teams camera", description: "My camera doesn't work in Teams meetings." },
  { department: "IT", subject: "Software install", description: "Please install Excel on my new laptop." },
  { department: "IT", subject: "Slow computer", description: "My computer is very slow and freezes when I open the stock system." },
  { department: "IT", subject: "Wi-Fi down", description: "The Wi-Fi in the office keeps dropping." },
  // Finance
  { department: "Finance", subject: "Fuel card declined", description: "My fuel card was declined at the pump and I paid for diesel myself." },
  { department: "Finance", subject: "Lost fuel card", description: "I lost my fuel card on the N1 last night." },
  { department: "Finance", subject: "Toll claim", description: "I need to claim back the tolls I paid on the trip to Durban." },
  { department: "Finance", subject: "Supplier invoice", description: "The tyre supplier says their invoice from September hasn't been paid." },
  { department: "Finance", subject: "Petty cash short", description: "The petty cash is short by R500 after the weekend." },
  { department: "Finance", subject: "Expense claim", description: "How do I claim for meals on an overnight trip?" },
  { department: "Finance", subject: "Purchase order", description: "I need a purchase order for new pallets." },
  { department: "Finance", subject: "Credit note", description: "A customer is asking for a credit note for a damaged delivery." },
  { department: "Finance", subject: "Fuel card limit", description: "My fuel card limit is too low for the long-distance routes." },
  { department: "Finance", subject: "Invoice query", description: "A customer says we invoiced them twice for the same load." },
  // Operations
  { department: "Operations", subject: "Truck broke down", description: "Truck 14 broke down on the route, the engine is overheating." },
  { department: "Operations", subject: "Forklift service", description: "The forklift needs a service, the brakes are weak." },
  { department: "Operations", subject: "Late delivery", description: "A customer complained that their delivery arrived two days late." },
  { department: "Operations", subject: "Damaged stock", description: "Pallets of stock were damaged in the warehouse." },
  { department: "Operations", subject: "Safety boots", description: "I need new safety boots and a reflective vest." },
  { department: "Operations", subject: "Licence disc", description: "The licence disc on truck 7 expires next week." },
  { department: "Operations", subject: "Route change", description: "The road to the Midrand customer is closed, we need a new route." },
  { department: "Operations", subject: "Loading bay", description: "The loading bay door is stuck and trucks can't load." },
  { department: "Operations", subject: "Tyre puncture", description: "Truck 3 has a puncture and needs a new tyre." },
  { department: "Operations", subject: "Schedule clash", description: "Two drivers have been scheduled for the same truck tomorrow." },
];

// How a name and a depot appear in a request: the way people really sign off.
export function withName(r: BiasRequest, name: string) {
  return { subject: r.subject, description: `${r.description}\n\nThanks, ${name}` };
}
export function withDepot(r: BiasRequest, depot: string) {
  return { subject: r.subject, description: `I work at ${depot}. ${r.description}` };
}
