---
title: "Testing"
weight: 3
description: "The .tln.test framework — verify rules with given / when / expect."
---

A ruleset that decides claims, or blocks a deployment, or reorders stock, needs to be *tested* —
not eyeballed. ISO Prolog has no standard test framework (SWI ships the non-standard `plunit`);
Tln has one built in, and it needs no database.

## `given` / `when` / `expect`

A `.tln.test` file seeds facts in a `given` block, runs a named block with `when`, and asserts on
the result:

```tln
test "greets the world" {
  given {
    record 1 type "greeting"
    attr 1 "name" "World"
  }
  when detect "Hello, World"
  expect {
    flagged 1
    label contains "Hello, World!"
    count == 1
  }
}
```

The `given` block *is* the fact schema you'd otherwise load from an external system — `record` and
`attr` triples — so tests are hermetic and fast (the runner materializes them in memory; no
`FactStore` required).

## Assertions

```text
flagged <id>            not flagged <id>
label contains "<text>"
priority == LOW|MEDIUM|HIGH|CRITICAL
count == <n>
```

A realistic test pins down exactly which records should and shouldn't fire — here, an overdue-
service detection separating active-overdue vehicles from up-to-date ones, inactive ones, and
non-vehicles:

```tln
test "Overdue service flags only overdue vehicles" {
  given {
    record 501 type "item" category "Vehicles" status "active"
    attr 501 "km" 45000
    attr 501 "last_service_km" 20000
    attr 501 "name" "Truck A"

    record 502 type "item" category "Vehicles" status "active"
    attr 502 "km" 25000
    attr 502 "last_service_km" 25000
    attr 502 "name" "Van B"
  }
  when detect "Service overdue"
  expect {
    flagged 501
    not flagged 502
    label contains "Truck A"
  }
}
```

## Running

```bash
tln test rules.tln rules.tln.test
# ==> rules.tln.test: 1 test(s)
#
# 1 passed, 0 failed

tln test rules.tln rules.tln.test -run "Overdue" -v   # filter + verbose
tln test rules.tln rules.tln.test --junit out.xml     # CI-friendly report
```

Because the engine is deterministic, a passing test *stays* passing for the same facts — the
property that makes an expert system safe to put in front of real decisions.
