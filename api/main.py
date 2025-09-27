import os
import tempfile
from fastapi import File, UploadFile
from flask import app
from code_analyzer import (
    check_aria_labels,
    ImageAltAnalyzer,
    analyze_nesting_issues
)


@app.post("/analyze")
async def analyze(files: list[UploadFile] = File(...)):
    results = []
    analyzer = ImageAltAnalyzer()  # Create once, reuse

    for f in files:
        suffix = os.path.splitext(f.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(await f.read())
        tmp.close()
        file_path = tmp.name

        aria = check_aria_labels(file_path)
        nesting = []
        if suffix == ".html":
            nesting = analyze_nesting_issues(os.path.dirname(file_path))

        # Run the alt checks (on HTML, JS, or TS files)
        alt_issues = []
        if suffix in [".html", ".js", ".ts"]:
            alt_issues = analyzer.analyze_file(file_path)

        results.append({
            "filename": f.filename,
            "aria": aria,
            "nesting": nesting,
            "alt_issues": alt_issues,
        })

    return {"results": results}
