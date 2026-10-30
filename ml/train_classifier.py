"""S1-10 / S1-16: train the Relay classifier and export it for the app.

Same steps as the Colab notebook, as a script anyone can re-run:
    python data/scripts/make_synthetic.py
    python ml/train_classifier.py

Inputs:  data/processed/tickets_mapped.csv     (real Kaggle IT tickets, mapped to departments, S1-02)
         data/processed/synthetic_tickets.csv  (Kopano Freight tickets, S1-06)
Outputs: ml/model/classifier-model.json        (read by src/lib/classifier.ts)
         ml/model/metrics.md                   (accuracy and confusion matrices for the panel)
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

VERSION = "tfidf-logreg-v2"
CLASSES = ["Finance", "HR", "IT", "Operations"]
SEED = 42

# These settings are copied into the JSON so the TypeScript code prepares text
# exactly the same way. Change one here and the app follows automatically.
PREPROCESSING = {
    "lowercase": True,
    "token_pattern": r"\b[a-z][a-z]+\b",  # words of 2+ letters; digits and punctuation are ignored
    "ngram_range": [1, 2],                # single words and pairs ("fuel card")
    "stop_words": None,
    "sublinear_tf": True,                 # tf = 1 + log(count)
    "norm": "l2",
}

real = pd.read_csv("data/processed/tickets_mapped.csv")
real = pd.DataFrame({"text": real["Document"].fillna(""), "department": real["department"], "source": "real"})

syn = pd.read_csv("data/processed/synthetic_tickets.csv")
syn = pd.DataFrame({
    "text": syn["subject"] + ". " + syn["description"],
    "department": syn["department"],
    "source": "synthetic",
    "scenario_id": syn["scenario_id"],
})

# Real tickets: hold out 20%, keeping the department mix the same.
real_train, real_test = train_test_split(real, test_size=0.2, stratify=real["department"], random_state=SEED)

# Synthetic tickets: hold out whole scenarios (two per department), so the test
# uses kinds of requests the model has never seen. Otherwise it would just be
# recognising the same sentences again and the score would mean nothing.
rng = np.random.default_rng(SEED)
held_out = []
for dept in CLASSES:
    ids = sorted(syn.loc[syn["department"] == dept, "scenario_id"].unique())
    held_out += list(rng.choice(ids, size=2, replace=False))
syn_test = syn[syn["scenario_id"].isin(held_out)]
syn_train = syn[~syn["scenario_id"].isin(held_out)]

train = pd.concat([real_train, syn_train], ignore_index=True)

vectorizer = TfidfVectorizer(
    lowercase=PREPROCESSING["lowercase"],
    token_pattern=r"(?u)" + PREPROCESSING["token_pattern"],
    ngram_range=tuple(PREPROCESSING["ngram_range"]),
    stop_words=PREPROCESSING["stop_words"],
    sublinear_tf=PREPROCESSING["sublinear_tf"],
    norm=PREPROCESSING["norm"],
    min_df=3,          # ignore words seen fewer than 3 times (typos, names)
    max_features=40000,
)
X_train = vectorizer.fit_transform(train["text"])

# class_weight="balanced": there are far more IT tickets, so each Finance or
# Operations ticket counts for more. Without it, unsure tickets drift to IT.
model = LogisticRegression(max_iter=3000, class_weight="balanced", C=4.0)
model.fit(X_train, train["department"])
assert list(model.classes_) == CLASSES


def report(name, df):
    pred = model.predict(vectorizer.transform(df["text"]))
    acc = accuracy_score(df["department"], pred)
    cm = confusion_matrix(df["department"], pred, labels=CLASSES)
    text = classification_report(df["department"], pred, labels=CLASSES, zero_division=0)
    print(f"\n== {name}: accuracy {acc:.3f} on {len(df)} tickets\n{text}\n{cm}")
    return acc, cm, text


acc_real, cm_real, rep_real = report("Real tickets not seen in training", real_test)
acc_syn, cm_syn, rep_syn = report("Synthetic tickets from unseen scenarios", syn_test)


def cm_table(cm):
    head = "| Actual \\ Predicted | " + " | ".join(CLASSES) + " |\n|---|" + "---|" * len(CLASSES) + "\n"
    return head + "".join(f"| **{c}** | " + " | ".join(str(v) for v in row) + " |\n" for c, row in zip(CLASSES, cm))


Path("ml/model").mkdir(parents=True, exist_ok=True)
Path("ml/model/metrics.md").write_text(
    f"# Classifier results ({VERSION})\n\n"
    f"Scores below: trained on {len(train)} tickets ({len(real_train)} real, {len(syn_train)} synthetic), "
    f"tested on tickets it never saw. The exported model is then retrained on all {len(real) + len(syn)} tickets.\n\n"
    f"## Real tickets not seen in training: accuracy {acc_real:.1%} (target 85%)\n\n{cm_table(cm_real)}\n```\n{rep_real}```\n\n"
    f"## Synthetic tickets from scenarios not seen in training: accuracy {acc_syn:.1%}\n\n"
    f"Held-out scenario ids: {sorted(int(i) for i in held_out)}\n\n{cm_table(cm_syn)}\n```\n{rep_syn}```\n\n"
    "## Known limits\n\n"
    "- HR, Finance and Operations labels in the real data come from keyword rules (data/scripts/map_departments.py), "
    "so those scores partly measure how well the model learned the rules.\n"
    "- Synthetic tickets were written from templates; real Kopano Freight requests will be messier. "
    "Agents correct wrong routes with the reroute button, and those corrections are the best data for the next model.\n",
    encoding="utf-8",
)

# The scores above are from held-out tickets. For the model the app uses, train
# once more on every ticket (including the held-out ones), so nothing is wasted.
all_tickets = pd.concat([real, syn], ignore_index=True)
X_all = vectorizer.fit_transform(all_tickets["text"])
model.fit(X_all, all_tickets["department"])
assert list(model.classes_) == CLASSES

# Export. Numbers are rounded to keep the file small; the predictions don't change.
vocab = {term: int(i) for term, i in vectorizer.vocabulary_.items()}
export = {
    "version": VERSION,
    "classes": CLASSES,
    "preprocessing": PREPROCESSING,
    "vocabulary": vocab,
    "idf": [round(float(x), 5) for x in vectorizer.idf_],
    "coef": [[round(float(x), 5) for x in row] for row in model.coef_],
    "intercept": [round(float(x), 5) for x in model.intercept_],
    "metrics": {"accuracy_real": round(acc_real, 4), "accuracy_synthetic": round(acc_syn, 4)},
}
Path("ml/model/classifier-model.json").write_text(json.dumps(export, separators=(",", ":")), encoding="utf-8")
print(f"\nSaved ml/model/classifier-model.json ({len(vocab)} terms)")
