# Classifier results (tfidf-logreg-v2)

Scores below: trained on 42109 tickets (38269 real, 3840 synthetic), tested on tickets it never saw. The exported model is then retrained on all 52637 tickets.

## Real tickets not seen in training: accuracy 90.0% (target 85%)

| Actual \ Predicted | Finance | HR | IT | Operations |
|---|---|---|---|---|
| **Finance** | 490 | 17 | 60 | 18 |
| **HR** | 9 | 2008 | 269 | 36 |
| **IT** | 53 | 343 | 5697 | 80 |
| **Operations** | 1 | 21 | 47 | 419 |

```
              precision    recall  f1-score   support

     Finance       0.89      0.84      0.86       585
          HR       0.84      0.86      0.85      2322
          IT       0.94      0.92      0.93      6173
  Operations       0.76      0.86      0.80       488

    accuracy                           0.90      9568
   macro avg       0.86      0.87      0.86      9568
weighted avg       0.90      0.90      0.90      9568
```

## Synthetic tickets from scenarios not seen in training: accuracy 68.6%

Held-out scenario ids: [4, 5, 12, 19, 23, 28, 34, 38]

| Actual \ Predicted | Finance | HR | IT | Operations |
|---|---|---|---|---|
| **Finance** | 148 | 0 | 77 | 15 |
| **HR** | 0 | 171 | 69 | 0 |
| **IT** | 0 | 0 | 203 | 37 |
| **Operations** | 0 | 0 | 103 | 137 |

```
              precision    recall  f1-score   support

     Finance       1.00      0.62      0.76       240
          HR       1.00      0.71      0.83       240
          IT       0.45      0.85      0.59       240
  Operations       0.72      0.57      0.64       240

    accuracy                           0.69       960
   macro avg       0.79      0.69      0.71       960
weighted avg       0.79      0.69      0.71       960
```

## Known limits

- HR, Finance and Operations labels in the real data come from keyword rules (data/scripts/map_departments.py), so those scores partly measure how well the model learned the rules.
- Synthetic tickets were written from templates; real Kopano Freight requests will be messier. Agents correct wrong routes with the reroute button, and those corrections are the best data for the next model.
