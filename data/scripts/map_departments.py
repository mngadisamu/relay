from pathlib import Path
import pandas as pd

RAW = Path("data/raw/all_tickets_processed_improved_v3.csv")
OUT = Path("data/processed/tickets_mapped.csv")

BASE = {
    "Hardware": "IT",
    "Access": "IT",
    "Storage": "IT",
    "Administrative rights": "IT",
    "Miscellaneous": "IT",
    "HR Support": "HR",
    "Purchase": "Finance",
    "Internal Project": "Operations",
}

FIN = r"expense|invoice|invoicing|payment|billing|budget|\bpo\b|purchase|receipt"
HR = r"leave|payslip|salary|starter|leaver|onboard|offboard|career|training|recruit|employee|timesheet|time sheet"
OPS = r"project|setup|dispatch|depot|route|shipment|schedule"


def map_departments(df):
    txt = df["Document"].str.lower()
    dept = df["Topic_group"].map(BASE)
    misc = df["Topic_group"].eq("Miscellaneous")
    proj = df["Topic_group"].eq("Internal Project")
    fin_hit = txt.str.contains(FIN)
    hr_hit = txt.str.contains(HR)
    ops_hit = txt.str.contains(OPS)

    dept[misc & fin_hit] = "Finance"
    dept[misc & ~fin_hit & hr_hit] = "HR"
    dept[misc & ~fin_hit & ~hr_hit & ops_hit] = "Operations"
    dept[proj & fin_hit] = "Finance"
    dept[proj & ~fin_hit & hr_hit] = "HR"

    df = df.copy()
    df["department"] = dept
    df["mapping_note"] = "category:" + df["Topic_group"]
    return df


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    mapped = map_departments(pd.read_csv(RAW))
    assert mapped["department"].notna().all(), "unmapped tickets found"
    mapped.to_csv(OUT, index=False)
    print(mapped["department"].value_counts())