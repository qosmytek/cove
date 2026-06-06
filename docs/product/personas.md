# Personas & Jobs-to-be-Done

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

Who we serve, and the jobs they hire the product to do. Personas are deliberately few and sharp; the
MVP optimizes for **Priya** and **Marco**.

## Primary personas

### 1. Priya — the privacy-conscious professional ⭐ (primary MVP target)
- **Context:** Freelance editor / consultant who handles client video and documents.
- **Job:** *"Compress this client video so I can email it — without uploading their footage to a
  random website."*
- **Pains:** Upload tools are slow, size-capped, ad-ridden, and a confidentiality risk with clients.
- **Wins with us:** Drag in, compress on-device, done — provably nothing left her machine.
- **Success signal:** Completes a compression in under a minute on her laptop, with zero uploads.

### 2. Marco — the field / low-connectivity user ⭐ (primary MVP target)
- **Context:** Works on the move — planes, the field, metered or flaky connections.
- **Job:** *"Get this file transformed now, offline, without burning my data plan."*
- **Pains:** SaaS tools are dead without a connection; large uploads are impossible on mobile data.
- **Wins with us:** Installed PWA that works fully offline; first load cached, instant thereafter.
- **Success signal:** Performs a full task on a mid-range phone in airplane mode.

### 3. Dr. Lee — the regulated-data worker
- **Context:** Legal / medical / finance; handles confidential or regulated documents.
- **Job:** *"Redact this PDF / convert this dataset without it ever touching a third party."*
- **Pains:** Compliance forbids uploading; existing desktop tools are clunky or costly.
- **Wins with us:** Data never leaves the device, so there's nothing to bring into compliance scope.
- **Success signal:** Can attest, truthfully, that the file was never transmitted.

### 4. Sam — the technical / data power user
- **Context:** Analyst or developer who lives in the keyboard and works with data files.
- **Job:** *"Run real SQL over a few million rows, or convert CSV/JSON/Parquet — locally."*
- **Pains:** Spinning up a database or notebook is overkill; cloud tools mean uploading data.
- **Wins with us:** DuckDB-WASM + command palette = fast, keyboard-driven, on-device analysis.
- **Success signal:** Queries a multi-million-row Parquet file with no server involved.

## Secondary / future personas
- **The air-gapped operator** — needs the [single-file build](../features/02-single-file-app.md) on a
  USB stick for a disconnected machine.
- **The note-keeper** — wants a private [encrypted vault](../features/03-encrypted-vault.md) for
  journals, notes, or passwords.

## Anti-persona (who we are *not* for)
- **The growth-metrics buyer** who wants engagement loops, virality hooks, and behavioral analytics.
  Our [calm-by-design](../features/07-calm-design.md) stance is the deliberate opposite.

## Accessibility note
Every persona includes keyboard-only and assistive-technology users. Accessibility is a cross-cutting
requirement, not a separate persona — see [Accessibility](../quality/accessibility.md).

See also: [Vision](./vision.md) · [PRD → user stories](./prd.md#4-user-stories)
