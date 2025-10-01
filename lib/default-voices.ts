import voiceLibrary from '../public/voice-library.json';

export type VoiceOption = {
  id?: string;
  provider?: string;
  providerId: string;
  slug: string;
  name: string;
  gender?: string;
  accent?: string;
  description?: string;
  language?: string;
  previewUrl?: string;
  isPublic?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  orgId?: string;
};

// Filter out deleted voices and return active voices only
export function getVoiceLibrary(): VoiceOption[] {
  return voiceLibrary.filter(voice => !voice.isDeleted) as VoiceOption[];
}

// Get voices grouped by gender
export function getVoicesByGender() {
  const voices = getVoiceLibrary();
  return {
    female: voices.filter(v => v.gender?.toLowerCase() === 'female'),
    male: voices.filter(v => v.gender?.toLowerCase() === 'male'),
    other: voices.filter(v => !v.gender || (v.gender.toLowerCase() !== 'female' && v.gender.toLowerCase() !== 'male'))
  };
}

// Find a specific voice by slug or providerId
export function findVoice(identifier: string): VoiceOption | undefined {
  const voices = getVoiceLibrary();
  return voices.find(v => v.slug === identifier || v.providerId === identifier);
}

// Default voice slug - using Jessica which is popular and public
export function getDefaultVoiceSlug(): string {
  // Look for Jessica first (popular voice from the library)
  const jessica = findVoice('cgSgspJ2msm6clMCkdW9');
  if (jessica) return jessica.slug;
  
  // Fallback to any female voice
  const voices = getVoiceLibrary();
  const femaleVoice = voices.find(v => v.gender === 'female');
  return femaleVoice?.slug || voices[0]?.slug || 'cgSgspJ2msm6clMCkdW9';
}
