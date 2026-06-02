======================================================================
  ROMAN COHORT SWARM — HANDOFF GAP ANALYSIS
======================================================================

----------------------------------------------------------------------
PROFILE-BY-PROFILE GAP ANALYSIS
----------------------------------------------------------------------

## manager (Orchestrator)
  Config: /Users/asd/.hermes/profiles/manager/config.yaml — EXISTS ✓
  AGENTS.md length: 491 chars
  ❌ NO mention of handoff target: cincinnatus
  ❌ NO mention of handoff target: enobarbus
  ❌ NO mention of artifact: kanban tasks
  ⚠ Has failure keywords: fail
  ✓ References testing framework
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## enobarbus (QA Executive)
  Config: /Users/asd/.hermes/profiles/enobarbus/config.yaml — EXISTS ✓
  AGENTS.md length: 650 chars
  ✓ Mentions handoff target: cincinnatus
  ✓ Mentions artifact: Playwright tests
  ❌ NO mention of artifact: QA_FAILURE_REPORT.md
  ⚠ Has failure keywords: fail
  ✓ References testing framework
  ✓ Model configured
  ✓ Provider configured

---

## cincinnatus (Architect / Design)
  Config: /Users/asd/.hermes/profiles/cincinnatus/config.yaml — EXISTS ✓
  AGENTS.md length: 940 chars
  ❌ NO mention of handoff target: manager
  ❌ NO mention of artifact: DESIGN_PROPOSAL.md
  ❌ NO mention of artifact: ARCHITECTURE.md
  ❌ No failure handling keywords found
  ✓ References testing framework
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## hadrian (Backend / Schema)
  Config: /Users/asd/.hermes/profiles/hadrian/config.yaml — EXISTS ✓
  ❌ No kanban/gateway dispatch mechanism defined
  AGENTS.md length: 652 chars
  ❌ NO mention of handoff target: pliny
  ✓ Mentions artifact: schema.sql
  ❌ No failure handling keywords found
  ✓ References design/proposal
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## pliny (Backend / API)
  Config: /Users/asd/.hermes/profiles/pliny/config.yaml — EXISTS ✓
  ❌ No kanban/gateway dispatch mechanism defined
  AGENTS.md length: 582 chars
  ❌ NO mention of handoff target: vitruvius
  ✓ Mentions artifact: openapi.yaml
  ❌ No failure handling keywords found
  ✓ References design/proposal
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## vitruvius (UI Engineer)
  Config: /Users/asd/.hermes/profiles/vitruvius/config.yaml — EXISTS ✓
  ❌ No kanban/gateway dispatch mechanism defined
  AGENTS.md length: 641 chars
  ❌ NO mention of handoff target: scipio
  ✓ Mentions artifact: component-map.json
  ❌ No failure handling keywords found
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## scipio (Test Planner)
  Config: /Users/asd/.hermes/profiles/scipio/config.yaml — EXISTS ✓
  AGENTS.md length: 737 chars
  ✓ Mentions handoff target: enobarbus
  ✓ Mentions artifact: test-plan.json
  ⚠ Has failure keywords: fail
  ✓ References design/proposal
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## default (Director / Relay)
  Config: /Users/asd/.hermes/config.yaml — EXISTS ✓
  AGENTS.md length: 1771 chars
  ✓ Mentions handoff target: all
  ❌ No failure handling keywords found
  ✓ Model configured
  ✓ Provider configured
  ✓ Gateway configured

---

## cicero (Code Review / Backend)
  Config: /Users/asd/.hermes/profiles/cicero/config.yaml — EXISTS ✓
  ❌ No kanban/gateway dispatch mechanism defined
  AGENTS.md length: 14 chars
  ❌ No failure handling keywords found
  ✓ Model configured
  ✓ Provider configured

---

## personal-coder (Full-stack Developer)
  Config: /Users/asd/.hermes/profiles/personal-coder/config.yaml — EXISTS ✓
  ❌ No kanban/gateway dispatch mechanism defined
  AGENTS.md length: 629 chars
  ❌ No failure handling keywords found
  ✓ Model configured
  ✓ Provider configured

---

======================================================================
  PIPELINE SKILL GAPS vs PROFILE REALITY
======================================================================

The super-swarm SKILL.md defines these handoff mechanisms that DO NOT exist in individual AGENTS.md files:

1. QA → DESIGN re-entry: skill says 'Enobarbus writes QA_FAILURE_REPORT.md, creates kanban for Cincinnatus'
   REALITY: Enobarbus AGENTS.md says 'report to Cincinnatus' — no retry threshold, no failure classification

2. State tracking: skill says pipeline has .pipeline-state.json
   REALITY: ADK agent.py writes it, but no profile reads or uses it

3. 3-retry threshold: skill says 'max_qa_retries = 3'
   REALITY: Enobarbus has no retry logic at all

4. Failure classification: skill has 5 failure types (code bug, infra gap, config gap, test flake, persistent)
   REALITY: No profile separates failure types

5. Artifact bus: skill defines DESIGN_PROPOSAL.md → QA_FAILURE_REPORT.md → test-plan.json → schema.sql
   REALITY: enobarbus mentions 'test-plan.json', cincinnatus mentions nothing

======================================================================
  ADK AGENT.PY ALIGNMENT
======================================================================

ADK agent.py has all pipeline stages coded (design, build, test, fix, qa, push)
BUT: No profile AGENTS.md references invoking it.
The ADK pipeline is a standalone Python module, NOT wired into the swarm's runtime.
When a profile is spawned via gateway, it loads its AGENTS.md — which doesn't mention agent.py.
So the ADK script only runs when someone manually calls it from the terminal.

======================================================================
  GAP SUMMARY
======================================================================

  🔴 [CRITICAL] Enobarbus lacks 3-retry threshold and failure classification
  🔴 [CRITICAL] Enobarbus doesn't know to write QA_FAILURE_REPORT.md and route to Cincinnatus
  🔴 [CRITICAL] Cincinnatus doesn't know to read QA_FAILURE_REPORT.md for design re-entry
  🔴 [CRITICAL] Enobarbus doesn't know to create Playwright tests if none exist
  🟡 [HIGH] No profile AGENTS.md references the ADK agent.py pipeline
  🟡 [HIGH] No profile reads or writes .pipeline-state.json
  🟠 [MEDIUM] Scipio AGENTS.md doesn't mention test-plan.json creation
  🟠 [MEDIUM] Vitruvius doesn't mention component-map.json handoff
  🟠 [MEDIUM] Hadrian doesn't mention schema.sql artifact
  ⚪ [LOW] Most profiles lack explicit failure/error handling paths
  ⚪ [LOW] No profile defines rollback procedure on pipeline failure

======================================================================
  RECOMMENDED FIXES (in priority order)
======================================================================

1. Patch Enobarbus AGENTS.md — add 3-retry threshold, failure classification, QA_FAILURE_REPORT.md,
   and kanban routing to Cincinnatus on persistent failure
2. Patch Cincinnatus AGENTS.md — add design re-entry flow reading QA_FAILURE_REPORT.md
3. Store the ADK agent.py somewhere profiles can reference OR bake stages into each AGENTS.md
4. Add .pipeline-state.json read/write to each profile's startup sequence
5. Create shared artifact protocol across all profiles (what files, where, when)
