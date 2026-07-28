import hashlib
import json
import os
import re
import secrets
import threading
import time
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import documentai_v1 as documentai

PROJECT_ID = os.getenv("DOCUMENT_AI_PROJECT_ID", "413667913571")
LOCATION = os.getenv("DOCUMENT_AI_LOCATION", "us")
PROCESSOR_ID = os.getenv("DOCUMENT_AI_PROCESSOR_ID", "61c933f67dba23a3")
API_KEY = os.getenv("DIANE_API_KEY", "")

AIRTABLE_TOKEN = os.getenv("AIRTABLE_TOKEN", "")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
AIRTABLE_TEMPLATES_TABLE_ID = os.getenv(
    "AIRTABLE_TEMPLATES_TABLE_ID", "tblAVz20h5VEsaF5u"
)
AIRTABLE_RULES_TABLE_ID = os.getenv(
    "AIRTABLE_RULES_TABLE_ID", "tblGnGiSwhbBhnywH"
)
AIRTABLE_CACHE_TTL_SECONDS = max(
    int(os.getenv("AIRTABLE_CACHE_TTL_SECONDS", "300")), 1
)
AIRTABLE_API_ROOT = "https://api.airtable.com/v0"

PROCESSOR_NAME = (
    f"projects/{PROJECT_ID}/locations/{LOCATION}/processors/{PROCESSOR_ID}"
)
client = documentai.DocumentProcessorServiceClient(
    client_options=ClientOptions(
        api_endpoint=f"{LOCATION}-documentai.googleapis.com"
    )
)
app = FastAPI(title="Diane Ticket Extractor")

MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
}
ALLOWED_MIME_TYPES = set(MIME_BY_EXTENSION.values())

TEMPLATE_FIELDS = {
    "name": "fldCyHgoaRwfWxMzw",
    "code": "fld0tXGlslwBPWu5N",
    "status": "fldiRChzSGEnlrzly",
    "recognition": "fldj7I79hcTnJcfWL",
    "priority": "fldG94AQJqY48i4XY",
    "rules": "flds6XvZ7zj6DcceN",
}
RULE_FIELDS = {
    "name": "flde3CPwH83Qh1QBi",
    "template": "fld5htXQtKCu2l6R3",
    "output_field": "fldTqtysp3QjAXnKj",
    "label_clues": "fldw9FPa4p21xZBLC",
    "location_guidance": "fldnWAKxevRj6eOCo",
    "extraction_rule": "fldykoRLMKrItWbpT",
    "exclusion_rule": "fldzGOJort7WEmdf7",
    "usually_present": "fldfdbGJOpv74TnRz",
    "required_for_review": "fld0wBhG1kTxcggPw",
    "status": "fldZcoNi48CBHV4a9",
}

CONFIG_CACHE_LOCK = threading.Lock()
CONFIG_CACHE: dict[str, Any] | None = None
CONFIG_CACHE_LOADED_AT = 0.0
CONFIG_REFRESH_IN_PROGRESS = False


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalized_match_text(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", clean_text(value).upper()).strip()


def select_name(value: Any) -> str:
    return clean_text(value.get("name")) if isinstance(value, dict) else clean_text(value)


def linked_record_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        if isinstance(item, str) and item.startswith("rec"):
            result.append(item)
        elif isinstance(item, dict):
            record_id = clean_text(item.get("id"))
            if record_id.startswith("rec"):
                result.append(record_id)
    return result


def determine_mime_type(upload: UploadFile) -> str:
    mime_type = (upload.content_type or "").split(";")[0].strip().lower()
    if mime_type == "image/jpg":
        mime_type = "image/jpeg"
    if not mime_type or mime_type == "application/octet-stream":
        extension = Path(upload.filename or "").suffix.lower()
        mime_type = MIME_BY_EXTENSION.get(extension, "")
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type: "
                f"filename={upload.filename}, content_type={upload.content_type}"
            ),
        )
    return mime_type


def entity_value(entity: Any) -> str:
    normalized_text = ""
    try:
        normalized_text = entity.normalized_value.text or ""
    except (AttributeError, TypeError):
        pass
    return normalized_text.strip() or (entity.mention_text or "").strip()


def add_value(target: dict[str, Any], key: str, value: Any) -> None:
    if key not in target:
        target[key] = value
        return
    if not isinstance(target[key], list):
        target[key] = [target[key]]
    target[key].append(value)


def collect_entities(
    entities: Any,
    fields: dict[str, Any],
    confidence: dict[str, Any],
    entity_rows: list[dict[str, Any]],
) -> None:
    for entity in entities:
        if entity.properties:
            collect_entities(entity.properties, fields, confidence, entity_rows)
            continue
        field_name = (entity.type_ or "").strip()
        if not field_name:
            continue
        value = entity_value(entity)
        score = round(float(entity.confidence or 0), 6)
        add_value(fields, field_name, value)
        add_value(confidence, field_name, score)
        entity_rows.append(
            {"type": field_name, "value": value, "confidence": score}
        )


def airtable_settings_available() -> bool:
    return bool(
        AIRTABLE_TOKEN
        and AIRTABLE_BASE_ID
        and AIRTABLE_TEMPLATES_TABLE_ID
        and AIRTABLE_RULES_TABLE_ID
    )


def fetch_airtable_records(
    table_id: str, field_ids: list[str]
) -> list[dict[str, Any]]:
    url = f"{AIRTABLE_API_ROOT}/{AIRTABLE_BASE_ID}/{table_id}"
    headers = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}
    records: list[dict[str, Any]] = []
    offset = ""
    with httpx.Client(timeout=15.0) as airtable_client:
        while True:
            params: list[tuple[str, str]] = [
                ("returnFieldsByFieldId", "true"),
                ("pageSize", "100"),
            ]
            params.extend(("fields[]", field_id) for field_id in field_ids)
            if offset:
                params.append(("offset", offset))
            response = airtable_client.get(url, headers=headers, params=params)
            response.raise_for_status()
            payload = response.json()
            page_records = payload.get("records", [])
            if isinstance(page_records, list):
                records.extend(page_records)
            offset = clean_text(payload.get("offset"))
            if not offset:
                break
    return records


def normalize_template_record(record: dict[str, Any]) -> dict[str, Any]:
    fields = record.get("fields") or {}
    return {
        "id": clean_text(record.get("id")),
        "name": clean_text(fields.get(TEMPLATE_FIELDS["name"])),
        "code": clean_text(fields.get(TEMPLATE_FIELDS["code"])),
        "status": select_name(fields.get(TEMPLATE_FIELDS["status"])),
        "recognition": clean_text(fields.get(TEMPLATE_FIELDS["recognition"])),
        "priority": float(fields.get(TEMPLATE_FIELDS["priority"]) or 0),
        "rule_ids": sorted(
            linked_record_ids(fields.get(TEMPLATE_FIELDS["rules"]))
        ),
    }


def normalize_rule_record(record: dict[str, Any]) -> dict[str, Any]:
    fields = record.get("fields") or {}
    return {
        "id": clean_text(record.get("id")),
        "name": clean_text(fields.get(RULE_FIELDS["name"])),
        "template_ids": sorted(
            linked_record_ids(fields.get(RULE_FIELDS["template"]))
        ),
        "output_field": select_name(fields.get(RULE_FIELDS["output_field"])),
        "label_clues": clean_text(fields.get(RULE_FIELDS["label_clues"])),
        "location_guidance": clean_text(
            fields.get(RULE_FIELDS["location_guidance"])
        ),
        "extraction_rule": clean_text(
            fields.get(RULE_FIELDS["extraction_rule"])
        ),
        "exclusion_rule": clean_text(
            fields.get(RULE_FIELDS["exclusion_rule"])
        ),
        "usually_present": select_name(
            fields.get(RULE_FIELDS["usually_present"])
        ),
        "required_for_review": bool(
            fields.get(RULE_FIELDS["required_for_review"])
        ),
        "status": select_name(fields.get(RULE_FIELDS["status"])),
    }


def config_version(
    templates: list[dict[str, Any]], rules: list[dict[str, Any]]
) -> str:
    payload = {
        "templates": sorted(templates, key=lambda item: item["id"]),
        "rules": sorted(rules, key=lambda item: item["id"]),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()[:12]


def load_airtable_config() -> dict[str, Any]:
    templates = [
        normalize_template_record(record)
        for record in fetch_airtable_records(
            AIRTABLE_TEMPLATES_TABLE_ID, list(TEMPLATE_FIELDS.values())
        )
    ]
    rules = [
        normalize_rule_record(record)
        for record in fetch_airtable_records(
            AIRTABLE_RULES_TABLE_ID, list(RULE_FIELDS.values())
        )
    ]
    active_templates = [
        item for item in templates if item["status"].lower() == "active"
    ]
    active_template_ids = {item["id"] for item in active_templates}
    active_rules = [
        item
        for item in rules
        if item["status"].lower() == "active"
        and any(
            template_id in active_template_ids
            for template_id in item["template_ids"]
        )
    ]
    rules_by_template: dict[str, list[dict[str, Any]]] = {}
    for rule in active_rules:
        for template_id in rule["template_ids"]:
            if template_id in active_template_ids:
                rules_by_template.setdefault(template_id, []).append(rule)
    for template in active_templates:
        template["rules"] = sorted(
            rules_by_template.get(template["id"], []),
            key=lambda item: item["id"],
        )
    return {
        "templates": sorted(active_templates, key=lambda item: item["id"]),
        "version": config_version(active_templates, active_rules),
    }


def refresh_config_cache() -> bool:
    global CONFIG_CACHE, CONFIG_CACHE_LOADED_AT, CONFIG_REFRESH_IN_PROGRESS
    try:
        refreshed = load_airtable_config()
    except (httpx.HTTPError, ValueError, TypeError, KeyError):
        with CONFIG_CACHE_LOCK:
            CONFIG_REFRESH_IN_PROGRESS = False
        return False
    with CONFIG_CACHE_LOCK:
        CONFIG_CACHE = refreshed
        CONFIG_CACHE_LOADED_AT = time.monotonic()
        CONFIG_REFRESH_IN_PROGRESS = False
    return True


def get_config_snapshot() -> tuple[dict[str, Any] | None, str]:
    global CONFIG_REFRESH_IN_PROGRESS
    if not airtable_settings_available():
        return None, "config_unavailable"
    now = time.monotonic()
    with CONFIG_CACHE_LOCK:
        cached = CONFIG_CACHE
        loaded_at = CONFIG_CACHE_LOADED_AT
        age = now - loaded_at if cached is not None else None
        if cached is not None and age is not None and age < AIRTABLE_CACHE_TTL_SECONDS:
            return cached, "fresh"
        if cached is not None:
            if not CONFIG_REFRESH_IN_PROGRESS:
                CONFIG_REFRESH_IN_PROGRESS = True
                threading.Thread(
                    target=refresh_config_cache, daemon=True
                ).start()
            return cached, "config_stale"
        CONFIG_REFRESH_IN_PROGRESS = True
    if refresh_config_cache():
        with CONFIG_CACHE_LOCK:
            return CONFIG_CACHE, "fresh"
    return None, "config_unavailable"


def recognition_phrases(template: dict[str, Any]) -> list[str]:
    phrases: list[str] = []
    for value in (template.get("name"), template.get("code")):
        normalized = normalized_match_text(value)
        if normalized:
            phrases.append(normalized)
    for part in re.split(r"[\n;,]+", clean_text(template.get("recognition"))):
        normalized = normalized_match_text(part)
        if len(normalized) >= 4:
            phrases.append(normalized)
    return list(dict.fromkeys(phrases))


def entity_search_text(entity_rows: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for entity in entity_rows:
        parts.extend(
            [clean_text(entity.get("type")), clean_text(entity.get("value"))]
        )
    return normalized_match_text(" ".join(parts))


def match_template(
    config: dict[str, Any],
    document_text: str,
    entity_rows: list[dict[str, Any]],
) -> dict[str, Any] | None:
    document = normalized_match_text(document_text)
    entities = entity_search_text(entity_rows)
    candidates: list[dict[str, Any]] = []
    for template in config.get("templates", []):
        score = 0
        evidence: list[str] = []
        name = normalized_match_text(template.get("name"))
        code = normalized_match_text(template.get("code"))
        if name and name in document:
            score += 6
            evidence.append("template_name_in_text")
        if code and code in entities:
            score += 5
            evidence.append("template_code_in_entities")
        for phrase in recognition_phrases(template):
            if phrase in {name, code}:
                continue
            if phrase in document:
                score += 3
                evidence.append("recognition_phrase_in_text")
            elif phrase in entities:
                score += 4
                evidence.append("recognition_phrase_in_entities")
        candidates.append(
            {
                "template": template,
                "score": score,
                "priority": float(template.get("priority") or 0),
                "evidence": sorted(set(evidence)),
            }
        )
    candidates.sort(
        key=lambda item: (
            item["score"], item["priority"], item["template"]["id"]
        ),
        reverse=True,
    )
    if not candidates or candidates[0]["score"] <= 0:
        return None
    selected = candidates[0]
    selected["confidence"] = "high" if selected["score"] >= 6 else "low"
    return selected


def confidence_value(confidence: dict[str, Any], field_name: str) -> float:
    value = confidence.get(field_name)
    if isinstance(value, list):
        values = [
            float(item) for item in value if isinstance(item, (int, float))
        ]
        return max(values, default=0.0)
    return float(value) if isinstance(value, (int, float)) else 0.0


def clue_fragments(value: str) -> list[str]:
    return [
        normalized
        for part in re.split(r"[\n,;]+", value)
        if len(normalized := normalized_match_text(part)) >= 2
    ]


def validate_rule(
    rule: dict[str, Any],
    fields: dict[str, Any],
    confidence: dict[str, Any],
    document_text: str,
) -> tuple[list[str], list[dict[str, Any]], list[str]]:
    review_fields: list[str] = []
    suggestions: list[dict[str, Any]] = []
    warnings: list[str] = []
    field_name = clean_text(rule.get("output_field"))
    if not field_name:
        raise ValueError("missing_output_field")
    value = fields.get(field_name)
    empty = value is None or value == "" or value == []
    usually_present = clean_text(rule.get("usually_present")).lower()
    if empty and (
        bool(rule.get("required_for_review")) or usually_present == "yes"
    ):
        review_fields.append(field_name)
        warnings.append("missing_expected_field")
    document = normalized_match_text(document_text)
    clues = clue_fragments(clean_text(rule.get("label_clues")))
    if clues and not any(clue in document for clue in clues):
        warnings.append("expected_text_not_found")
    if not empty and confidence_value(confidence, field_name) <= 0:
        warnings.append("confidence_unavailable")
    return review_fields, suggestions, warnings


def validate_template(
    template: dict[str, Any],
    fields: dict[str, Any],
    confidence: dict[str, Any],
    document_text: str,
    match_confidence: str,
) -> dict[str, Any]:
    review_fields: list[str] = []
    suggestions: list[dict[str, Any]] = []
    failed_rules: list[dict[str, str]] = []
    warnings: list[str] = []
    if match_confidence == "low":
        warnings.append("low_template_confidence")
    for rule in template.get("rules", []):
        try:
            rule_fields, rule_suggestions, rule_warnings = validate_rule(
                rule, fields, confidence, document_text
            )
            review_fields.extend(rule_fields)
            suggestions.extend(rule_suggestions)
            warnings.extend(rule_warnings)
        except (ValueError, TypeError, KeyError):
            failed_rules.append(
                {
                    "rule_id": clean_text(rule.get("id")),
                    "category": "invalid_rule_configuration",
                }
            )
    review_fields = sorted(set(review_fields))
    warnings = sorted(set(warnings))
    status = (
        "needs_review"
        if failed_rules or review_fields or warnings
        else "passed"
    )
    return {
        "status": status,
        "fields_needing_review": review_fields,
        "suggestions": suggestions,
        "failed_rules": failed_rules,
        "warnings": warnings,
    }


def template_metadata(
    config: dict[str, Any] | None,
    config_state: str,
    document_text: str,
    entity_rows: list[dict[str, Any]],
    fields: dict[str, Any],
    confidence: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    if config is None:
        return (
            {
                "status": "config_unavailable",
                "config_freshness": "unavailable",
            },
            {
                "status": "not_run",
                "fields_needing_review": [],
                "suggestions": [],
                "failed_rules": [],
                "warnings": ["template_config_unavailable"],
            },
        )
    matched = match_template(config, document_text, entity_rows)
    if matched is None:
        status = "config_stale" if config_state == "config_stale" else "no_match"
        return (
            {
                "status": status,
                "matched_template_id": None,
                "matched_template_name": None,
                "ticket_family": None,
                "confidence": None,
                "config_freshness": (
                    "stale" if config_state == "config_stale" else "fresh"
                ),
                "config_version": config.get("version"),
            },
            {
                "status": "not_run",
                "fields_needing_review": [],
                "suggestions": [],
                "failed_rules": [],
                "warnings": ["template_not_matched"],
            },
        )
    template = matched["template"]
    status = "config_stale" if config_state == "config_stale" else "matched"
    validation = validate_template(
        template,
        fields,
        confidence,
        document_text,
        matched["confidence"],
    )
    if config_state == "config_stale":
        validation["warnings"] = sorted(
            set(validation["warnings"] + ["template_config_stale"])
        )
        validation["status"] = "needs_review"
    return (
        {
            "status": status,
            "matched_template_id": template.get("id"),
            "matched_template_name": template.get("name"),
            "ticket_family": template.get("code"),
            "confidence": matched["confidence"],
            "score": matched["score"],
            "config_freshness": (
                "stale" if config_state == "config_stale" else "fresh"
            ),
            "config_version": config.get("version"),
        },
        validation,
    )


def require_api_key(provided_key: str | None) -> None:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="DIANE_API_KEY is not configured")
    if not provided_key or not secrets.compare_digest(provided_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "diane-ticket-extractor",
        "processor": PROCESSOR_NAME,
    }


@app.post("/extract/ticket")
async def extract_ticket(
    file: UploadFile = File(...),
    submission_id: str = Form(""),
    x_diane_api_key: str | None = Header(
        default=None, alias="X-Diane-API-Key"
    ),
) -> dict[str, Any]:
    require_api_key(x_diane_api_key)
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    mime_type = determine_mime_type(file)
    raw_document = documentai.RawDocument(
        content=file_bytes, mime_type=mime_type
    )
    request = documentai.ProcessRequest(
        name=PROCESSOR_NAME,
        raw_document=raw_document,
        skip_human_review=True,
    )
    try:
        response = client.process_document(request=request)
    except GoogleAPICallError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Document AI processing failed: {exc}",
        ) from exc
    fields: dict[str, Any] = {}
    confidence: dict[str, Any] = {}
    entity_rows: list[dict[str, Any]] = []
    document_text = response.document.text or ""
    collect_entities(
        response.document.entities, fields, confidence, entity_rows
    )
    config, config_state = get_config_snapshot()
    template, validation = template_metadata(
        config,
        config_state,
        document_text,
        entity_rows,
        fields,
        confidence,
    )
    return {
        "ok": True,
        "submission_id": submission_id,
        "filename": file.filename,
        "mime_type": mime_type,
        "data": {
            "fields": fields,
            "confidence": confidence,
            "entities": entity_rows,
            "template": template,
            "validation": validation,
        },
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "diane-ticket-extractor",
        "endpoints": ["GET /health", "POST /extract/ticket"],
    }
