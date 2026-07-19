# Initial Multi-Agent Delegation Plan

Status: Ready for discovery/spike delegation; not ready for full implementation.

## Coordinator assignment

**QR Code Generator Agent (this Hermes): Product/Architecture Owner and Integrator**

Owns:
- product/architecture/program source-of-truth documents
- requirement and contract-change governance
- integration sequencing and independent verification
- acceptance of spike evidence and Gate 0–4 decisions

Does not independently approve risky public promises without sponsor decision.

## Immediate independent assignments

| Lane | Suggested independent agent | Packet | Blocking output |
|---|---|---|---|
| A | Market & economics agent | `handoffs/WAVE-0-A-market-economics.md` | Verified competitor ledger, user evidence plan, five-year unit economics |
| B | QR/browser engineering agent | `handoffs/WAVE-0-B-qr-bulk-spikes.md` | SP-01/SP-02 verdicts and artifacts |
| C | Edge/reliability engineering agent | `handoffs/WAVE-0-C-edge-runtime-spike.md` | SP-03/SP-06 traffic-cost and outage verdict |
| D | Domain infrastructure agent | `handoffs/WAVE-0-D-custom-domain-spike.md` | SP-04 provider/DNS/TLS/takeover verdict |
| E | Commerce/security agent | `handoffs/WAVE-0-E-commerce-privacy-spikes.md` | SP-05/SP-07 event, refund, privacy, threat findings |

These lanes have independent write surfaces and can run concurrently. They return evidence; they do not edit the baseline documents directly.

## Decision checkpoint after Wave 0

The coordinator integrates results and asks the sponsor to decide:

1. durable-service wording and continuity remedy
2. fair-use/abuse policy
3. validated price and limits
4. custom domains at GA versus beta/later
5. selected edge, database, identity, payment, DNS/TLS, and event providers
6. analytics fields/retention
7. supported bulk browser/device envelope

Only then does WS-01 freeze machine-readable contracts and open implementation Waves 1–3.

## Scaling to available agents

- **2 agents:** coordinator + one rotating spike agent, in dependency order B → C/D → E → A synthesis.
- **3 agents:** coordinator; B; C+D+E sequentially; A runs with coordinator.
- **6 agents:** use the five independent lanes above plus coordinator.
- **More agents:** add independent security review and customer-research lanes; do not split a single owned artifact merely to occupy agents.
