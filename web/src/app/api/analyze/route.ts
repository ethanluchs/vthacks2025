import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    let tempDir: string | null = null;
    
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');
        const url = formData.get('url')?.toString();

        if (files.length === 0 && !url) {
            return NextResponse.json(
                { error: 'No files or URL provided' },
                { status: 400 }
            );
        }

        // Create temporary directory for files
        tempDir = path.join(process.cwd(), 'temp', uuidv4());
        await mkdir(tempDir, { recursive: true });

        // Save uploaded files to temp directory
        const fileNames: string[] = [];
        for (const file of files) {
            if (!(file instanceof File)) continue;
            
            const fileName = file.name;
            const filePath = path.join(tempDir, fileName);
            const arrayBuffer = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(arrayBuffer));
            fileNames.push(fileName);
        }

        // Run Python analysis
        const analysisResult = await runPythonAnalysis(tempDir, fileNames);
        
        return NextResponse.json(analysisResult);
        
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze files: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    } finally {
        // Clean up temp directory
        if (tempDir) {
            try {
                await rm(tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp directory:', cleanupError);
            }
        }
    }
}

async function runPythonAnalysis(tempDir: string, fileNames: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        // Path to Python script
        const scriptPath = path.join(process.cwd(), '..', 'api', 'analysis', 'code_analyzer.py');
        
        // Run Python script with temp directory as argument
        const pythonProcess = spawn('python3', [scriptPath, tempDir], {
            cwd: tempDir
        });
        
        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Parse the Python output
                    // For now, return a structured response based on your Python script output
                    const result = {
                        files: fileNames,
                        aria: {
                            total_elements: 10, // These would come from your Python script
                            total_without_aria: 3,
                            missing_elements: []
                        },
                        altText: {
                            total_images: 5,
                            images_without_alt: 1,
                            details: []
                        },
                        structure: {
                            total_checks: 15,
                            total_issues: 2,
                            issues: []
                        },
                        rawOutput: outputData, // For debugging
                        timestamp: new Date().toISOString()
                    };
                    
                    resolve(result);
                } catch (parseError) {
                    reject(new Error('Failed to parse analyzer output: ' + parseError));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorData}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}