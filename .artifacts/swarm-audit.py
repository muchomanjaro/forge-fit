#!/usr/bin/env python3
"""Audit every Roman Cohort swarm profile for handoff gaps vs the pipeline spec."""

import os

profiles = {
    "manager": {
        "agents": "/Users/asd/.hermes/profiles/manager/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/manager/config.yaml",
        "role": "Orchestrator"
    },
    "enobarbus": {
        "agents": "/Users/asd/.hermes/profiles/enobarbus/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/enobarbus/config.yaml",
        "role": "QA Executive"
    },
    "cincinnatus": {
        "agents": "/Users/asd/.hermes/profiles/cincinnatus/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/cincinnatus/config.yaml",
        "role": "Architect / Design"
    },
    "hadrian": {
        "agents": "/Users/asd/.hermes/profiles/hadrian/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/hadrian/config.yaml",
        "role": "Backend / Schema"
    },
    "pliny": {
        "agents": "/Users/asd/.hermes/profiles/pliny/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/pliny/config.yaml",
        "role": "Backend / API"
    },
    "vitruvius": {
        "agents": "/Users/asd/.hermes/profiles/vitruvius/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/vitruvius/config.yaml",
        "role": "UI Engineer"
    },
    "scipio": {
        "agents": "/Users/asd/.hermes/profiles/scipio/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/scipio/config.yaml",
        "role": "Test Planner"
    },
    "default": {
        "agents": "/Users/asd/.hermes/AGENTS.md",
        "config": "/Users/asd/.hermes/config.yaml",
        "role": "Director / Relay"
    },
    "cicero": {
        "agents": "/Users/asd/.hermes/profiles/cicero/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/cicero/config.yaml",
        "role": "Code Review / Backend"
    },
    "personal-coder": {
        "agents": "/Users/asd/.hermes/profiles/personal-coder/AGENTS.md",
        "config": "/Users/asd/.hermes/profiles/personal-coder/config.yaml",
        "role": "Full-stack Developer"
    },
}

# Read all files
all_docs = {}
for name, paths in profiles.items():
    try:
        with open(paths["agents"]) as f:
            agents_content = f.read()
    except FileNotFoundError:
        agents_content = "FILE NOT FOUND"
    try:
        with open(paths["config"]) as f:
            config_content = f.read()
    except FileNotFoundError:
        config_content = "FILE NOT FOUND"
    all_docs[name] = {
        "agents": agents_content,
        "config": config_content,
        "role": paths["role"],
    }

# Read pipeline skill
try:
    with open("/Users/asd/.hermes/profiles/manager/skills/autonomous-ai-agents/super-swarm-workflow/SKILL.md") as f:
        skill = f.read()
except FileNotFoundError:
    skill = "NOT FOUND"

all_docs["pipeline_skill"] = skill

print("=" * 70)
print("  ROMAN COHORT SWARM — HANDOFF GAP ANALYSIS")
print("=" * 70)
print()

# Stage-by-stage analysis
stages = [
    (1, "DEFINITIVE DESIGN", "cincinnatus"),
    (2, "HUMAN APPROVAL GATE", "manager"),
    (3, "PARALLEL BUILD", "vitruvius, hadrian, pliny, cicero, personal-coder"),
    (4, "DETERMINISTIC TESTING", "scipio"),
    (5, "FAILURE CLASSIFICATION & FIX", "enobarbus, scipio"),
    (6, "REGRESSION RE-TESTING", "scipio"),
    (7, "EXPLORATORY QA", "enobarbus"),
    (8, "DELIVERY / MERGE", "cincinnatus"),
]

pipeline_handoffs = {
    "enobarbus": {
        "responsibilities": ["QA execution", "test writing", "evidence capture"],
        "should_handoff_to": "cincinnatus (on 3x persistent failure → design re-entry)",
        "should_handoff_to_2": "scipio (on pass → regression testing)",
        "should_create": ["Playwright tests", "QA_FAILURE_REPORT.md"],
    },
    "cincinnatus": {
        "responsibilities": ["Design proposals", "design re-entry"],
        "should_handoff_to": "manager (human approval gate)",
        "should_create": ["DESIGN_PROPOSAL.md", "ARCHITECTURE.md"],
    },
    "scipio": {
        "responsibilities": ["Test planning", "test script creation"],
        "should_handoff_to": "enobarbus (test execution)",
        "should_create": ["test-plan.json"],
    },
    "hadrian": {
        "responsibilities": ["Schema design", "migrations", "RLS policies"],
        "should_handoff_to": "pliny (build models/API)",
        "should_create": ["schema.sql"],
    },
    "pliny": {
        "responsibilities": ["API endpoints", "server actions"],
        "should_handoff_to": "vitruvius (wire up UI)",
        "should_create": ["openapi.yaml"],
    },
    "vitruvius": {
        "responsibilities": ["UI/UX", "shadcn/ui components", "WCAG"],
        "should_handoff_to": "scipio (test planning)",
        "should_create": ["component-map.json"],
    },
    "manager": {
        "responsibilities": ["Pipeline state tracking", "approval relay"],
        "should_handoff_to": "cincinnatus (on approve → build), enobarbus (on qa needed)",
        "should_create": ["kanban tasks"],
    },
    "default": {
        "responsibilities": ["Gateway dispatcher", "kanban relay"],
        "should_handoff_to": "all via gateway dispatch",
    },
}

print("-" * 70)
print("PROFILE-BY-PROFILE GAP ANALYSIS")
print("-" * 70)
print()

for name, paths in profiles.items():
    docs = all_docs[name]
    agents = docs["agents"]
    config = docs["config"]
    role = docs["role"]
    expected = pipeline_handoffs.get(name, {})
    
    print(f"## {name} ({role})")
    print(f"  Config: {paths['config']} — {'EXISTS ✓' if config != 'FILE NOT FOUND' else 'MISSING ✗'}")
    
    # Language check  
    if "gateway" not in agents.lower() and "kanban" not in agents.lower():
        print(f"  ❌ No kanban/gateway dispatch mechanism defined")
    
    # Handoff checklist
    print(f"  AGENTS.md length: {len(agents)} chars")
    
    handoffs = expected.get("should_handoff_to", "")
    if handoffs:
        targets = [t.strip().split(" ")[0] for t in handoffs.split(",")]
        for t in targets:
            t_clean = t.split("(")[0].strip()
            if t_clean.lower() in agents.lower():
                print(f"  ✓ Mentions handoff target: {t_clean}")
            else:
                print(f"  ❌ NO mention of handoff target: {t_clean}")
    
    creates = expected.get("should_create", [])
    for c in creates:
        if c.lower() in agents.lower():
            print(f"  ✓ Mentions artifact: {c}")
        else:
            print(f"  ❌ NO mention of artifact: {c}")
    
    # Failure paths
    fail_kw = [kw for kw in ["fail", "retry", "error", "fallback", "rollback", "timeout"] if kw in agents.lower()]
    if fail_kw:
        print(f"  ⚠ Has failure keywords: {', '.join(fail_kw)}")
    else:
        print(f"  ❌ No failure handling keywords found")
    
    # Pipeline references
    if "pipeline" in agents.lower():
        print(f"  ✓ References pipeline")
    if "design" in agents.lower() or "proposal" in agents.lower():
        print(f"  ✓ References design/proposal")
    if "playwright" in agents.lower() or "e2e" in agents.lower():
        print(f"  ✓ References testing framework")
    
    # Config completeness
    if "model" in config:
        print(f"  ✓ Model configured")
    if "provider" in config:
        print(f"  ✓ Provider configured")
    if "gateway" in config:
        print(f"  ✓ Gateway configured")
    print()
    print("---")
    print()

print("=" * 70)
print("  PIPELINE SKILL GAPS vs PROFILE REALITY")
print("=" * 70)
print()
print("The super-swarm SKILL.md defines these handoff mechanisms that DO NOT exist in individual AGENTS.md files:")
print()
print("1. QA → DESIGN re-entry: skill says 'Enobarbus writes QA_FAILURE_REPORT.md, creates kanban for Cincinnatus'")
print("   REALITY: Enobarbus AGENTS.md says 'report to Cincinnatus' — no retry threshold, no failure classification")
print()
print("2. State tracking: skill says pipeline has .pipeline-state.json")
print("   REALITY: ADK agent.py writes it, but no profile reads or uses it")
print()
print("3. 3-retry threshold: skill says 'max_qa_retries = 3'")
print("   REALITY: Enobarbus has no retry logic at all")
print()
print("4. Failure classification: skill has 5 failure types (code bug, infra gap, config gap, test flake, persistent)")
print("   REALITY: No profile separates failure types")
print()
print("5. Artifact bus: skill defines DESIGN_PROPOSAL.md → QA_FAILURE_REPORT.md → test-plan.json → schema.sql")
print("   REALITY: enobarbus mentions 'test-plan.json', cincinnatus mentions nothing")
print()

print("=" * 70)
print("  ADK AGENT.PY ALIGNMENT")
print("=" * 70)
print()
print("ADK agent.py has all pipeline stages coded (design, build, test, fix, qa, push)")
print("BUT: No profile AGENTS.md references invoking it.")
print("The ADK pipeline is a standalone Python module, NOT wired into the swarm's runtime.")
print("When a profile is spawned via gateway, it loads its AGENTS.md — which doesn't mention agent.py.")
print("So the ADK script only runs when someone manually calls it from the terminal.")
print()

print("=" * 70)
print("  GAP SUMMARY")
print("=" * 70)
print()
gaps = [
    ("CRITICAL", "Enobarbus lacks 3-retry threshold and failure classification"),
    ("CRITICAL", "Enobarbus doesn't know to write QA_FAILURE_REPORT.md and route to Cincinnatus"),
    ("CRITICAL", "Cincinnatus doesn't know to read QA_FAILURE_REPORT.md for design re-entry"),
    ("CRITICAL", "Enobarbus doesn't know to create Playwright tests if none exist"),
    ("HIGH", "No profile AGENTS.md references the ADK agent.py pipeline"),
    ("HIGH", "No profile reads or writes .pipeline-state.json"),
    ("MEDIUM", "Scipio AGENTS.md doesn't mention test-plan.json creation"),
    ("MEDIUM", "Vitruvius doesn't mention component-map.json handoff"),
    ("MEDIUM", "Hadrian doesn't mention schema.sql artifact"),
    ("LOW", "Most profiles lack explicit failure/error handling paths"),
    ("LOW", "No profile defines rollback procedure on pipeline failure"),
]

for severity, gap in gaps:
    icon = {"CRITICAL": "🔴", "HIGH": "🟡", "MEDIUM": "🟠", "LOW": "⚪"}
    print(f"  {icon[severity]} [{severity}] {gap}")

print()
print("=" * 70)
print("  RECOMMENDED FIXES (in priority order)")
print("=" * 70)
print()
print("1. Patch Enobarbus AGENTS.md — add 3-retry threshold, failure classification, QA_FAILURE_REPORT.md,")
print("   and kanban routing to Cincinnatus on persistent failure")
print("2. Patch Cincinnatus AGENTS.md — add design re-entry flow reading QA_FAILURE_REPORT.md")
print("3. Store the ADK agent.py somewhere profiles can reference OR bake stages into each AGENTS.md")
print("4. Add .pipeline-state.json read/write to each profile's startup sequence")
print("5. Create shared artifact protocol across all profiles (what files, where, when)")
