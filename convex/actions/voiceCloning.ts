"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";


// Helper function to create browser-like headers to bypass Cloudflare
function getBrowserHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Origin': 'https://vapi.ai',
    'Referer': 'https://vapi.ai/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    ...additionalHeaders
  };
}

// Wrapper function for Vapi API calls with browser headers
async function fetchVapiAPI(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getBrowserHeaders(options.headers as Record<string, string> || {});
  return fetch(url, {
    ...options,
    headers
  });
}

// Minimal JWT generation for Vapi auth (HS256)
function generateVapiJWT(orgId: string, privateKey: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    orgId,
    token: { tag: "private" },
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iat: Math.floor(Date.now() / 1000),
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Simple in-memory cache (Convex action memory per invocation is ephemeral, but ok for short reuse)
let cachedJWT: { token: string; expiresAt: number } | null = null;

export const cloneVoiceWithAudioData = action({
  args: {
    audioBase64: v.string(), // base64-encoded audio (mp3/wav)
    voiceName: v.optional(v.string()),
    description: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, { audioBase64, voiceName, description, mimeType }) => {
    try {
  // Build a safe default voice name
  const finalVoiceName = (voiceName || "My Voice").toString().slice(0, 50);

      // Vapi credentials: For demo, read from environment-like secrets via Convex config if available
      // If not available in Convex, you may replace these with your actual values
      const privateKey = process.env.VAPI_PRIVATE_API_KEY;
      const orgId = process.env.VAPI_ORG_ID;
      if (!privateKey || !orgId) {
        throw new Error("Missing Vapi credentials (VAPI_PRIVATE_API_KEY and VAPI_ORG_ID)");
      }

      const now = Date.now();
      let jwtToken: string;
      if (cachedJWT && cachedJWT.expiresAt > now + 5 * 60 * 1000) {
        jwtToken = cachedJWT.token;
      } else {
        jwtToken = generateVapiJWT(orgId, privateKey);
        cachedJWT = { token: jwtToken, expiresAt: now + 60 * 60 * 1000 };
      }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const type = (mimeType && typeof mimeType === 'string') ? mimeType : 'audio/webm';
  const audioBlob = new Blob([audioBuffer], { type });

      const formData = new FormData();
      formData.append("name", finalVoiceName);
      formData.append("description", description || `Cloned voice for ${finalVoiceName}`);
  // Infer extension from mimeType
  const ext = type.includes('mp3') ? 'mp3' : type.includes('wav') ? 'wav' : type.includes('mpeg') ? 'mp3' : type.includes('webm') ? 'webm' : 'mp3';
  formData.append("files", audioBlob, `${finalVoiceName}.${ext}`);

      const resp = await fetchVapiAPI("https://api.vapi.ai/11labs/voice/clone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: "*/*",
        },
        body: formData,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Vapi error ${resp.status}: ${errText}`);
      }
      const result = await resp.json();
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Unexpected Vapi response format");
      }
      const voice = result[0];
      return { success: true, voiceId: voice.slug as string, voiceName: voice.name as string, providerId: voice.providerId as string };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

// Note: listVoices and fetch11LabsVoiceLibrary actions have been removed
// Voice library is now cached in /lib/voice-library.json
// To refresh the cache, run: npx tsx scripts/fetch-voice-library.ts
