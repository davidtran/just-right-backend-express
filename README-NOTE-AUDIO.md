# Note Audio API

This document describes the Note Audio API, which allows converting note summaries to audio files using Azure Text-to-Speech.

## Overview

The Note Audio API provides functionality to:

- Request audio generation for a note's summary
- Check the status of audio generation
- Retrieve the generated audio file URL

The API uses Azure Text-to-Speech to convert note summaries to natural-sounding speech. It processes the markdown content of the summary to make it more suitable for speech synthesis.

## API Endpoints

### Get Note Audio

**Endpoint:** `GET /api/note/audio/:noteId`

**Description:** Request audio generation for a note or retrieve the URL of an already generated audio file.

**Parameters:**

- `noteId` (path parameter): The ID of the note for which to generate audio

**Responses:**

1. Audio is already generated:

```json
{
  "status": "completed",
  "file_url": "https://example.com/audio/file.mp3",
  "duration_seconds": 120,
  "language": "en",
  "last_generated_at": "2023-06-01T12:00:00Z"
}
```

2. Audio generation is in progress:

```json
{
  "status": "pending",
  "message": "Audio generation is pending",
  "noteAudioId": "123e4567-e89b-12d3-a456-426614174000"
}
```

3. Audio generation has failed and is being retried:

```json
{
  "status": "pending",
  "message": "Previous attempt failed. Audio generation has been requeued.",
  "noteAudioId": "123e4567-e89b-12d3-a456-426614174000",
  "previous_error": "Error message"
}
```

## Implementation Details

The audio generation process follows these steps:

1. When a request is made to the API, it checks if audio already exists for the note
2. If audio exists and is completed, it returns the audio file URL
3. If audio doesn't exist or failed previously, it creates a background job to generate the audio
4. The background job:
   - Uses Gemini to convert markdown to speech-friendly text
   - Calls Azure Text-to-Speech API to generate the audio file
   - Uploads the audio file to the CDN
   - Updates the database with the file URL and status

## Configuration

The following environment variables need to be set:

```
AZURE_REGION=eastus
AZURE_TTS_KEY=your_azure_tts_key_here
```

## Database Setup

Run the following command to create the necessary database table:

```
npm run create-note-audio-table
```
