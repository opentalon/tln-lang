---
title: "Insurance claims auto-adjudication"
weight: 1
description: "Blacklist blocking, auto-approval, and cap detection — legacy Prolog vs modern Tln."
---

An LLM extracts facts from each claim invoice (PDF → `record` + `attr`s). The expert system then
decides — deterministically — whether to auto-approve, auto-reject, or escalate to a human. No
LLM in the decision loop; every outcome traces to a specific rule.

## Block a blacklisted provider

A claim from a blacklisted provider must never be approved — and this decision must *win* over any
"auto-approve" that also matches. In Prolog you model the decision term and its message yourself;
in Tln you `block` with a `reason` and a `CRITICAL` priority that resolves the conflict for you.

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
blacklisted_provider(E, Id) :-
    record(E, Id, claim, _, _, _),
    attr(E, Id, provider_status, blacklisted).

% Model the decision term and the message by hand.
% Conflict resolution vs auto_approve/2 is also on you.
claim_decision(E, Id, block(approve_claim), Reason) :-
    blacklisted_provider(E, Id),
    attr(E, Id, provider_id, P),
    format(atom(Reason),
           "Provider ~w is on the fraud blacklist", [P]).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
rule "Reject blacklisted provider" {
  for records where type == "claim"
    and attr "provider_status" == "blacklisted"
  block "approve_claim"
  reason "Provider {attr.provider_id} is on the fraud blacklist"
}
{{< /pane >}}
{{< /compare >}}

## Auto-approve the routine case

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
auto_approve(E, Id) :-
    record(E, Id, claim, _, _, _),
    attr(E, Id, provider_status, in_network),
    attr(E, Id, service_category, outpatient),
    attr(E, Id, amount_chf, Amount),
    attr(E, Id, per_visit_cap, Cap),
    Amount =< Cap.
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
rule "Auto-approve in-network routine" {
  for records where type == "claim"
    and attr "provider_status" == "in_network"
    and attr "service_category" == "outpatient"
    and attr "amount_chf" <= attr "per_visit_cap"
  allow "approve_claim"
}
{{< /pane >}}
{{< /compare >}}

## Surface what needs a human

Over-cap claims go to a reviewer. Notice what the Prolog version has to spell out: the query, the
`forall` loop, and the `format` string. Tln's `detect` *declares* the flag, the label, and the
priority — and a `recommend` block can chain straight off it.

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
over_cap(E, Id, Over) :-
    record(E, Id, claim, _, _, _),
    attr(E, Id, amount_chf, Amount),
    attr(E, Id, per_visit_cap, Cap),
    Amount > Cap,
    Over is Amount - Cap.

% Flagging + labelling is manual plumbing:
report_over_cap(E) :-
    forall(over_cap(E, Id, Over),
           ( attr(E, Id, amount_chf, Amount),
             format("Claim ~w: ~w CHF over cap (by ~w)~n",
                    [Id, Amount, Over]) )).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
detect "Over the per-visit cap" {
  for records where type == "claim"
    and attr "amount_chf" > attr "per_visit_cap"
  flag matching items
  label "Claim {item.id}: {attr.amount_chf} CHF over the per-visit cap"
}

recommend "Schedule reviewer" {
  when detect "Over the per-visit cap" matches
  suggest "Route claim {item.id} ({attr.amount_chf} CHF) to a senior adjuster"
}
{{< /pane >}}
{{< /compare >}}

## Why the Tln version wins

- **Declarative outcomes.** `flag` / `label` / `allow` / `block` replace the query-collect-format loop.
- **Conflict resolution is built in.** A `strict` rule or an `overrides` clause settles competing
  verdicts — no manual ordering of clauses.
- **It's testable.** Drop the facts in a `.tln.test` `given` block and assert the decision — see
  [testing](/beyond-prolog/testing/).
- **It's explainable.** `tln explain` traces the exact rule and facts behind every outcome.
