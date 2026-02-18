export type Screen = 'landing' | 'quiz' | 'result' | 'passport' | 'ar';

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
export type StampUnlockMethod = 'qr' | 'password' | 'checkbox' | 'gps' | 'ar';

export interface Stamp {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  unlockMethod: StampUnlockMethod;
  requiredParam?: string; // for QR codes
  isSecret?: boolean; // Hidden until unlocked
  arTargetIndex?: number; // MindAR target index for AR stamps
  location?: {
    lat: number;
    lng: number;
    radius: number; // meters
  };
}

export interface PassportState {
  unlockedStamps: string[]; // array of stamp IDs
  unlockedAchievements: string[]; // array of achievement IDs
  redeemedRewards: string[]; // array of reward tier IDs
  createdAt: number;
  lastUpdatedAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  condition: {
    type: 'stamp_count' | 'specific_stamp' | 'secret_count';
    target: number | string; // count or stampId
  };
  isHidden?: boolean; // If true, shows as "???" until unlocked
}

export interface RewardTier {
  id: string;
  requiredStamps: number;
  title: string;
  description: string;
  imageUrl?: string; // Optional product image
  canRepeat: boolean;
  isLocked?: boolean; // If true, reward is visible but not yet available
  redemptionMethod: 'show-screen' | 'line-redirect';
}