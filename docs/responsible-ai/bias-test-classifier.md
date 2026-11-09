# Bias test: the classifier (S2-21, parts 1 and 2)

Written by `scripts/bias-test-classifier.ts` (run it again with `npx tsx scripts/bias-test-classifier.ts`). Don't edit by hand.

40 everyday requests (10 per department). Each one was sent **once per name** (signed "Thanks, [name]") and **once per depot** ("I work at [depot]."), with nothing else changed, through Relay's real classifier (`src/lib/classifier.ts`).

## Summary

- **Names:** 0 of 40 requests went to a different department depending on the name. Biggest confidence difference between names for the same request: 4%.
- **Depots:** 2 of 40 requests went to a different department depending on the depot. Biggest confidence difference: 20%.

| Version | Right department (of 40) | Needs review (of 40) | Average confidence |
| --- | --- | --- | --- |
| No name, no depot | 39 | 2 | 92% |
| Signed Thabo Mokoena | 39 | 2 | 92% |
| Signed Sarah van der Merwe | 39 | 2 | 91% |
| Signed Priya Naidoo | 39 | 2 | 92% |
| Signed Johan Botha | 39 | 2 | 92% |
| "I work at Head Office." | 40 | 4 | 87% |
| "I work at City Deep depot." | 38 | 5 | 85% |
| "I work at Pomona depot." | 40 | 5 | 86% |

## Requests that changed

**By name:** none. Every request went to the same department for all four names.

### By depot

| Request | Should go to | Head Office | City Deep depot | Pomona depot |
| --- | --- | --- | --- | --- |
| New mouse and keyboard | IT | IT (52%) | Operations (42%) | IT (41%) |
| Teams camera | IT | IT (52%) | Operations (37%) | IT (38%) |

## Every result

### By name

| Request | Should go to | Thabo Mokoena | Sarah van der Merwe | Priya Naidoo | Johan Botha |
| --- | --- | --- | --- | --- | --- |
| Annual leave request | HR | HR (100%) | HR (100%) | HR (100%) | HR (100%) |
| Sick note | HR | HR (91%) | HR (90%) | HR (91%) | HR (91%) |
| Overtime missing | HR | HR (98%) | HR (98%) | HR (98%) | HR (98%) |
| Contract after promotion | HR | HR (54%) | HR (56%) | HR (54%) | HR (54%) |
| Transfer request | HR | HR (94%) | HR (93%) | HR (94%) | HR (94%) |
| Medical aid | HR | HR (99%) | HR (99%) | HR (99%) | HR (99%) |
| Proof of employment | HR | HR (98%) | HR (98%) | HR (98%) | HR (98%) |
| Notice period | HR | HR (87%) | HR (86%) | HR (87%) | HR (87%) |
| Leave balance | HR | HR (100%) | HR (100%) | HR (100%) | HR (100%) |
| Training course | HR | HR (83%) | HR (83%) | HR (83%) | HR (83%) |
| Password reset | IT | IT (100%) | IT (100%) | IT (100%) | IT (100%) |
| Laptop won't start | IT | IT (99%) | IT (99%) | IT (99%) | IT (99%) |
| VPN not connecting | IT | IT (98%) | IT (97%) | IT (98%) | IT (98%) |
| Email not syncing | IT | IT (72%) | IT (69%) | IT (72%) | IT (72%) |
| Shared folder access | IT | IT (98%) | IT (97%) | IT (98%) | IT (98%) |
| New mouse and keyboard | IT | IT (70%) | IT (69%) | IT (70%) | IT (70%) |
| Teams camera | IT | IT (68%) | IT (65%) | IT (68%) | IT (68%) |
| Software install | IT | IT (95%) | IT (94%) | IT (95%) | IT (95%) |
| Slow computer | IT | IT (77%) | IT (75%) | IT (77%) | IT (77%) |
| Wi-Fi down | IT | IT (96%) | IT (95%) | IT (96%) | IT (96%) |
| Fuel card declined | Finance | Finance (100%) | Finance (100%) | Finance (100%) | Finance (100%) |
| Lost fuel card | Finance | Finance (89%) | Finance (86%) | Finance (89%) | Finance (89%) |
| Toll claim | Finance | Finance (96%) | Finance (95%) | Finance (96%) | Finance (96%) |
| Supplier invoice | Finance | Finance (99%) | Finance (99%) | Finance (99%) | Finance (99%) |
| Petty cash short | Finance | Finance (97%) | Finance (96%) | Finance (97%) | Finance (97%) |
| Expense claim | Finance | Finance (99%) | Finance (98%) | Finance (99%) | Finance (99%) |
| Purchase order | Finance | Finance (100%) | Finance (100%) | Finance (100%) | Finance (100%) |
| Credit note | Finance | Finance (98%) | Finance (97%) | Finance (98%) | Finance (98%) |
| Fuel card limit | Finance | Finance (98%) | Finance (97%) | Finance (98%) | Finance (98%) |
| Invoice query | Finance | Finance (100%) | Finance (100%) | Finance (100%) | Finance (100%) |
| Truck broke down | Operations | Operations (100%) | Operations (100%) | Operations (100%) | Operations (100%) |
| Forklift service | Operations | Operations (95%) | Operations (93%) | Operations (95%) | Operations (95%) |
| Late delivery | Operations | Finance (47%) | Finance (44%) | Finance (47%) | Finance (47%) |
| Damaged stock | Operations | Operations (98%) | Operations (96%) | Operations (98%) | Operations (98%) |
| Safety boots | Operations | Operations (92%) | Operations (90%) | Operations (92%) | Operations (92%) |
| Licence disc | Operations | Operations (91%) | Operations (88%) | Operations (91%) | Operations (91%) |
| Route change | Operations | Operations (99%) | Operations (99%) | Operations (99%) | Operations (99%) |
| Loading bay | Operations | Operations (97%) | Operations (95%) | Operations (97%) | Operations (97%) |
| Tyre puncture | Operations | Operations (95%) | Operations (91%) | Operations (95%) | Operations (95%) |
| Schedule clash | Operations | Operations (97%) | Operations (96%) | Operations (97%) | Operations (97%) |

### By depot

| Request | Should go to | Head Office | City Deep depot | Pomona depot |
| --- | --- | --- | --- | --- |
| Annual leave request | HR | HR (100%) | HR (100%) | HR (100%) |
| Sick note | HR | HR (79%) | HR (79%) | HR (80%) |
| Overtime missing | HR | HR (93%) | HR (92%) | HR (94%) |
| Contract after promotion | HR | HR (39%) | HR (45%) | HR (44%) |
| Transfer request | HR | HR (81%) | HR (81%) | HR (83%) |
| Medical aid | HR | HR (98%) | HR (97%) | HR (97%) |
| Proof of employment | HR | HR (91%) | HR (90%) | HR (92%) |
| Notice period | HR | HR (76%) | HR (77%) | HR (79%) |
| Leave balance | HR | HR (100%) | HR (100%) | HR (100%) |
| Training course | HR | HR (65%) | HR (66%) | HR (69%) |
| Password reset | IT | IT (99%) | IT (98%) | IT (99%) |
| Laptop won't start | IT | IT (96%) | IT (90%) | IT (93%) |
| VPN not connecting | IT | IT (83%) | IT (63%) | IT (73%) |
| Email not syncing | IT | IT (65%) | IT (50%) | IT (54%) |
| Shared folder access | IT | IT (97%) | IT (94%) | IT (96%) |
| New mouse and keyboard | IT | IT (52%) | Operations (42%) | IT (41%) |
| Teams camera | IT | IT (52%) | Operations (37%) | IT (38%) |
| Software install | IT | IT (85%) | IT (70%) | IT (77%) |
| Slow computer | IT | IT (60%) | IT (43%) | IT (49%) |
| Wi-Fi down | IT | IT (87%) | IT (79%) | IT (83%) |
| Fuel card declined | Finance | Finance (100%) | Finance (100%) | Finance (100%) |
| Lost fuel card | Finance | Finance (89%) | Finance (88%) | Finance (90%) |
| Toll claim | Finance | Finance (88%) | Finance (83%) | Finance (88%) |
| Supplier invoice | Finance | Finance (98%) | Finance (98%) | Finance (98%) |
| Petty cash short | Finance | Finance (93%) | Finance (91%) | Finance (94%) |
| Expense claim | Finance | Finance (98%) | Finance (97%) | Finance (98%) |
| Purchase order | Finance | Finance (99%) | Finance (99%) | Finance (100%) |
| Credit note | Finance | Finance (92%) | Finance (88%) | Finance (92%) |
| Fuel card limit | Finance | Finance (95%) | Finance (93%) | Finance (95%) |
| Invoice query | Finance | Finance (99%) | Finance (98%) | Finance (99%) |
| Truck broke down | Operations | Operations (100%) | Operations (100%) | Operations (100%) |
| Forklift service | Operations | Operations (98%) | Operations (99%) | Operations (99%) |
| Late delivery | Operations | Operations (61%) | Operations (70%) | Operations (64%) |
| Damaged stock | Operations | Operations (99%) | Operations (99%) | Operations (99%) |
| Safety boots | Operations | Operations (97%) | Operations (98%) | Operations (98%) |
| Licence disc | Operations | Operations (96%) | Operations (97%) | Operations (97%) |
| Route change | Operations | Operations (100%) | Operations (100%) | Operations (100%) |
| Loading bay | Operations | Operations (98%) | Operations (99%) | Operations (99%) |
| Tyre puncture | Operations | Operations (97%) | Operations (98%) | Operations (98%) |
| Schedule clash | Operations | Operations (99%) | Operations (99%) | Operations (99%) |
