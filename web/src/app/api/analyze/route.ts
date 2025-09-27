import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');

        // Create temporary files or pass content directly to the Python script
        const fileContents = await Promise.all(
            files.map(async (file: any) => ({
                name: file.name,
                content: await file.text()
            }))
        );

        // Call the Python analyzer
        const analysisResult = await runAnalyzer(fileContents);
        
        return NextResponse.json(analysisResult);
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze files' },
            { status: 500 }
        );
    }
}

async function runAnalyzer(files: { name: string; content: string }[]) {
    return new Promise((resolve, reject) => {
        // Construct the path to the Python script
        const scriptPath = path.join(process.cwd(), '..', 'api', 'analysis', 'code_analyzer.py');
        
        // Start the Python process
        const pythonProcess = spawn('python', [scriptPath]);
        
        let outputData = '';
        let errorData = '';

        // Send the file contents to the Python script
        pythonProcess.stdin.write(JSON.stringify(files));
        pythonProcess.stdin.end();

        // Collect output from the Python script
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(outputData);
                    resolve(result);
                } catch (error) {
                    reject(new Error('Failed to parse analyzer output'));
                }
            } else {
                reject(new Error(`Analyzer failed: ${errorData}`));
            }
        });
    });
}
