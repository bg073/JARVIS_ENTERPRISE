from typing import List, Dict

# Placeholder for AI-driven ACL inference. For now, a simple heuristic.
# This can be swapped out with a local LLM call (e.g., Llama 3.1) later.


SENSITIVE_KEYWORDS = {
    "hr": ["salary", "performance review", "disciplinary", "benefits"],
    "finance": ["invoice", "revenue", "forecast", "p&l", "budget"],
    "engineering": ["architecture", "design doc", "runbook", "incident"],
    "legal": ["nda", "contract", "agreement", "confidential"],
}


def infer_acl_from_text(text: str, default_roles: List[str] | None = None) -> List[str]:
    """
    Heuristic role assignment:
    - Detect department keywords -> map to roles
    - Always include a base role like "employee" if nothing is found
    Replace with AI model scoring later.
    """
    text_l = text.lower()
    roles: set[str] = set(default_roles or [])

    for role, kws in SENSITIVE_KEYWORDS.items():
        if any(kw in text_l for kw in kws):
            roles.add(role)
    # Always include a base role so general employees can see non-sensitive docs
    roles.add("employee")
    return sorted(roles)


def build_acl_metadata(tenant_id: str, uploader_id: str, roles: List[str]) -> Dict:
    return {
        "tenant_id": tenant_id,
        "uploader_id": uploader_id,
        "roles": roles,
    }
