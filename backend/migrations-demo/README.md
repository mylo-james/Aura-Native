# Aura demo migration lineage

`aura_demo.db` owns the dedicated schema declaration used by the local demo.
The production initialization command applies that schema only after the state
directory, recovery-path, and key checks complete. This lineage is deliberately
separate from the recovery application's migrations and database.
