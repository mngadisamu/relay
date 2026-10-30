# Relay data (Sprint 1)

| File | Story | What it is |
| --- | --- | --- |
| `raw/all_tickets_processed_improved_v3.csv` | S1-02 | Kaggle *IT Service Ticket Classification* dataset, unchanged. Text is already cleaned (lower case, no numbers or punctuation). |
| `processed/tickets_mapped.csv` | S1-02 | The Kaggle tickets with a Relay department added by `scripts/map_departments.py`. |
| `processed/synthetic_tickets.csv` | S1-06 | Kopano Freight tickets written by `scripts/make_synthetic.py`, mostly HR, Finance and Operations. |

Rebuild everything and retrain the model from the repo root:

```
python data/scripts/map_departments.py
python data/scripts/make_synthetic.py
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

## Honest limits (say these to the panel)

- The real tickets are office IT requests. HR, Finance and Operations labels come from keyword rules, not people.
- Synthetic tickets come from templates, so they're cleaner than real ones. The real test is how often agents have to reroute a ticket; those reroutes are saved and become training data for the next model.
