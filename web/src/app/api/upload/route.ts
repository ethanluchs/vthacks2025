import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    // Validate number of files
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }
    if (files.length > 3) {
      return NextResponse.json(
        { error: "Maximum 3 files allowed" },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'application/typescript'
    ];

    const fileContents: { filename: string; content: string; type: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Invalid file format" },
          { status: 400 }
        );
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only HTML, CSS, JavaScript, and TypeScript files are allowed.` },
          { status: 400 }
        );
      }

      // Read file content
      const content = await file.text();
      fileContents.push({
        filename: file.name,
        content,
        type: file.type
      });
    }

    // Store or process files here
    // For now, just return success with file info
    return NextResponse.json({
      message: "Files uploaded successfully",
      files: fileContents.map(f => ({
        filename: f.filename,
        type: f.type
      }))
    });

  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: "Error processing files" },
      { status: 500 }
    );
  }
}
