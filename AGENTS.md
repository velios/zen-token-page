# Agent instructions

<!-- ZEN-COMMON:START -->
<!-- Canonical ZEN-COMMON block; sync with zen-hub/scripts/sync-zen-common.sh. -->

## Shared conventions

- Speak to the user and write user-facing documents in Russian. Write code, commits, configuration, and agent instructions in English.
- In Russian domain documents, write glossary terms by their English names in brackets, e.g. `[Transaction]`.
- For new Bun projects, use Bun 1.4 or newer; leave existing pins unchanged unless the task calls for an upgrade. Get exact versions and library APIs from the repository, installed tools, or primary documentation.
- Do not write comments in code, configs, or scripts. Tool directives such as lint suppressions, `/// <reference>`, and the Dockerfile `# syntax=` line are not comments.
<!-- ZEN-COMMON:END -->

## Project identity

- project: zen-token-broker
- registry: https://github.com/velios/zen-hub/blob/main/docs/registry.md
