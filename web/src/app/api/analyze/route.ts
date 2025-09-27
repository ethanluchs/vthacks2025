import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

        // Get backend service URL from environment
        const backendUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:8000';
        
        // Forward the FormData to the backend service
        const backendResponse = await fetch(`${backendUrl}/analyze`, {
            method: 'POST',
            body: formData,
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error('Backend service error:', errorText);
            return NextResponse.json(
                { error: 'Backend analysis service unavailable' },
                { status: 502 }
            );
        }

        const analysisResult = await backendResponse.json();
        return NextResponse.json(analysisResult);
        
    } catch (error) {
        console.error('Analysis error:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
                { error: 'Cannot connect to analysis service. Please try again later.' },
                { status: 503 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to analyze files: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    }
}

