import io
import mimetypes
from typing import Tuple

import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from docx import Document as DocxDocument


def detect_mime(filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    bio = io.BytesIO(file_bytes)
    doc = DocxDocument(bio)
    return "\n".join(p.text for p in doc.paragraphs)


def extract_text_from_html(file_bytes: bytes) -> str:
    html = file_bytes.decode("utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")
    # Remove scripts/styles
    for tag in soup(["script", "style"]):
        tag.extract()
    return soup.get_text(" ").strip()


def extract_text_from_plain(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_text_from_file(filename: str, content: bytes) -> Tuple[str, str]:
    """
    Returns (text, mime_type)
    """
    mime = detect_mime(filename)
    if mime == "application/pdf" or filename.lower().endswith(".pdf"):
        return extract_text_from_pdf(content), mime
    if mime in {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"} or filename.lower().endswith(".docx"):
        return extract_text_from_docx(content), mime
    if mime in {"text/html", "application/xhtml+xml"} or filename.lower().endswith((".html", ".htm")):
        return extract_text_from_html(content), mime
    if mime.startswith("text/"):
        return extract_text_from_plain(content), mime
    # Fallback to plain text decode
    return extract_text_from_plain(content), mime
