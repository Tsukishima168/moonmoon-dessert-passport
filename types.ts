export type Screen = 'landing' | 'passport';

export interface Option {
  id: string;
  label: string;
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
  name: string;
  description: string;
  imageUrl: string;
}

export interface DessertRecommendation {
  id: string;
  mbti: string;
  name: string;
  series: string;
  style: '經典' | '深色' | '亮色' | '果香';
  hook: string;
  drink_stable: string;
  drink_sensitive: string;
  replacement: string;
  imageUrl: string;
}

export interface UserAnswers {
  [questionId: number]: string; // optionId
}

// Passport System Types
export type StampUnlockMethod = 'qr' | 'gps' | 'external';

export interface Stamp {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  animationType?: 'pulse' | 'bounce' | 'spin' | 'float'; // visual dynamism
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
  lastCheckinAt?: number; // timestamp of last daily check-in
  points: number; // total points balance
  pointsHistory: PointTransaction[]; // points transaction history
  createdAt: number;
  lastUpdatedAt: number;
}

export interface PointTransaction {
  id: string;
  type: 'gacha_earn' | 'checkin_earn' | 'daily_checkin' | 'redeem_spend' | 'bonus' | 'share_earn' | 'mbti_earn' | 'offline_earn';
  amount: number; // positive = earn, negative = spend
  description: string;
  timestamp: number;
}

export interface RedeemableItem {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'dessert' | 'drink' | 'merch';
  imageUrl?: string;
  available: boolean;
  redemptionMethod: 'show-screen';
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
  url: string;
  description: string;
  iconType: string; // Dynamic icon reference
}