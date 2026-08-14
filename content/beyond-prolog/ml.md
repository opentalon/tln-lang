---
title: "Built-in ML"
weight: 2
description: "Prediction, forecasting, classification, clustering, and similarity — as first-class, explainable Tln blocks."
---

Expert systems hit a wall the moment a decision needs a *learned* judgement — "is this reading
anomalous?", "what's this incident's likely cause?", "when will we run out?". In Prolog you leave
the language: export the data, run a Python/R pipeline, glue the answer back. Tln builds the
common cases in as blocks, each returning an **explanation** alongside its value — so an ML result
is as auditable as any rule.

## The primitives

Eleven statistical/ML primitives ship in the runtime, each traceable:

| Block / use | Primitive |
|---|---|
| `detect … is anomaly` | z-score outlier · Grubbs' test |
| `threshold` (adaptive) | learned threshold (percentile/avg from your data) |
| `detect … correlates_with` | Pearson correlation |
| `forecast` | weighted moving average · exponential smoothing |
| `cluster` | DBSCAN |
| `find similar` | cosine similarity |
| `find related` | Personalized PageRank |
| `classify` | k-nearest-neighbours |
| `predict` | CART decision tree |

## Predict — decision tree

Train on retired machines, predict the outcome for in-service ones. Model and inference are one
block; `confidence` gates the result:

```tln
predict "Failure risk" {
  for records where type == "machine" and status == "in_service"
  features [attr "operating_hours", attr "repair_count"]
  trained_on records where type == "machine" and status == "retired"
  label_attr "outcome"
  confidence >= 0.9
  label "predicted outcome: {class}"
}
```

## Classify — k-NN

```tln
classify "Failure mode" {
  for records where type == "incident" and status == "open"
  features [attr "vibration", attr "temp"]
  trained_on records where type == "incident" and status == "resolved"
  label_attr "root_cause"
  confidence >= 0.8
  label "likely cause: {class}"
}
```

## Forecast — time series

```tln
forecast "Parts stock-out" {
  for records where type == "stock_item" and status == "active"
  series attr "current_stock" over last 90 days
  label "{item.name}: stock-out in ~{days_until} days"
}
```

Models can also be declared once and shared: a `model` block carries `fitted` examples plus
provenance (`computed_from`, `valid_until`), exported from a `module` and pulled in with
`using model "fleet.ml.failure_risk"`. Same determinism, same explainability — just learned from
data instead of hand-written.
