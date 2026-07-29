# Agent Handoff — Wave 0D: Custom Domain, DNS, and TLS Spike

## Mission

Determine whether one custom hostname per paid campaign can be automated safely and economically at the proposed low one-time price.

## Context

The flow must prove control, provision/renew TLS, route only when ready, expose clear states, detect DNS drift, remove safely, and prevent stale-domain takeover.

## Frozen scope

- Execute SP-04 against candidate managed custom-hostname/TLS providers using a project-controlled test zone where available.
- Do not modify real customer DNS or purchase infrastructure without approval.
- Do not implement the full campaign/dashboard.

## Required proof

- Provider limits, pricing dimensions, API lifecycle, certificate timing/renewal, CAA constraints, and lock-in/export options from original docs.
- Real or sandbox request → DNS challenge → verification → TLS active → route → removal evidence.
- Collision, IDNA normalization, stale CNAME, re-claim cooldown, and certificate failure analysis.
- Manual support steps and estimated support burden.
- Recommendation: GA, controlled beta, higher-priced add-on, or defer.
- Proposed `domain-api.v1` and `hostname-events.v1` state machine.

Return verifiable IDs/hostnames only for project-controlled resources and clean them up unless preservation is explicitly requested.
