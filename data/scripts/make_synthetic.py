"""S1-06: write synthetic Kopano Freight tickets for HR, Finance, Operations (and some IT).

Why: the Kaggle tickets are office IT requests, so the first model sent depot and
driver requests ("fuel card declined", "forklift needs a service") to IT. These
tickets teach it how Kopano Freight staff actually write.

How: each scenario below is one kind of request, with a few ways to write the
subject and description. Slots like {depot} and {amount} are filled at random.
Every ticket keeps its scenario id, so the model can be tested on scenarios it
never saw in training (a fair test, not a memory test).

Run from the repo root:  python data/scripts/make_synthetic.py
Output: data/processed/synthetic_tickets.csv
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

OUT = Path("data/processed/synthetic_tickets.csv")
PER_SCENARIO = 120  # tickets written per scenario
SEED = 2026

DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"]
SLOTS = {
    "depot": ["City Deep", "Pomona", "Head Office", "the City Deep depot", "the Pomona depot"],
    "truck": ["KF-T214", "KF-T087", "KF-T331", "KF-T150", "KF-T402", "truck 19", "the Scania", "the Volvo FH"],
    "route": ["Pomona", "Durban", "Polokwane", "Rustenburg", "Bloemfontein", "the N3 route", "the Kempton Park run"],
    "garage": ["Engen in Alberton", "Shell on the N3", "Sasol in Germiston", "BP in Kempton Park", "Total in Midrand"],
    "amount": ["R450", "R1,250", "R890", "R2,300", "R3,600", "R780", "R5,100"],
    "month": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October"],
    "days": ["two", "three", "five", "ten", "a few"],
    "supplier": ["Bidvest", "Tyre Corp", "Fleet Parts SA", "Clean Co", "Sasol Lubricants", "the forklift supplier"],
    "manager": ["my supervisor", "my shift manager", "the depot manager", "my team lead"],
    "item": ["safety boots", "a reflective vest", "gloves", "a hard hat", "a rain jacket", "overalls"],
}

# Each scenario: (department, priority choices, [subjects], [descriptions])
SCENARIOS = [
    # ---------------- HR ----------------
    ("HR", ["medium", "high"], ["Payslip missing overtime", "Overtime not paid", "Wrong overtime on payslip"],
     ["My payslip for {month} doesn't show the overtime I worked at {depot}.",
      "I worked extra shifts in {month} but the overtime is not on my payslip. Please check.",
      "Overtime hours for {month} are missing from my salary."]),
    ("HR", ["medium"], ["Apply for annual leave", "Leave request", "Need leave days"],
     ["I would like to take {days} days annual leave next month. How do I apply?",
      "Please help me book {days} days leave, {manager} has approved it.",
      "Can I see how many leave days I have left this year?"]),
    ("HR", ["high", "medium"], ["Sick leave not captured", "Sick note submitted", "Sick days deducted from leave"],
     ["I was off sick for {days} days and gave a doctor's note but it was taken from my annual leave.",
      "My sick note from last week has not been captured on the system.",
      "Please capture my sick leave, I sent the doctor's note to {manager}."]),
    ("HR", ["medium"], ["Medical aid question", "Add my baby to medical aid", "Medical aid deduction"],
     ["I want to add my new baby to my medical aid. What forms do I need?",
      "The medical aid deduction on my payslip went up this month, why?",
      "How do I change my medical aid plan?"]),
    ("HR", ["low", "medium"], ["IRP5 certificate", "Need my tax certificate", "Tax certificate for SARS"],
     ["I need my IRP5 for my tax return, where can I get it?",
      "SARS is asking for my tax certificate, please send my IRP5.",
      "I can't find my IRP5 for last year."]),
    ("HR", ["medium"], ["Change my bank details", "New bank account for salary", "Update banking details"],
     ["I opened a new bank account, please pay my salary into it from next month.",
      "Please update my banking details for my salary.",
      "My salary must go to my new account, how do I change it?"]),
    ("HR", ["high"], ["Complaint about supervisor", "Grievance", "Problem with my manager"],
     ["I want to lodge a grievance about how {manager} speaks to drivers at {depot}.",
      "I need to talk to HR privately about a problem with {manager}.",
      "There is a conflict with {manager} and I don't know who to speak to."]),
    ("HR", ["low"], ["Training course", "Forklift licence training", "Driver training"],
     ["Can I be booked for the forklift licence course?",
      "I'd like to go on the defensive driving training. Who do I ask?",
      "When is the next first aid training at {depot}?"]),
    ("HR", ["medium"], ["UIF letter", "Proof of employment", "Employment letter"],
     ["I need a letter confirming my employment for the bank.",
      "Please send me a proof of employment letter for my lease.",
      "I need my UIF documents."]),
    ("HR", ["medium"], ["Shift roster", "Night shift allowance", "Shift allowance missing"],
     ["My night shift allowance for {month} was not paid.",
      "I was moved to night shift but my allowance didn't change.",
      "Shift allowance is missing on my payslip."]),
    ("HR", ["low", "medium"], ["New employee onboarding", "Starter paperwork", "New driver starting"],
     ["A new driver starts at {depot} on Monday. What paperwork does he need?",
      "Please send the onboarding forms for our new starter.",
      "We have a new staff member joining, how do we set up the contract?"]),
    ("HR", ["low"], ["Resignation", "Notice period", "Leaving the company"],
     ["I want to resign. How long is my notice period?",
      "Please confirm my last working day after my resignation letter.",
      "I am leaving at the end of {month}, what happens to my leave days?"]),

    # ---------------- Finance ----------------
    ("Finance", ["high", "urgent"], ["Fuel card declined", "Fuel card not working", "Card declined at the pump"],
     ["My fuel card was declined at the {garage} and I paid {amount} for diesel myself.",
      "The fuel card for {truck} didn't work at the {garage} this morning.",
      "Fuel card keeps getting declined, I'm on the road to {route}."]),
    ("Finance", ["medium"], ["Claim back money", "Reimbursement for diesel", "Expense claim"],
     ["I paid {amount} out of my own pocket for fuel. How do I claim it back?",
      "Please reimburse me {amount} for tolls on the trip to {route}.",
      "I submitted an expense claim for {amount} last month and haven't been paid."]),
    ("Finance", ["medium", "high"], ["Supplier invoice not paid", "Invoice overdue", "Supplier chasing payment"],
     ["{supplier} says their invoice for {amount} is overdue.",
      "We received a reminder from {supplier}, the invoice is 60 days late.",
      "Please pay the {supplier} invoice, they are threatening to stop deliveries."]),
    ("Finance", ["medium"], ["Purchase order needed", "Need a PO", "Raise a purchase order"],
     ["Can you raise a purchase order for {supplier} for new tyres?",
      "I need a PO number before {supplier} will deliver.",
      "Please create a purchase order for {amount} of cleaning supplies."]),
    ("Finance", ["medium"], ["Toll fees", "E-toll account", "Toll gate charges"],
     ["The toll fees on the {route} trip were charged to my personal card.",
      "Who pays the e-toll account for {truck}?",
      "We got toll charges of {amount} that don't match our trips."]),
    ("Finance", ["low", "medium"], ["Petty cash", "Petty cash top up", "Cash float"],
     ["The petty cash at {depot} is finished, can it be topped up?",
      "I need {amount} petty cash for depot supplies.",
      "How do I reconcile the petty cash slips for {month}?"]),
    ("Finance", ["medium"], ["Travel allowance", "Subsistence allowance", "Meal allowance on long trips"],
     ["I drove to {route} overnight but didn't get my subsistence allowance.",
      "What is the meal allowance for long-distance trips?",
      "My travel allowance for {month} is wrong."]),
    ("Finance", ["low"], ["Budget for depot", "Quote approval", "Approve spending"],
     ["We need approval to spend {amount} on new pallets for {depot}.",
      "Who approves the quote from {supplier}?",
      "How much budget is left for {depot} maintenance this year?"]),
    ("Finance", ["high"], ["Double charged", "Duplicate payment", "Charged twice"],
     ["{supplier} was paid twice for the same invoice of {amount}.",
      "My fuel card shows two charges of {amount} for one fill-up.",
      "We were billed twice for the same delivery."]),
    ("Finance", ["medium"], ["Customer credit note", "Credit note request", "Refund to customer"],
     ["A customer was overcharged {amount} on their delivery, please issue a credit note.",
      "Can Finance refund the customer for the damaged load?",
      "The customer wants a credit note for the late delivery."]),

    # ---------------- Operations ----------------
    ("Operations", ["urgent", "high"], ["Truck broke down", "Breakdown on the road", "Truck won't start"],
     ["{truck} broke down on the way to {route}. I need a tow.",
      "My truck won't start at {depot}, the load must leave today.",
      "Breakdown on {route}, the engine overheated."]),
    ("Operations", ["medium", "high"], ["Forklift needs a service", "Forklift broken", "Forklift leaking oil"],
     ["The forklift at {depot} is leaking oil and needs a service.",
      "Forklift number 3 won't lift, we can't load the trucks.",
      "Please book the forklift service at {depot}."]),
    ("Operations", ["low", "medium"], ["Safety gear", "Need new PPE", "Replacement protective clothing", "Replacement {item}", "{item} replacement", "New {item} needed"],
     ["I need {item} at {depot}.",
      "My {item} is worn out, can I get a replacement?",
      "New drivers at {depot} don't have {item} yet."]),
    ("Operations", ["medium", "high"], ["Delivery delayed", "Late delivery", "Customer waiting for load"],
     ["The delivery to {route} is running late because of traffic.",
      "The customer in {route} is still waiting for their load.",
      "We are two hours behind on the {route} delivery."]),
    ("Operations", ["medium"], ["Route change", "New route", "Change delivery route"],
     ["Can the {route} route be changed because of road works?",
      "Please plan a new route for the Monday deliveries.",
      "The road on the {route} route is closed, what is the alternative?"]),
    ("Operations", ["high"], ["Tyre blowout", "Flat tyre", "Tyres need replacing"],
     ["{truck} had a tyre blowout near {route}.",
      "The tyres on {truck} are worn and need replacing.",
      "Flat tyre on the trailer at {depot}."]),
    ("Operations", ["medium"], ["Truck service due", "Vehicle licence expired", "Roadworthy test"],
     ["{truck} is due for its service.",
      "The licence disc on {truck} expired last week.",
      "Please book the roadworthy test for {truck}."]),
    ("Operations", ["urgent", "high"], ["Accident at the depot", "Load fell over", "Safety incident"],
     ["A pallet fell off the forklift at {depot}, nobody was hurt but the load is damaged.",
      "There was a minor accident with {truck} in the yard.",
      "I want to report a safety incident at {depot}."]),
    ("Operations", ["medium"], ["Warehouse space", "Loading bay blocked", "Stock in the warehouse"],
     ["The loading bay at {depot} is blocked by pallets.",
      "We don't have space in the warehouse for the new stock.",
      "Who moves the old stock out of the {depot} warehouse?"]),
    ("Operations", ["medium"], ["Dispatch schedule", "Driver schedule", "Who drives tomorrow"],
     ["I haven't received my dispatch schedule for tomorrow.",
      "Please confirm which driver takes the {route} load.",
      "The schedule says two drivers for {truck}, which one is it?"]),
    ("Operations", ["medium"], ["Trailer damage", "Trailer door broken", "Damaged cargo"],
     ["The trailer door on {truck} doesn't close properly.",
      "The cargo was damaged inside the trailer on the {route} trip.",
      "The trailer floor is damaged and needs repair."]),
    ("Operations", ["high"], ["Tracker not working", "Vehicle tracker offline", "GPS tracking"],
     ["The vehicle tracker on {truck} has been offline since yesterday.",
      "Control room can't see {truck} on the tracking system.",
      "Tracking shows {truck} in the wrong place."]),

    # ---------------- IT (Kopano devices, so IT isn't only office language) ----------------
    ("IT", ["high"], ["Handheld scanner won't sync", "Scanner not working", "Barcode scanner broken"],
     ["The handheld scanner at {depot} won't sync the deliveries.",
      "My barcode scanner keeps freezing during loading.",
      "The scanner battery doesn't charge anymore."]),
    ("IT", ["medium"], ["Tablet in the truck", "Driver tablet frozen", "Proof of delivery app"],
     ["The tablet in {truck} is frozen and I can't capture the proof of delivery.",
      "The delivery app on my tablet keeps logging me out.",
      "I can't sign in to the proof of delivery app."]),
    ("IT", ["medium"], ["Computer won't start", "Desktop broke", "PC not switching on"],
     ["The desktop computer in the {depot} office won't switch on.",
      "My computer screen is black after the update.",
      "The PC at reception keeps restarting."]),
    ("IT", ["medium"], ["Printer jammed", "Can't print waybills", "Printer offline"],
     ["The printer at {depot} is jammed and we can't print the waybills.",
      "The printer shows offline on my laptop.",
      "Delivery notes are printing blank."]),
    ("IT", ["high"], ["Forgot my password", "Locked out of my account", "Password reset"],
     ["I forgot my password and I'm locked out.",
      "My account is locked after too many tries.",
      "Please reset my email password."]),
    ("IT", ["medium"], ["Wi-Fi not working", "No internet at the depot", "Network down"],
     ["There is no internet at {depot} since this morning.",
      "The Wi-Fi in the warehouse office keeps dropping.",
      "The network is down, we can't send invoices."]),
]


def fill(text, rng):
    for key, values in SLOTS.items():
        text = text.replace("{" + key + "}", rng.choice(values))
    return text


def main():
    rng = random.Random(SEED)
    now = datetime(2026, 10, 29)
    rows = []
    for scenario_id, (dept, priorities, subjects, descriptions) in enumerate(SCENARIOS):
        for _ in range(PER_SCENARIO):
            created = now - timedelta(days=rng.randint(0, 364), minutes=rng.randint(0, 1439))
            rows.append({
                "subject": fill(rng.choice(subjects), rng),
                "description": fill(rng.choice(descriptions), rng),
                "department": dept,
                "priority": rng.choice(priorities),
                "depot": rng.choice(DEPOTS),
                "created_at": created.strftime("%Y-%m-%dT%H:%M:00+02:00"),
                "source": "synthetic",
                "scenario_id": scenario_id,
            })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    counts = {}
    for r in rows:
        counts[r["department"]] = counts.get(r["department"], 0) + 1
    print(f"Wrote {len(rows)} tickets to {OUT}: {counts}")


if __name__ == "__main__":
    main()
