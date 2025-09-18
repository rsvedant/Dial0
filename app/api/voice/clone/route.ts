import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

// Generate HS256 JWT for Vapi using server env (Next.js server only)
function generateVapiJWT(orgId: string, privateKey: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    orgId,
    token: { tag: 'private' },
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iat: Math.floor(Date.now() / 1000)
  }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha256', privateKey).update(`${encodedHeader}.${encodedPayload}`).digest('base64url')
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, voiceName, description, mimeType } = await req.json()
    const orgId = process.env.VAPI_ORG_ID
    const privateKey = process.env.VAPI_PRIVATE_API_KEY
    if (!orgId || !privateKey) {
      return NextResponse.json({ error: 'Missing VAPI_ORG_ID or VAPI_PRIVATE_API_KEY' }, { status: 500 })
    }
    const jwtToken = generateVapiJWT(orgId, privateKey)

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) return NextResponse.json({ error: 'Convex URL not configured' }, { status: 500 })
    const convex = new ConvexHttpClient(convexUrl)
    const result = await convex.action((api as any).actions.voiceCloning.cloneVoiceWithAudioData, {
      audioBase64,
      voiceName,
      description,
      mimeType,
      jwtToken,
    })
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Voice clone failed' }, { status: 400 })
    }
    // Persist voiceId in settings here if you want server-side persistence; else client can call saveSettings.
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
