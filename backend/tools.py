from langchain_core.tools import tool
import PyPDF2


@tool
def extract_resume_text(file_path: str) -> str:
    """Read a resume PDF from the local filesystem and return its raw extracted text.

    Args:
        file_path: Absolute or relative filesystem path to the PDF file.

    Returns:
        Concatenated text extracted from every page of the PDF (newline-separated).
        Empty string if no text could be extracted.
    """
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    return text
