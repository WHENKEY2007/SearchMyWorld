import pytest
from pathlib import Path
from PIL import Image, ImageDraw
import pymupdf
from docx import Document
from pptx import Presentation
from app.extractors.manager import extractor_manager

def test_pdf_extraction(tmp_path):
    pdf_path = tmp_path / "sample.pdf"
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "SearchMyWorld PDF Test: Fourier Transform notes.")
    doc.save(str(pdf_path))
    doc.close()

    result = extractor_manager.extract(pdf_path)
    assert result.file_type == "document"
    assert "Fourier Transform" in result.text
    assert len(result.pages) == 1
    assert result.pages[0].page_number == 1

def test_docx_extraction(tmp_path):
    docx_path = tmp_path / "sample.docx"
    doc = Document()
    doc.add_heading("Architecture Overview", level=1)
    doc.add_paragraph("SearchMyWorld uses SQLite FTS5 and dense embeddings.")
    doc.save(str(docx_path))

    result = extractor_manager.extract(docx_path)
    assert result.file_type == "document"
    assert "Architecture Overview" in result.text
    assert "SQLite FTS5" in result.text
    assert len(result.pages) > 0

def test_pptx_extraction(tmp_path):
    pptx_path = tmp_path / "sample.pptx"
    prs = Presentation()
    slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "AI Hackathon Presentation"
    subtitle.text = "Evaluating machine learning models."
    prs.save(str(pptx_path))

    result = extractor_manager.extract(pptx_path)
    assert result.file_type == "document"
    assert "AI Hackathon Presentation" in result.text
    assert "machine learning models" in result.text
    assert len(result.pages) == 1

def test_image_ocr_extraction(tmp_path):
    img_path = tmp_path / "screenshot.png"
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "ModuleNotFoundError: No module named torch", fill=(0, 0, 0))
    img.save(str(img_path))

    result = extractor_manager.extract(img_path)
    assert result.file_type == "image"
    assert len(result.pages) == 1
    assert result.metadata["width"] == 300
    assert result.metadata["height"] == 100
