export type Screen = 'landing' | 'quiz' | 'result' | 'passport';

export interface Option {
  id: string;
  label: string;
  // Scores for the 4 quadrants: [Classic, Deep, Bright, Fruity]
  scores: {
    classic: number;
    deep: number;
    bright: number;
    fruity: number;
  };
}

export interface Question {
  id: number;
  question: string;
  subtitle?: string;
  options: Option[];
}

export interface StickerReward {
  id: string;
  style: '經典' | '深色' | '亮色' | '果香';
  name: string; // Character Name
  description: string; // Character Description
  imageUrl: string; // Character Image
}

export interface DessertRecommendation {
  id: string; // mbti code
  mbti: string;
  name: string; // Dessert Name
  series: string;
  style: '經典' | '深色' | '亮色' | '果香';
  hook: string; // The poetic copy
  drink_stable: string; // Type A drink
  drink_sensitive: string; // Type T drink
  replacement: string;
  imageUrl: string;
}

export interface UserAnswers {
  [key: number]: string; // questionId: optionId
}

// Passport System Types
export type StampUnlockMethod = 'qr' | 'gps' | 'external';

export interface Stamp {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  emoji: string; // visual emoji for guided journey
  unlockMethod: StampUnlockMethod;
  requiredParam?: string; // for QR codes
  isSecret?: boolean; // Hidden until unlocked
  externalLink?: string; // URL for external stamps
  location?: {
    lat: number;
    lng: number;
    radius: number; // meters
  };
  guideCta: string; // action text for the journey guide (e.g. "定位簽到")
  guideHint: string; // short hint for what to do (e.g. "按一下就完成！")
}

export interface PassportState {
  unlockedStamps: string[]; // array of stamp IDs
  unlockedAchievements: string[]; // array of achievement IDs
  redeemedRewards: string[]; // array of reward tier IDs
  visitedSites: string[]; // array of moon site IDs
  createdAt: number;
  lastUpdatedAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  condition: {
    type: 'stamp_count';
    target: number;
  };
}

export interface RewardTier {
  id: string;
  requiredStamps: number;
  title: string;
  description: string;
  imageUrl?: string; // Optional product image
  canRepeat: boolean;
  redemptionMethod: 'show-screen' | 'line-redirect';
}

// Moon Ecosystem Site Tracking
export interface MoonSite {
  id: string;
  name: string;
  emoji: string;
  url: string;
  description: string;
}