"use server";

const BASE_URL = "https://transcriptapi.com/api/v2";

async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = `HTTP ${response.status}`;
  let errorDetail: unknown = null;

  try {
    const error = await response.json();
    errorDetail = error.detail;

    if (response.status === 402) {
      errorMessage = "Payment required";
      console.error("Payment required:", error.detail?.message);
      if (error.detail?.action_url) {
        console.error("Action:", error.detail.action_url);
      }
    } else if ([408, 429, 503].includes(response.status)) {
      // Retryable errors
      const retryAfter = response.headers.get("Retry-After") || "5";
      errorMessage = `Service temporarily unavailable. Retry after ${retryAfter} seconds`;
      console.error(
        `Retryable error (${response.status}). Retry after ${retryAfter} seconds`
      );
    } else if (response.status === 404) {
      errorMessage = "Video not found or has no transcript available";
      console.error("Video not found or has no transcript available");
    } else {
      errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.detail?.message || `API Error: ${response.status}`;
      console.error("API Error:", error.detail);
    }
  } catch {
    // If error response is not JSON, use status text
    errorMessage = response.statusText || `HTTP ${response.status}`;
  }

  const error = new Error(errorMessage);
  (error as Error & { detail: unknown }).detail = errorDetail;
  throw error;
}

type TranscriptOptions = {
  format?: "json" | "text";
  includeTimestamp?: boolean;
  sendMetadata?: boolean;
};

async function getTranscript(
  videoUrl: string,
  options: TranscriptOptions = {}
) {
  const TRANSCRIPT_API = process.env.TRANSCRIPT_API;

  if (!TRANSCRIPT_API) {
    throw new Error("TRANSCRIPT_API environment variable is not set");
  }

  const {
    format = "json",
    includeTimestamp = true,
    sendMetadata = false,
  } = options;

  const params = new URLSearchParams({
    video_url: videoUrl,
    format,
    include_timestamp: String(includeTimestamp),
    send_metadata: String(sendMetadata),
  });

  try {
    const response = await fetch(
      `${BASE_URL}/youtube/transcript?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${TRANSCRIPT_API}`,
        },
      }
    );

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data = await response.json();

    // Process transcript based on format
    if (
      format === "json" &&
      includeTimestamp &&
      Array.isArray(data.transcript)
    ) {
      for (const segment of data.transcript as Array<{
        start: number;
        text: string;
      }>) {
        console.log(`[${segment.start}s] ${segment.text}`);
      }
    }

    return data;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw error;
  }
}

export async function fetchYouTubeTranscript(
  videoUrl: string,
  options: TranscriptOptions = {}
) {
  try {
    const data = await getTranscript(videoUrl, options);
    return {
      success: true,
      transcript: data.transcript,
      videoId: data.video_id,
      metadata: data.metadata,
    } as const;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch transcript",
      detail: (error as Error & { detail: unknown })?.detail,
    };
  }
}
