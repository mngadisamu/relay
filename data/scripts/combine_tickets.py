"""S1-06: build one balanced dataset of past tickets, every ticket with a date, depot and priority.

Why: the real Kaggle tickets have no date, depot or priority, and there are about
8 times more IT tickets than Finance or Operations ones. This script:
  1. joins the real tickets (S1-02) and the Kopano Freight synthetic tickets (S1-06),
  2. balances them: about the same number of tickets per department,
  3. gives every ticket a realistic date, depot and priority, and the times it was
     answered and closed, so the Sprint 2 dashboard and Sprint 3 forecasting have
     believable history to work with.
The S1-17 seed script loads the result into the database (the reference column
lets it skip tickets it has already loaded).

Run from the repo root (after map_departments.py and make_synthetic.py):
    python data/scripts/combine_tickets.py
Output: data/processed/combined_tickets.csv
"""

import random
from datetime import datetime, timedelta, timezone

import pandas as pd

REAL = "data/processed/tickets_mapped.csv"
SYNTHETIC = "data/processed/synthetic_tickets.csv"
OUT = "data/processed/combined_tickets.csv"

PER_DEPARTMENT = 3900  # tickets per department; Operations has ~3,900 in total, so the others match it
SEED = 2026
SAST = timezone(timedelta(hours=2))
END = datetime(2026, 10, 19, 0, 0, tzinfo=SAST)  # history stops when Relay went live (Sprint 1 start)
START = END - timedelta(days=365)

DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"]
# Where requests come from: office departments are mostly Head Office, Operations mostly the depots.
DEPOT_WEIGHTS = {
    "HR": [0.4, 0.3, 0.3],
    "IT": [0.5, 0.25, 0.25],
    "Finance": [0.5, 0.25, 0.25],
    "Operations": [0.1, 0.45, 0.45],
}
PRIORITIES = ["low", "medium", "high", "urgent"]
PRIORITY_WEIGHTS = [0.2, 0.5, 0.22, 0.08]
# Typical hours until a reply, by priority (urgent tickets are answered faster).
REPLY_HOURS = {"urgent": (0.5, 4), "high": (2, 24), "medium": (4, 48), "low": (8, 96)}

rng = random.Random(SEED)


def random_created_at() -> datetime:
    """A realistic time: mostly weekdays 07:00-17:00, busier on Mondays,
    a little busier at month-end (payslips, invoices) and in winter (Jun-Aug)."""
    while True:
        day = START + timedelta(days=rng.randrange(365))
        weekday = day.weekday()  # 0 = Monday
        weight = {0: 1.3, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.25, 6: 0.1}[weekday]
        if day.day >= 25:
            weight *= 1.25
        if day.month in (6, 7, 8):
            weight *= 1.15
        if rng.random() < weight / 1.6:
            break
    hour = min(23, max(5, int(rng.gauss(10.5, 2.8))))  # peak mid-morning
    return day.replace(hour=hour, minute=rng.randrange(60))


def subject_from(text: str) -> str:
    """The Kaggle tickets have no subject line, so use their first few words."""
    words = str(text).split()
    subject = " ".join(words[:7])
    return (subject[:1].upper() + subject[1:]) if subject else "Request"


def main():
    real = pd.read_csv(REAL)
    real = pd.DataFrame({
        "subject": real["Document"].map(subject_from),
        "description": real["Document"].fillna(""),
        "department": real["department"],
        "source": "real",
    })
    syn = pd.read_csv(SYNTHETIC)[["subject", "description", "department", "priority", "depot", "source"]]

    # Balance: keep every synthetic ticket (they carry the Kopano Freight context),
    # then fill each department up to PER_DEPARTMENT with a random sample of real ones.
    parts = []
    for dept in ["HR", "IT", "Finance", "Operations"]:
        s = syn[syn["department"] == dept]
        r = real[real["department"] == dept]
        need = max(0, PER_DEPARTMENT - len(s))
        parts += [s, r.sample(n=min(need, len(r)), random_state=SEED)]
    df = pd.concat(parts, ignore_index=True)

    # Every ticket gets a date, depot and priority. Real tickets had none, so they're assigned here
    # (the data dictionary says so). Synthetic tickets keep their priority and depot.
    df["priority"] = [p if isinstance(p, str) else rng.choices(PRIORITIES, PRIORITY_WEIGHTS)[0] for p in df.get("priority")]
    df["depot"] = [d if isinstance(d, str) else rng.choices(DEPOTS, DEPOT_WEIGHTS[dept])[0] for d, dept in zip(df["depot"], df["department"])]

    created, answered, closed = [], [], []
    for p in df["priority"]:
        c = random_created_at()
        lo, hi = REPLY_HOURS[p]
        a = c + timedelta(hours=rng.uniform(lo, hi))
        x = a + timedelta(hours=rng.uniform(2, 72))  # closed once the staff member confirms
        created.append(c)
        answered.append(a)
        closed.append(x)
    df["created_at"] = created
    df["answered_at"] = answered
    df["closed_at"] = closed
    df["status"] = "closed"  # all past tickets are finished

    # Oldest first, then a stable reference for each ticket. The seed script uses the
    # reference to skip tickets that are already in the database, so running it twice is safe.
    df = df.sort_values("created_at", kind="stable").reset_index(drop=True)
    df["reference"] = [f"KF-{c:%y%m%d}-H{i:05d}" for i, c in enumerate(df["created_at"], start=1)]
    for col in ["created_at", "answered_at", "closed_at"]:
        df[col] = df[col].map(lambda t: t.isoformat(timespec="minutes"))

    cols = ["reference", "subject", "description", "department", "priority", "depot", "status",
            "created_at", "answered_at", "closed_at", "source"]
    df[cols].to_csv(OUT, index=False)

    print(f"Wrote {len(df)} tickets to {OUT}")
    print(df.groupby(["department", "source"]).size().unstack(fill_value=0))
    print("Dates from", df["created_at"].min(), "to", df["created_at"].max())


if __name__ == "__main__":
    main()
