from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Optional
import tempfile, os, asyncio, traceback
from fastapi.middleware.cors import CORSMiddleware
import contrast_detection
import code_analyzer

# Create FastAPI app instance
app = FastAPI()

# Allow your frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler to ensure JSON responses"""
    print(f"=== GLOBAL EXCEPTION ===")
    print(f"Exception type: {type(exc)}")
    print(f"Exception message: {str(exc)}")
    traceback.print_exc()
    print("========================")
    return JSONResponse(
        status_code=500,
        content={"error": f"Internal server error: {str(exc)}"}
    )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "Backend is running"}

@app.post("/analyze")
async def analyze(request: Request):
    """
    Handle form data manually to avoid FastAPI parsing issues
    Processes both URL and files when provided
    """
    print("=== ANALYZE ENDPOINT CALLED ===")
    
    try:
        # Get the form data
        form_data = await request.form()
        print(f"Form data keys: {list(form_data.keys())}")
        
        # Extract URL
        url = form_data.get("url")
        print(f"URL received: {url}")
        
        # Extract files
        files = []
        for key, value in form_data.items():
            if key == "files":
                if hasattr(value, 'filename'):  # It's a file
                    files.append(value)
                    print(f"File found: {value.filename} ({value.size} bytes)")
        
        print(f"Number of files: {len(files)}")
        
        # Filter out empty files
        files = [f for f in files if f.filename and f.size > 0]
        print(f"Filtered files: {len(files)} non-empty files")

        # Check if we have either URL or files
        if not url and len(files) == 0:
            print("ERROR: No URL or files provided")
            raise HTTPException(
                status_code=400, 
                detail="Provide either a url or files to analyze"
            )

        # Create temporary directory
        tmp_dir = tempfile.mkdtemp(prefix="analysis_")
        print(f"Created temp directory: {tmp_dir}")

        try:
            results = {}
            
            # Process URL if provided
            if url and str(url).strip():
                print(f"Processing URL: {url}")
                
                # Check if the function exists
                if not hasattr(contrast_detection, 'analyze_url'):
                    raise Exception("contrast_detection.analyze_url function not found")
                
                # Run URL analysis
                url_result = await asyncio.to_thread(contrast_detection.analyze_url, str(url).strip(), tmp_dir)
                print(f"analyze_url returned: {url_result}")
                results["url_analysis"] = url_result

            # Process files if provided
            if files and len(files) > 0:
                print(f"Processing {len(files)} uploaded files")
                saved_files = []
                
                for i, uploaded_file in enumerate(files):
                    print(f"Processing file {i}: {uploaded_file.filename} ({uploaded_file.size} bytes)")
                    
                    # Save uploaded file to temp directory
                    file_path = os.path.join(tmp_dir, uploaded_file.filename)
                    with open(file_path, "wb") as f:
                        content = await uploaded_file.read()
                        f.write(content)
                    saved_files.append(file_path)
                    print(f"Saved file to: {file_path}")

                # Check if analyze_files function exists in code_analyzer
                if not hasattr(code_analyzer, 'analyze_files'):
                    raise Exception("code_analyzer.analyze_files function not found")
                
                # Run file analysis using code_analyzer
                file_result = await asyncio.to_thread(code_analyzer.analyze_files, saved_files, tmp_dir)
                print(f"analyze_files returned: {file_result}")
                results["file_analysis"] = file_result
            
            # Return combined results
            if not results:
                raise HTTPException(
                    status_code=400, 
                    detail="No valid URL or files provided"
                )
            
            return {
                "status": "success", 
                "type": "combined" if len(results) > 1 else ("url" if "url_analysis" in results else "files"),
                "data": results
            }

        except Exception as e:
            print(f"=== ANALYSIS ERROR ===")
            print(f"Error type: {type(e)}")
            print(f"Error message: {str(e)}")
            traceback.print_exc()
            print("======================")
            
            # Clean up temp directory on error
            import shutil
            try:
                shutil.rmtree(tmp_dir)
                print(f"Cleaned up temp directory: {tmp_dir}")
            except Exception as cleanup_error:
                print(f"Failed to cleanup temp directory: {cleanup_error}")
            
            return JSONResponse(
                status_code=500,
                content={"error": f"Analysis failed: {str(e)}"}
            )

    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"=== UNEXPECTED ERROR ===")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()
        print("========================")
        return JSONResponse(
            status_code=500,
            content={"error": f"Unexpected error: {str(e)}"}
        )