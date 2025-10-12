// Mock data generator for United Healthcare company dashboard

export interface MockCall {
  companyName: string;
  title: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  duration?: number; // in seconds
  transcript?: string;
  sentimentScore?: number;
  category?: string;
}

const issueTemplates = [
  {
    category: "Billing & Payments",
    titles: [
      "Question about unexpected charge on bill",
      "Unable to process payment online",
      "Dispute on recent billing statement",
      "Request for payment plan options",
      "Balance showing incorrect amount",
    ],
    transcripts: [
      "I noticed an unexpected charge of $250 on my recent bill. Can you help me understand what this is for? I've been a member for years and never seen this before.",
      "I'm trying to make a payment through the website but keep getting an error message. The payment deadline is tomorrow and I don't want to be late.",
      "My statement shows I owe $500 but I already paid that last month. Can you check my payment history?",
    ],
  },
  {
    category: "Claims Processing",
    titles: [
      "Claim denied for recent doctor visit",
      "Status of submitted claim #UH-2024-5678",
      "How to appeal denied coverage decision",
      "Missing reimbursement for out-of-network provider",
      "Explanation of EOB for hospital stay",
    ],
    transcripts: [
      "I received a denial for my claim from my doctor visit last month. The reason says 'not medically necessary' but my doctor recommended the test. How can I appeal this?",
      "I submitted a claim three weeks ago and still haven't heard anything. Can you check the status? The claim number is UH-2024-5678.",
      "I paid out of pocket for an out-of-network specialist visit and submitted the claim for reimbursement. When should I expect the check?",
    ],
  },
  {
    category: "Prescription & Pharmacy",
    titles: [
      "Prescription not covered under current plan",
      "Unable to refill medication at pharmacy",
      "Mail order pharmacy delivery delay",
      "Question about generic vs brand name coverage",
      "Medication prior authorization status",
    ],
    transcripts: [
      "My pharmacy told me my blood pressure medication isn't covered anymore. I've been taking this for 5 years. What changed?",
      "I'm trying to get a refill but the pharmacy says it needs prior authorization. How long does that take? I'm almost out of pills.",
      "I ordered my medications through mail order two weeks ago and they still haven't arrived. I need them this week.",
    ],
  },
  {
    category: "Provider Network",
    titles: [
      "Check if doctor is in-network",
      "Need referral to specialist",
      "Primary care physician no longer accepting insurance",
      "Find dermatologist near zip code 10001",
      "Verify coverage for out-of-network emergency",
    ],
    transcripts: [
      "I need to see an orthopedic specialist for my knee. Can you help me find one in my network near Boston?",
      "My current PCP sent me a letter saying they're leaving the network next month. Can you help me find a new doctor?",
      "I had an emergency room visit while traveling. The hospital was out-of-network. Will this be covered?",
    ],
  },
  {
    category: "ID Cards & Documents",
    titles: [
      "Request replacement member ID card",
      "Need temporary insurance proof for appointment",
      "Update name on insurance card",
      "Digital ID card not loading in app",
      "Request verification letter for employer",
    ],
    transcripts: [
      "I lost my insurance card and have a doctor appointment tomorrow. Can you email me a temporary card?",
      "I got married and need to update my name on my insurance card. What documents do you need?",
      "The mobile app won't load my digital ID card. I need it to show at the pharmacy.",
    ],
  },
  {
    category: "Plan Information",
    titles: [
      "Clarify deductible and out-of-pocket max",
      "What is covered under preventive care?",
      "Question about copay amounts",
      "Annual enrollment options comparison",
      "Add spouse to existing plan",
    ],
    transcripts: [
      "Can you explain the difference between my deductible and out-of-pocket maximum? I'm confused about what I need to pay.",
      "I want to schedule a physical exam. Is that considered preventive care and fully covered?",
      "I'm considering adding my spouse to my plan. How much would that increase my premium?",
    ],
  },
  {
    category: "Authorization & Referrals",
    titles: [
      "Prior authorization for MRI scan",
      "Referral to specialist not received",
      "Check status of surgery authorization",
      "How long for authorization approval?",
      "Appeal denied prior authorization",
    ],
    transcripts: [
      "My doctor ordered an MRI for my back pain but says it needs prior authorization. How do I get that approved?",
      "I was supposed to get a referral faxed to the specialist but they say they never received it. Can you resend?",
      "I need hip replacement surgery and it's been 10 days since the authorization was submitted. What's the status?",
    ],
  },
  {
    category: "Account Management",
    titles: [
      "Cannot log into member portal",
      "Reset password for online account",
      "Update contact information",
      "Change mailing address",
      "Set up direct deposit for reimbursements",
    ],
    transcripts: [
      "I've been trying to log into the member portal but it says my password is incorrect. I reset it twice and it still doesn't work.",
      "I moved to a new address last month. How do I update that so I receive my mail at the right place?",
      "I'd like to set up direct deposit instead of waiting for reimbursement checks. Is that possible?",
    ],
  },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDate(daysAgo: number): string {
  const now = new Date();
  const randomDaysAgo = Math.random() * daysAgo;
  const date = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generateSentimentScore(): number {
  // Bias toward positive sentiment with some variation
  const random = Math.random();
  if (random < 0.5) return Math.random() * 0.6 + 0.4; // 40% positive (0.4 to 1.0)
  if (random < 0.8) return Math.random() * 0.4 - 0.2; // 30% neutral (-0.2 to 0.2)
  return Math.random() * -0.6 - 0.4; // 30% negative (-0.4 to -1.0)
}

export function generateMockUnitedHealthcareCalls(count: number): MockCall[] {
  const calls: MockCall[] = [];

  for (let i = 0; i < count; i++) {
    const template = getRandomElement(issueTemplates);
    const title = getRandomElement(template.titles);
    const transcript = getRandomElement(template.transcripts);
    
    // Determine status with realistic distribution
    const statusRandom = Math.random();
    let status: "open" | "in-progress" | "resolved";
    if (statusRandom < 0.7) status = "resolved"; // 70% resolved
    else if (statusRandom < 0.9) status = "in-progress"; // 20% in-progress
    else status = "open"; // 10% open

    // Duration: 2-45 minutes (120-2700 seconds)
    const duration = getRandomInt(120, 2700);
    
    const sentimentScore = generateSentimentScore();

    calls.push({
      companyName: "United Healthcare",
      title,
      status,
      createdAt: generateRandomDate(30), // Last 30 days
      duration,
      transcript,
      sentimentScore,
      category: template.category,
    });
  }

  // Sort by date (newest first)
  calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return calls;
}

// Pre-generate a consistent set for development
export const MOCK_UNITED_HEALTHCARE_CALLS = generateMockUnitedHealthcareCalls(75);


// Mock data generator for United Healthcare company dashboard

export interface MockCall {
  companyName: string;
  title: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  duration?: number; // in seconds
  transcript?: string;
  sentimentScore?: number;
  category?: string;
}

const issueTemplates = [
  {
    category: "Billing & Payments",
    titles: [
      "Question about unexpected charge on bill",
      "Unable to process payment online",
      "Dispute on recent billing statement",
      "Request for payment plan options",
      "Balance showing incorrect amount",
    ],
    transcripts: [
      "I noticed an unexpected charge of $250 on my recent bill. Can you help me understand what this is for? I've been a member for years and never seen this before.",
      "I'm trying to make a payment through the website but keep getting an error message. The payment deadline is tomorrow and I don't want to be late.",
      "My statement shows I owe $500 but I already paid that last month. Can you check my payment history?",
    ],
  },
  {
    category: "Claims Processing",
    titles: [
      "Claim denied for recent doctor visit",
      "Status of submitted claim #UH-2024-5678",
      "How to appeal denied coverage decision",
      "Missing reimbursement for out-of-network provider",
      "Explanation of EOB for hospital stay",
    ],
    transcripts: [
      "I received a denial for my claim from my doctor visit last month. The reason says 'not medically necessary' but my doctor recommended the test. How can I appeal this?",
      "I submitted a claim three weeks ago and still haven't heard anything. Can you check the status? The claim number is UH-2024-5678.",
      "I paid out of pocket for an out-of-network specialist visit and submitted the claim for reimbursement. When should I expect the check?",
    ],
  },
  {
    category: "Prescription & Pharmacy",
    titles: [
      "Prescription not covered under current plan",
      "Unable to refill medication at pharmacy",
      "Mail order pharmacy delivery delay",
      "Question about generic vs brand name coverage",
      "Medication prior authorization status",
    ],
    transcripts: [
      "My pharmacy told me my blood pressure medication isn't covered anymore. I've been taking this for 5 years. What changed?",
      "I'm trying to get a refill but the pharmacy says it needs prior authorization. How long does that take? I'm almost out of pills.",
      "I ordered my medications through mail order two weeks ago and they still haven't arrived. I need them this week.",
    ],
  },
  {
    category: "Provider Network",
    titles: [
      "Check if doctor is in-network",
      "Need referral to specialist",
      "Primary care physician no longer accepting insurance",
      "Find dermatologist near zip code 10001",
      "Verify coverage for out-of-network emergency",
    ],
    transcripts: [
      "I need to see an orthopedic specialist for my knee. Can you help me find one in my network near Boston?",
      "My current PCP sent me a letter saying they're leaving the network next month. Can you help me find a new doctor?",
      "I had an emergency room visit while traveling. The hospital was out-of-network. Will this be covered?",
    ],
  },
  {
    category: "ID Cards & Documents",
    titles: [
      "Request replacement member ID card",
      "Need temporary insurance proof for appointment",
      "Update name on insurance card",
      "Digital ID card not loading in app",
      "Request verification letter for employer",
    ],
    transcripts: [
      "I lost my insurance card and have a doctor appointment tomorrow. Can you email me a temporary card?",
      "I got married and need to update my name on my insurance card. What documents do you need?",
      "The mobile app won't load my digital ID card. I need it to show at the pharmacy.",
    ],
  },
  {
    category: "Plan Information",
    titles: [
      "Clarify deductible and out-of-pocket max",
      "What is covered under preventive care?",
      "Question about copay amounts",
      "Annual enrollment options comparison",
      "Add spouse to existing plan",
    ],
    transcripts: [
      "Can you explain the difference between my deductible and out-of-pocket maximum? I'm confused about what I need to pay.",
      "I want to schedule a physical exam. Is that considered preventive care and fully covered?",
      "I'm considering adding my spouse to my plan. How much would that increase my premium?",
    ],
  },
  {
    category: "Authorization & Referrals",
    titles: [
      "Prior authorization for MRI scan",
      "Referral to specialist not received",
      "Check status of surgery authorization",
      "How long for authorization approval?",
      "Appeal denied prior authorization",
    ],
    transcripts: [
      "My doctor ordered an MRI for my back pain but says it needs prior authorization. How do I get that approved?",
      "I was supposed to get a referral faxed to the specialist but they say they never received it. Can you resend?",
      "I need hip replacement surgery and it's been 10 days since the authorization was submitted. What's the status?",
    ],
  },
  {
    category: "Account Management",
    titles: [
      "Cannot log into member portal",
      "Reset password for online account",
      "Update contact information",
      "Change mailing address",
      "Set up direct deposit for reimbursements",
    ],
    transcripts: [
      "I've been trying to log into the member portal but it says my password is incorrect. I reset it twice and it still doesn't work.",
      "I moved to a new address last month. How do I update that so I receive my mail at the right place?",
      "I'd like to set up direct deposit instead of waiting for reimbursement checks. Is that possible?",
    ],
  },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDate(daysAgo: number): string {
  const now = new Date();
  const randomDaysAgo = Math.random() * daysAgo;
  const date = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generateSentimentScore(): number {
  // Bias toward positive sentiment with some variation
  const random = Math.random();
  if (random < 0.5) return Math.random() * 0.6 + 0.4; // 40% positive (0.4 to 1.0)
  if (random < 0.8) return Math.random() * 0.4 - 0.2; // 30% neutral (-0.2 to 0.2)
  return Math.random() * -0.6 - 0.4; // 30% negative (-0.4 to -1.0)
}

export function generateMockUnitedHealthcareCalls(count: number): MockCall[] {
  const calls: MockCall[] = [];

  for (let i = 0; i < count; i++) {
    const template = getRandomElement(issueTemplates);
    const title = getRandomElement(template.titles);
    const transcript = getRandomElement(template.transcripts);
    
    // Determine status with realistic distribution
    const statusRandom = Math.random();
    let status: "open" | "in-progress" | "resolved";
    if (statusRandom < 0.7) status = "resolved"; // 70% resolved
    else if (statusRandom < 0.9) status = "in-progress"; // 20% in-progress
    else status = "open"; // 10% open

    // Duration: 2-45 minutes (120-2700 seconds)
    const duration = getRandomInt(120, 2700);
    
    const sentimentScore = generateSentimentScore();

    calls.push({
      companyName: "United Healthcare",
      title,
      status,
      createdAt: generateRandomDate(30), // Last 30 days
      duration,
      transcript,
      sentimentScore,
      category: template.category,
    });
  }

  // Sort by date (newest first)
  calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return calls;
}

// Pre-generate a consistent set for development
export const MOCK_UNITED_HEALTHCARE_CALLS = generateMockUnitedHealthcareCalls(75);


// Mock data generator for United Healthcare company dashboard

export interface MockCall {
  companyName: string;
  title: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  duration?: number; // in seconds
  transcript?: string;
  sentimentScore?: number;
  category?: string;
}

const issueTemplates = [
  {
    category: "Billing & Payments",
    titles: [
      "Question about unexpected charge on bill",
      "Unable to process payment online",
      "Dispute on recent billing statement",
      "Request for payment plan options",
      "Balance showing incorrect amount",
    ],
    transcripts: [
      "I noticed an unexpected charge of $250 on my recent bill. Can you help me understand what this is for? I've been a member for years and never seen this before.",
      "I'm trying to make a payment through the website but keep getting an error message. The payment deadline is tomorrow and I don't want to be late.",
      "My statement shows I owe $500 but I already paid that last month. Can you check my payment history?",
    ],
  },
  {
    category: "Claims Processing",
    titles: [
      "Claim denied for recent doctor visit",
      "Status of submitted claim #UH-2024-5678",
      "How to appeal denied coverage decision",
      "Missing reimbursement for out-of-network provider",
      "Explanation of EOB for hospital stay",
    ],
    transcripts: [
      "I received a denial for my claim from my doctor visit last month. The reason says 'not medically necessary' but my doctor recommended the test. How can I appeal this?",
      "I submitted a claim three weeks ago and still haven't heard anything. Can you check the status? The claim number is UH-2024-5678.",
      "I paid out of pocket for an out-of-network specialist visit and submitted the claim for reimbursement. When should I expect the check?",
    ],
  },
  {
    category: "Prescription & Pharmacy",
    titles: [
      "Prescription not covered under current plan",
      "Unable to refill medication at pharmacy",
      "Mail order pharmacy delivery delay",
      "Question about generic vs brand name coverage",
      "Medication prior authorization status",
    ],
    transcripts: [
      "My pharmacy told me my blood pressure medication isn't covered anymore. I've been taking this for 5 years. What changed?",
      "I'm trying to get a refill but the pharmacy says it needs prior authorization. How long does that take? I'm almost out of pills.",
      "I ordered my medications through mail order two weeks ago and they still haven't arrived. I need them this week.",
    ],
  },
  {
    category: "Provider Network",
    titles: [
      "Check if doctor is in-network",
      "Need referral to specialist",
      "Primary care physician no longer accepting insurance",
      "Find dermatologist near zip code 10001",
      "Verify coverage for out-of-network emergency",
    ],
    transcripts: [
      "I need to see an orthopedic specialist for my knee. Can you help me find one in my network near Boston?",
      "My current PCP sent me a letter saying they're leaving the network next month. Can you help me find a new doctor?",
      "I had an emergency room visit while traveling. The hospital was out-of-network. Will this be covered?",
    ],
  },
  {
    category: "ID Cards & Documents",
    titles: [
      "Request replacement member ID card",
      "Need temporary insurance proof for appointment",
      "Update name on insurance card",
      "Digital ID card not loading in app",
      "Request verification letter for employer",
    ],
    transcripts: [
      "I lost my insurance card and have a doctor appointment tomorrow. Can you email me a temporary card?",
      "I got married and need to update my name on my insurance card. What documents do you need?",
      "The mobile app won't load my digital ID card. I need it to show at the pharmacy.",
    ],
  },
  {
    category: "Plan Information",
    titles: [
      "Clarify deductible and out-of-pocket max",
      "What is covered under preventive care?",
      "Question about copay amounts",
      "Annual enrollment options comparison",
      "Add spouse to existing plan",
    ],
    transcripts: [
      "Can you explain the difference between my deductible and out-of-pocket maximum? I'm confused about what I need to pay.",
      "I want to schedule a physical exam. Is that considered preventive care and fully covered?",
      "I'm considering adding my spouse to my plan. How much would that increase my premium?",
    ],
  },
  {
    category: "Authorization & Referrals",
    titles: [
      "Prior authorization for MRI scan",
      "Referral to specialist not received",
      "Check status of surgery authorization",
      "How long for authorization approval?",
      "Appeal denied prior authorization",
    ],
    transcripts: [
      "My doctor ordered an MRI for my back pain but says it needs prior authorization. How do I get that approved?",
      "I was supposed to get a referral faxed to the specialist but they say they never received it. Can you resend?",
      "I need hip replacement surgery and it's been 10 days since the authorization was submitted. What's the status?",
    ],
  },
  {
    category: "Account Management",
    titles: [
      "Cannot log into member portal",
      "Reset password for online account",
      "Update contact information",
      "Change mailing address",
      "Set up direct deposit for reimbursements",
    ],
    transcripts: [
      "I've been trying to log into the member portal but it says my password is incorrect. I reset it twice and it still doesn't work.",
      "I moved to a new address last month. How do I update that so I receive my mail at the right place?",
      "I'd like to set up direct deposit instead of waiting for reimbursement checks. Is that possible?",
    ],
  },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDate(daysAgo: number): string {
  const now = new Date();
  const randomDaysAgo = Math.random() * daysAgo;
  const date = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generateSentimentScore(): number {
  // Bias toward positive sentiment with some variation
  const random = Math.random();
  if (random < 0.5) return Math.random() * 0.6 + 0.4; // 40% positive (0.4 to 1.0)
  if (random < 0.8) return Math.random() * 0.4 - 0.2; // 30% neutral (-0.2 to 0.2)
  return Math.random() * -0.6 - 0.4; // 30% negative (-0.4 to -1.0)
}

export function generateMockUnitedHealthcareCalls(count: number): MockCall[] {
  const calls: MockCall[] = [];

  for (let i = 0; i < count; i++) {
    const template = getRandomElement(issueTemplates);
    const title = getRandomElement(template.titles);
    const transcript = getRandomElement(template.transcripts);
    
    // Determine status with realistic distribution
    const statusRandom = Math.random();
    let status: "open" | "in-progress" | "resolved";
    if (statusRandom < 0.7) status = "resolved"; // 70% resolved
    else if (statusRandom < 0.9) status = "in-progress"; // 20% in-progress
    else status = "open"; // 10% open

    // Duration: 2-45 minutes (120-2700 seconds)
    const duration = getRandomInt(120, 2700);
    
    const sentimentScore = generateSentimentScore();

    calls.push({
      companyName: "United Healthcare",
      title,
      status,
      createdAt: generateRandomDate(30), // Last 30 days
      duration,
      transcript,
      sentimentScore,
      category: template.category,
    });
  }

  // Sort by date (newest first)
  calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return calls;
}

// Pre-generate a consistent set for development
export const MOCK_UNITED_HEALTHCARE_CALLS = generateMockUnitedHealthcareCalls(75);


