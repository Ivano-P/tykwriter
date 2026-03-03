---
trigger: always_on
---

# Rule: Environment Variable Management

**Security Boundary:**
- You are strictly FORBIDDEN from attempting to read, read from, or modify the `.env` file. 

**Workflow for New Variables:**
- If your code implementation requires a new environment variable (e.g., for the Ollama connection,Dokploy config, data base url, etc...), you MUST add the key and a dummy value to `.env.example`.
- You MUST explicitly notify the user in your chat response that a new variable was added to `.env.example` so the user knows to manually copy it to their secure `.env` file.