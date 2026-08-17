---
title: "Fleet maintenance"
weight: 3
description: "Service-interval detection in Prolog vs Tln — then a forecast Prolog can't express."
---

Vehicle service tracking from [`examples/fleet_maintenance.tln`](https://github.com/opentalon/tln-language/blob/master/examples/fleet_maintenance.tln):
flag active vehicles overdue for service, then forecast a parts stock-out.

## Service overdue

Two named conditions compose into a detection. In Prolog these are rule heads and a manual report
predicate; in Tln they're `define`s referenced with `is`, feeding a declarative `detect`.

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
active_vehicle(E, Id) :-
    record(E, Id, item, 'Vehicles', active, _).

overdue_km(E, Id) :-
    attr(E, Id, km, Km),
    attr(E, Id, last_service_km, Last),
    Km > Last.

service_overdue(E, Id) :-
    active_vehicle(E, Id),
    overdue_km(E, Id).

report_overdue(E) :-
    forall(service_overdue(E, Id),
           ( attr(E, Id, name, Name),
             attr(E, Id, km, Km),
             attr(E, Id, last_service_km, Last),
             format("~w: ~w km since last service at ~w km~n",
                    [Name, Km, Last]) )).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
define "active_vehicle" {
  type == "item"
  and status == "active"
  and category == "Vehicles"
}

define "overdue_km" {
  attr "km" > attr "last_service_km"
}

detect "Service overdue" {
  for records where is "active_vehicle"
    and is "overdue_km"
  flag matching items
  label "{item.name}: {attr.km} km since last service at {attr.last_service_km} km"
}
{{< /pane >}}
{{< /compare >}}

## A forecast Prolog can't express

The same file then predicts *when* a part will run out — a time-series forecast over the last 90
days of stock levels:

```tln
forecast "Parts stock-out" {
  for records where type == "stock_item" and status == "active"
  series attr "current_stock" over last 90 days
  label "{item.name}: stock-out in ~{days_until} days"
}
```

There's no Prolog pane here on purpose. ISO Prolog has no notion of a time series or exponential
smoothing — you'd leave the language entirely, push the data into Python or R, and glue the
result back. Tln ships forecasting (and anomaly detection, classification, clustering, similarity)
as first-class blocks with explainable output — see **[Beyond Prolog → ML](/beyond-prolog/ml/)**.
