# Relay data (Sprint 1)

| File | Story | What it is |
| --- | --- | --- |
| `raw/all_tickets_processed_improved_v3.csv` | S1-02 | Kaggle *IT Service Ticket Classification* dataset, unchanged. Text is already cleaned (lower case, no numbers or punctuation). |
| `processed/tickets_mapped.csv` | S1-02 | The Kaggle tickets with a Relay department added by `scripts/map_departments.py`. |
| `processed/synthetic_tickets.csv` | S1-06 | Kopano Freight tickets written by `scripts/make_synthetic.py`, mostly HR, Finance and Operations. |
| `processed/combined_tickets.csv` | S1-06, S1-17 | **The combined dataset**: real and synthetic tickets together, balanced per department, every ticket with a date, depot and priority. Built by `scripts/combine_tickets.py`; the S1-17 seed script loads it into the database. |

Rebuild everything and retrain the model from the repo root:

```
python data/scripts/map_departments.py
python data/scripts/make_synthetic.py
python data/scripts/combine_tickets.py
python ml/train_classifier.py
```

## Data dictionary

### `processed/tickets_mapped.csv` (real, 47,837 tickets)

| Column | Type | Meaning |
| --- | --- | --- |
| `Document` | text | The ticket text from Kaggle (already cleaned) |
| `Topic_group` | text | Kaggle's original category, e.g. Hardware, Access, HR Support, Purchase |
| `department` | HR / IT / Finance / Operations | Relay department, from the category plus keyword rules |
| `mapping_note` | text | Which Kaggle category the department came from |

### `processed/synthetic_tickets.csv` (synthetic, 4,800 tickets)

| Column | Type | Meaning |
| --- | --- | --- |
| `subject` | text | Short title, as a staff member would type it |
| `description` | text | The request, in Kopano Freight's context (depots, trucks, fuel cards, payslips) |
| `department` | HR / IT / Finance / Operations | The correct department |
| `priority` | low / medium / high / urgent | How urgent this kind of request usually is |
| `depot` | Head Office / City Deep depot / Pomona depot | Where the staff member works |
| `created_at` | date and time (SAST) | A random time in the 12 months before 29 Oct 2026 |
| `source` | `synthetic` | Marks the row as written, not real, so accuracy is reported separately |
| `scenario_id` | number | Which kind of request it is. Used to test the model on kinds of requests it never saw |

### `processed/combined_tickets.csv` (combined, 15,579 tickets)

About 3,900 tickets per department: every synthetic ticket, plus a random sample of real ones.

| Column | Type | Meaning |
| --- | --- | --- |
| `reference` | text, e.g. `KF-260614-H04512` | Unique reference for a past ticket. The `H` marks it as history, so it never clashes with live references. The seed script uses it to avoid duplicates |
| `subject` | text | Synthetic: the subject as written. Real: the first seven words of the text (Kaggle tickets have no subject) |
| `description` | text | The ticket text |
| `department` | HR / IT / Finance / Operations | The correct department |
| `priority` | low / medium / high / urgent | Synthetic: chosen for the kind of request. **Real: assigned at random** (50% medium, 22% high, 20% low, 8% urgent) |
| `depot` | Head Office / City Deep depot / Pomona depot | Synthetic: as generated. **Real: assigned at random**, weighted by department (Operations mostly depots, office departments mostly Head Office) |
| `status` | `closed` | All past tickets are finished |
| `created_at` | date and time (SAST) | **Assigned**: 19 Oct 2025 to 18 Oct 2026, mostly weekdays 07:00 to 17:00, busier on Mondays, at month-end and in winter |
| `answered_at` | date and time (SAST) | **Assigned**: a reply time after `created_at` that depends on priority (urgent within 4 hours, low within 4 days) |
| `closed_at` | date and time (SAST) | **Assigned**: 2 to 72 hours after the reply |
| `source` | `real` / `synthetic` | Where the ticket came from |

The dates, depots, priorities and reply times are **made up but realistic**. They give the Sprint 2 dashboard and the Sprint 3 workload forecast a year of believable history. Re-running the script gives exactly the same file (fixed random seed).

## Honest limits (say these to the panel)

- The real tickets are office IT requests. HR, Finance and Operations labels come from keyword rules, not people.
- The dates, depots, priorities and reply times in `combined_tickets.csv` are assigned, not recorded, so dashboard patterns show how Relay would work, not how Kopano Freight really behaves.
- Synthetic tickets come from templates, so they're cleaner than real ones. The real test is how often agents have to reroute a ticket; those reroutes are saved and become training data for the next model.
