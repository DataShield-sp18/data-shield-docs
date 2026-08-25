# Training run output

Real, unedited console output from running the actual training script
(`python -m scripts.train_code_family_classifier`) against the CSV
snapshots committed in `backend/app/data/medical_codes/`. Nothing here is
reconstructed or summarized — this is what the script itself prints,
captured directly from an execution.

```text
[12:41:16] INFO     raw per-family counts: {'NDC': 217557, 'ICD10_PCS': 79115,
                    'ICD10_CM': 74719, 'RXNORM': 47006, 'NPI': 17306, 'HCPCS':
                    8377, 'HCPCS_MODIFIER': 38}
           INFO     dropped 0 ambiguous codes
[12:41:18] INFO     post-cap per-family counts: {'ICD10_CM': 40000, 'ICD10_PCS':
                    40000, 'NDC': 40000, 'RXNORM': 40000, 'NPI': 17306, 'HCPCS':
                    8377, 'HCPCS_MODIFIER': 38}
[12:41:32] INFO     saved artifact ->
                    /Users/rohitagarwal/projects/data-shield/backend/app/data/models/medical_code_family_v1.joblib

╭─────── Test metrics ───────╮
│ accuracy  0.9991           │
│ macro-F1  0.9885           │
│ dropped ambiguous codes  0 │
╰────────────────────────────╯
             Per-family metrics (test split)
┏━━━━━━━━━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━┳━━━━━━━━━┓
┃ family         ┃ precision ┃ recall ┃     f1 ┃ support ┃
┡━━━━━━━━━━━━━━━━╇━━━━━━━━━━━╇━━━━━━━━╇━━━━━━━━╇━━━━━━━━━┩
│ ICD10_CM       │    1.0000 │ 1.0000 │ 1.0000 │    6000 │
│ ICD10_PCS      │    1.0000 │ 0.9962 │ 0.9981 │    6000 │
│ HCPCS          │    1.0000 │ 1.0000 │ 1.0000 │    1257 │
│ HCPCS_MODIFIER │    0.8571 │ 1.0000 │ 0.9231 │       6 │
│ NDC            │    1.0000 │ 1.0000 │ 1.0000 │    6000 │
│ RXNORM         │    0.9962 │ 0.9998 │ 0.9980 │    6000 │
│ NPI            │    1.0000 │ 1.0000 │ 1.0000 │    2596 │
└────────────────┴───────────┴────────┴────────┴─────────┘
                    Confusion matrix (rows=true, cols=pred)
┏━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━┳━━━━━━━━━━┳━━━━━━┳━━━━━━━━┳━━━━━━┓
┃ true \ pred  ┃ ICD10_CM ┃ ICD10_PCS┃ HCPCS ┃ HCPCS_MOD┃  NDC ┃ RXNORM ┃  NPI ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━╇━━━━━━━━━━╇━━━━━━╇━━━━━━━━╇━━━━━━┩
│ ICD10_CM     │     6000 │        0 │     0 │        0 │    0 │      0 │    0 │
│ ICD10_PCS    │        0 │     5977 │     0 │        0 │    0 │     23 │    0 │
│ HCPCS        │        0 │        0 │  1257 │        0 │    0 │      0 │    0 │
│ HCPCS_MODIFIER│       0 │        0 │     0 │        6 │    0 │      0 │    0 │
│ NDC          │        0 │        0 │     0 │        0 │ 6000 │      0 │    0 │
│ RXNORM       │        0 │        0 │     0 │        1 │    0 │   5999 │    0 │
│ NPI          │        0 │        0 │     0 │        0 │    0 │      0 │ 2596 │
└──────────────┴──────────┴──────────┴───────┴──────────┴──────┴────────┴──────┘
artifact
/Users/rohitagarwal/projects/data-shield/backend/app/data/models/medical_code_family_v1.joblib
manifest
/Users/rohitagarwal/projects/data-shield/backend/app/data/models/medical_code_family_v1.json
```

## Reading the confusion matrix

Every family except two classified perfectly across the entire test split.
The only two misses:

- **23 ICD10_PCS codes misclassified as RXNORM** — exactly the known,
  accepted limitation described in [the model page](./xgboost-model):
  purely numeric 7-character PCS codes are structurally indistinguishable
  from 7-digit RxNorm RXCUIs, and the model leans RxNorm on ties because
  it saw far more numeric RxNorm examples in training.
- **1 RXNORM code misclassified as HCPCS_MODIFIER** — a single example out
  of 6,000, well within noise for a 99.91%-accuracy model.

Both misses are invisible to the actual pipeline: this classifier is wired
in as an advisory-only signal capped well below the auto-apply confidence
threshold, so neither miss can silently mislabel — let alone auto-redact or
auto-keep — real data. See
[Medical-code detection](../engineering/medical-code-detection) for exactly
where this model sits in the detection pipeline and why it's structurally
incapable of gating anything.

## How to reproduce this

```bash
cd backend
source .venv/bin/activate
python -m scripts.train_code_family_classifier
```

The manifest (`medical_code_family_v1.json`) persists the same numbers
programmatically — training timestamp, dataset hash, raw/capped per-family
counts, full hyperparameters, and both validation- and test-split metrics —
for anything that needs to consume them without re-running training.
