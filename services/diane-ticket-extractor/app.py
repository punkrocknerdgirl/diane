import os
import secrets
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import documentai_v1 as documentai


PROJECT_ID = os.getenv("DOCUMENT_AI_PROJECT_ID", "413667913571")
LOCATION = os.getenv("DOCUMENT_AI_LOCATION", "us")
PROCESSOR_ID = os.getenv("DOCUMENT_AI_PROCESSOR_ID", "61c933f67dba23a3")
API_KEY = os.getenv("DIANE_API_KEY", "")

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
            collect_entities(
                entity.properties,
                fields,
                confidence,
                entity_rows,
            )
            continue

        field_name = (entity.type_ or "").strip()
        if not field_name:
            continue

        value = entity_value(entity)
        score = round(float(entity.confidence or 0), 6)

        add_value(fields, field_name, value)
        add_value(confidence, field_name, score)

        entity_rows.append(
            {
                "type": field_name,
                "value": value,
                "confidence": score,
            }
        )


def require_api_key(provided_key: str | None) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="DIANE_API_KEY is not configured",
        )

    if not provided_key or not secrets.compare_digest(provided_key, API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Invalid API key",
        )


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
        default=None,
        alias="X-Diane-API-Key",
    ),
) -> dict[str, Any]:
    require_api_key(x_diane_api_key)

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    mime_type = determine_mime_type(file)

    raw_document = documentai.RawDocument(
        content=file_bytes,
        mime_type=mime_type,
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

    collect_entities(
        response.document.entities,
        fields,
        confidence,
        entity_rows,
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
        },
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "diane-ticket-extractor",
        "endpoints": [
            "GET /health",
            "POST /extract/ticket",
        ],
    }
