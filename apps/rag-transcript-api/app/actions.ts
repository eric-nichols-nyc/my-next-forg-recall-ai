"use server";

async function getTranscript(videoUrl: string) {
  const TRANSCRIPT_API = process.env.TRANSCRIPT_API;

  if (!TRANSCRIPT_API) {
    throw new Error("TRANSCRIPT_API environment variable is not set");
  }

  const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(videoUrl)}&format=json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TRANSCRIPT_API}` },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  // Handle both array format and string format
  const transcript = data.transcript;
  
  // If it's already an array, return it
  if (Array.isArray(transcript)) {
    return transcript;
  }
  
  // If it's a string, return it as-is
  if (typeof transcript === "string") {
    return transcript;
  }
  
  // Fallback: try to access common transcript formats
  return transcript;
}

export async function fetchYouTubeTranscript(videoUrl: string) {
  try {
    const transcript = await getTranscript(videoUrl);
    return { success: true, transcript };
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch transcript",
    };
  }
}
