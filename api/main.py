from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import List, Optional
import tempfile, os, asyncio
from fastapi.middleware.cors import CORSMiddleware
import contrast_detection


# Create FastAPI app instance
app = FastAPI()

# allow your frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze")
async def analyze(url: Optional[str] = Form(None), files: Optional[List[UploadFile]] = File(None)):
    """
    Accepts either:
    - JSON/form with 'url' (will capture a screenshot and analyze), or
    - multipart form with uploaded image files
    """
    if not url and not files:
        raise HTTPException(status_code=400, detail="Provide either a url or files to analyze")

    tmp_dir = tempfile.mkdtemp(prefix="analysis_")

    try:
        if url:
            # run blocking work in a thread
            result = await asyncio.to_thread(contrast_detection.analyze_url, url, tmp_dir)
            return result

        # handle uploaded files: save to tmp_dir then analyze
        saved = []
        for up in files:
            dest = os.path.join(tmp_dir, up.filename)
            with open(dest, "wb") as f:
                f.write(await up.read())
            saved.append(dest)

        result = await asyncio.to_thread(contrast_detection.analyze_files, saved, tmp_dir)
        return result

    finally:
        # NOTE: keep temp files around if you want; cleanup code could be added here.
        pass
