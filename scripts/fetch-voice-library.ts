import fs from 'fs/promises'
import path from 'path'

// Simple JWT generation for Vapi auth (HS256)
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

async function fetchVoiceLibrary() {
	const privateKey = process.env.VAPI_PRIVATE_API_KEY
	const orgId = process.env.VAPI_ORG_ID

	if (!privateKey || !orgId) {
		console.error('❌ Missing VAPI_PRIVATE_API_KEY or VAPI_ORG_ID environment variables')
		console.error('   Tip: export these in your shell before running the script.')
		process.exit(1)
	}

  console.log('🔑 Generating Vapi JWT...')
  const jwtToken = generateVapiJWT(orgId, privateKey)

  console.log('📡 Fetching voice library from Vapi...')
  const resp = await fetch('https://api.vapi.ai/voice-library/11labs', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/json'
    }
  })

  if (!resp.ok) {
    console.error('❌ Failed to fetch voice library:', resp.statusText)
    process.exit(1)
  }

  const library = await resp.json()
  console.log(`✅ Fetched ${library.length} voices from the library`)

  // Write to file
  const outputPath = path.join(process.cwd(), 'public', 'voice-library.json')
  await fs.writeFile(outputPath, JSON.stringify(library, null, 2))
  console.log(`💾 Saved voice library to ${outputPath}`)

  // Print summary
  const byGender = library.reduce((acc: any, voice: any) => {
    const gender = voice.gender || 'unknown'
    acc[gender] = (acc[gender] || 0) + 1
    return acc
  }, {})

  console.log('\n📊 Voice library summary:')
  console.log(`   Total: ${library.length}`)
  Object.entries(byGender).forEach(([gender, count]) => {
    console.log(`   ${gender}: ${count}`)
  })
}

fetchVoiceLibrary().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
