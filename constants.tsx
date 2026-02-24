import { Question, DessertRecommendation, StickerReward, Stamp, RewardTier, Achievement, MoonSite } from './types';

// Configuration URLs
export const LINKS = {
  MBTI_TEST: "https://kiwimu-mbti.vercel.app",
  LINE_OA: "https://lin.ee/vpkYztb",
  INSTAGRAM: "https://www.instagram.com/moon_moon_dessert/",
  GOOGLE_MAPS: "https://g.page/r/CdR9ng9TTJF3EBM/review",
  NAVIGATION: "https://moon-map-original.vercel.app",
};

// ─── Simplified Passport Stamp System (8 stamps) ───
// Ordered as the recommended journey sequence
export const STAMPS: Stamp[] = [
  {
    id: 'shop_checkin',
    name: '月島登陸',
    description: '抵達月島甜點店',
    emoji: '📍',
    icon: 'MapPin',
    unlockMethod: 'gps',
    guideCta: '📍 定位簽到',
    guideHint: '到店後按一下，GPS 自動偵測！',
    location: {
      lat: 23.0463,
      lng: 120.2113,
      radius: 300
    }
  },
  {
    id: 'quiz_completed',
    name: '靈魂甜點',
    description: '完成甜點測驗',
    emoji: '🎯',
    icon: 'CheckCircle',
    unlockMethod: 'qr',
    guideCta: '🎯 做測驗',
    guideHint: '回答 3 題，找到你的命定甜點！'
  },
  {
    id: 'ig_followed',
    name: 'IG 追蹤',
    description: '追蹤 @moon_moon_dessert',
    emoji: '📸',
    icon: 'Instagram',
    unlockMethod: 'external',
    externalLink: LINKS.INSTAGRAM,
    guideCta: '📸 追蹤 IG',
    guideHint: '按下前往，追蹤後回來點完成！'
  },
  {
    id: 'line_joined',
    name: 'LINE 好友',
    description: '加入月島官方帳號',
    emoji: '💬',
    icon: 'MessageCircle',
    unlockMethod: 'external',
    externalLink: LINKS.LINE_OA,
    guideCta: '💬 加 LINE',
    guideHint: '加好友就能收到新品通知！'
  },
  {
    id: 'order_with_staff',
    name: '點餐成功',
    description: '向店員點餐並掃 QR',
    emoji: '🛍️',
    icon: 'ShoppingBag',
    unlockMethod: 'qr',
    requiredParam: 'order',
    guideCta: '🛍️ 掃描點餐 QR',
    guideHint: '點餐後請店員出示 QR Code！'
  },
  {
    id: 'secret_qr_1',
    name: '秘密角落 #1',
    description: '找到店內隱藏 QR Code',
    emoji: '🔍',
    icon: 'MapPin',
    unlockMethod: 'qr',
    requiredParam: 'secret1',
    guideCta: '🔍 找 QR Code',
    guideHint: '店內藏有隱藏 QR Code，找找看！'
  },
  {
    id: 'secret_qr_2',
    name: '秘密角落 #2',
    description: '找到另一個隱藏 QR Code',
    emoji: '🔎',
    icon: 'MapPin',
    unlockMethod: 'qr',
    requiredParam: 'secret2',
    guideCta: '🔎 繼續找',
    guideHint: '還有一個哦，仔細看看四周！'
  },
  {
    id: 'google_review',
    name: 'Google 評論',
    description: '留下你的真心評價',
    emoji: '⭐',
    icon: 'Star',
    unlockMethod: 'external',
    externalLink: LINKS.GOOGLE_MAPS,
    guideCta: '⭐ 寫評論',
    guideHint: '幫月島留下評論，讓更多人認識我們！'
  },
];

// ─── Reward Tiers (4 tiers, no locked) ───
export const REWARD_TIERS: RewardTier[] = [
  {
    id: 'tier_3',
    requiredStamps: 3,
    title: '限定角色貼紙',
    description: 'Kiwimu 角色貼紙乙張，專屬收藏',
    canRepeat: true,
    redemptionMethod: 'show-screen'
  },
  {
    id: 'tier_5',
    requiredStamps: 5,
    title: '飲品升級服務',
    description: '免費升級至 +20 元飲品',
    canRepeat: true,
    redemptionMethod: 'show-screen'
  },
  {
    id: 'tier_7',
    requiredStamps: 7,
    title: '品牌保冷提袋',
    description: '月島專屬環保提袋乙個',
    canRepeat: true,
    redemptionMethod: 'show-screen'
  },
  {
    id: 'tier_8',
    requiredStamps: 8,
    title: '經典烤布丁',
    description: '招牌經典烤布丁乙個 🎉 全收集獎勵！',
    imageUrl: 'https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/menu-images/classic_pudding.webp',
    canRepeat: false,
    redemptionMethod: 'show-screen'
  },
];

// ─── Achievements (3 milestones) ───
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'novice_explorer',
    name: '月島見習生',
    description: '獲得第 1 個印章',
    icon: 'Footprints',
    condition: { type: 'stamp_count', target: 1 }
  },
  {
    id: 'seasoned_traveler',
    name: '熟練旅人',
    description: '獲得 5 個印章',
    icon: 'Compass',
    condition: { type: 'stamp_count', target: 5 }
  },
  {
    id: 'island_guardian',
    name: '月島守護者',
    description: '全 8 章收集完成',
    icon: 'Crown',
    condition: { type: 'stamp_count', target: 8 }
  },
];

// ─── Moon Ecosystem Sites ───
export const MOONMOON_SITES: MoonSite[] = [
  {
    id: 'kiwimu_mbti',
    name: 'Kiwimu 心理測驗',
    emoji: '🧠',
    url: 'https://kiwimu-mbti.vercel.app',
    description: '找到你的靈魂甜點'
  },
  {
    id: 'moon_map',
    name: '月島地圖',
    emoji: '🗺️',
    url: 'https://moon-map-original.vercel.app',
    description: '品牌導覽與簽到'
  },
  {
    id: 'dessert_booking',
    name: '甜點預訂',
    emoji: '🍰',
    url: 'https://dessert-booking.vercel.app',
    description: '線上預訂甜點'
  },
  {
    id: 'gacha',
    name: '月島扭蛋',
    emoji: '🎰',
    url: 'https://moonmoon-gacha.vercel.app',
    description: '抽運籤拿獎勵'
  },
];


// Landing Page Illustration - Fixed single image for faster loading
export const LANDING_ILLUSTRATION = "https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_640/v1768744158/Enter-05_nrt403.webp";


// --- STICKER REWARDS (Characters) ---
// These correspond to the winning "Style"
export const STICKERS: StickerReward[] = [
  {
    id: 'traveler',
    style: '經典',
    name: '月島旅人',
    description: '沈穩可靠，像是月光一樣溫柔地陪伴每個人的旅程。',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_360/v1769227678/yellow-kiwimu_cw31vk.png',
  },
  {
    id: 'poet',
    style: '深色',
    name: '深夜詩人',
    description: '喜歡獨處思考，擁有看透本質的深邃靈魂。',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_360/v1769227679/blue-kiwimu_uey4fq.png',
  },
  {
    id: 'explorer',
    style: '亮色',
    name: '閃光探險家',
    description: '充滿好奇心，總是能在平凡中發現閃亮亮的新奇事物。',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_360/v1769227677/green-kiwiwmu_xsuu4k.png',
  },
  {
    id: 'healer',
    style: '果香',
    name: '甜美治癒師',
    description: '自帶療癒氣場，所到之處都會開出快樂的小花。',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_360/v1769227677/pink-kiwimu_rhluj0.png',
  },
];

// --- DESSERT DATABASE (From CSV) ---
export const DESSERTS: DessertRecommendation[] = [
  {
    id: 'INTJ', mbti: 'INTJ', name: '北海道經典巴斯克', series: '巴斯克', style: '經典',
    hook: '極致的濃度直達靈魂核心，是理智與感官的完美角力。',
    drink_stable: '美式咖啡', drink_sensitive: '經典拿鐵', replacement: '檸檬巴斯克;茶香巴斯克',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866456/BASQUE_CLASSIC_c6fb92.webp'
  },
  {
    id: 'INTP', mbti: 'INTP', name: '檸檬柚子千層蛋糕', series: '千層', style: '亮色',
    hook: '結構細膩且層次分明，適合在深度思考中尋求一絲清亮。',
    drink_stable: '日本柚子美式', drink_sensitive: '薄荷茶', replacement: '蜜香紅茶千層;草莓莓果千層',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866456/MILLE_CREPE_LEMON_dcxrgr.webp'
  },
  {
    id: 'ENTJ', mbti: 'ENTJ', name: '奶酒提拉米蘇', series: '提拉米蘇', style: '深色',
    hook: '微醺的權力展演，苦甜之間盡是掌控局勢的餘韻。',
    drink_stable: '美式咖啡', drink_sensitive: '焙茶拿鐵', replacement: '經典提拉米蘇;抹茶提拉米蘇',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866456/TIRAMISU_BAILEYS_vkzkxr.webp'
  },
  {
    id: 'ENTP', mbti: 'ENTP', name: '柚子蘋果提拉米蘇', series: '提拉米蘇', style: '亮色',
    hook: '打破常規的驚喜風味，在每一次味覺挑戰中看見邊界。',
    drink_stable: '日本柚子美式', drink_sensitive: '烤布丁拿鐵', replacement: '奶酒提拉米蘇;抹茶提拉米蘇',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866456/TIRAMISU_YUZU_pu1r82.webp'
  },
  {
    id: 'INFJ', mbti: 'INFJ', name: '茶香巴斯克', series: '巴斯克', style: '深色',
    hook: '沈穩的茶韻撫平外界的嘈雜，帶你潛入最深的內在宇宙。',
    drink_stable: '博士茶', drink_sensitive: '抹茶拿鐵', replacement: '北海道經典巴斯克;檸檬巴斯克',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866455/BASQUE_TEA_izkwws.webp'
  },
  {
    id: 'INFP', mbti: 'INFP', name: '北海道十勝戚風蛋糕', series: '戚風', style: '經典',
    hook: '輕盈柔軟的著陸點，在銳利的世界裡提供一場溫柔的安放。',
    drink_stable: '博士茶', drink_sensitive: '花草茶', replacement: '檸檬蘋果戚風;莓果戚風',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866455/CHIFFON_LEMON_ppn6t3.webp'
  },
  {
    id: 'ENFJ', mbti: 'ENFJ', name: '檸檬蘋果戚風蛋糕', series: '戚風', style: '亮色',
    hook: '明亮如陽光的清新力量，溫暖並照亮每一個被遺忘的角落。',
    drink_stable: '西西里美式', drink_sensitive: '抹茶拿鐵', replacement: '北海道十勝戚風;莓果戚風',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866455/CHIFFON_LEMON_ppn6t3.webp'
  },
  {
    id: 'ENFP', mbti: 'ENFP', name: '草莓莓果千層蛋糕', series: '千層', style: '果香',
    hook: '層次繽紛且富有生命力，裝滿奇奇怪怪且閃亮的靈感碎片。',
    drink_stable: '日本柚子美式', drink_sensitive: '花草茶', replacement: '檸檬柚子千層;蜜香紅茶千層',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866455/MILLE_CREPE_STRAWBERRY_s6bf22.webp'
  },
  {
    id: 'ISTJ', mbti: 'ISTJ', name: '經典十勝原味千層', series: '千層', style: '經典',
    hook: '結構的絕對精準與對承諾的執著，最值得信賴的味覺基石。',
    drink_stable: '美式咖啡', drink_sensitive: '經典拿鐵', replacement: '巧克力布朗尼千層;蜜香紅茶千層',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp'
  },
  {
    id: 'ISFJ', mbti: 'ISFJ', name: '經典烤布丁', series: '單品', style: '經典',
    hook: '安全感的終極錨點，最純粹、最直接的溫柔安撫與回歸。',
    drink_stable: '蕎麥茶', drink_sensitive: '烤布丁拿鐵', replacement: '本口味目前為最佳配對',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866453/PUDDING_CLASSIC_fm8hng.webp'
  },
  {
    id: 'ESTJ', mbti: 'ESTJ', name: '鹹蛋黃巴斯克', series: '巴斯克', style: '深色',
    hook: '鋼鐵意志與濃郁核心的結合，穩健中帶有不容忽視的力量。',
    drink_stable: '美式咖啡', drink_sensitive: '焙茶拿鐵', replacement: '北海道經典巴斯克;茶香巴斯克',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866453/BASQUE_SALTED_EGG_cwc3ah.webp'
  },
  {
    id: 'ESFJ', mbti: 'ESFJ', name: '莓果戚風蛋糕', series: '戚風', style: '果香',
    hook: '溫和友善的包覆感，與摯愛分享這份純粹快樂的本質。',
    drink_stable: '日本柚子美式', drink_sensitive: '經典拿鐵', replacement: '綜合水果戚風;檸檬蘋果戚風',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866454/CHIFFON_BERRY_wlmqgd.webp'
  },
  {
    id: 'ISTP', mbti: 'ISTP', name: '經典提拉米蘇', series: '提拉米蘇', style: '經典',
    hook: '冷靜大膽的口感平衡，無需多言的硬派實力展現。',
    drink_stable: '美式咖啡', drink_sensitive: '焙茶拿鐵', replacement: '抹茶提拉米蘇;柚子蘋果提拉米蘇',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp'
  },
  {
    id: 'ISFP', mbti: 'ISFP', name: '抹茶提拉米蘇', series: '提拉米蘇', style: '深色',
    hook: '細膩美感的微苦回甘，用最溫柔的方式對抗世界的喧囂。',
    drink_stable: '日本柚子美式', drink_sensitive: '花草茶', replacement: '經典提拉米蘇;奶酒提拉米蘇',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp'
  },
  {
    id: 'ESTP', mbti: 'ESTP', name: '巧克力布朗尼千層', series: '千層', style: '深色',
    hook: '極致感官的爆發體驗，追求速度與最直白的生命熱情。',
    drink_stable: '西西里美式', drink_sensitive: '焙茶拿鐵', replacement: '經典十勝原味千層;蜜香紅茶千層',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp'
  },
  {
    id: 'ESFP', mbti: 'ESFP', name: '綜合水果戚風蛋糕', series: '戚風', style: '果香',
    hook: '點亮全場的色彩盛宴，將每一刻都轉化為永恆的快樂慶典。',
    drink_stable: '日本柚子美式', drink_sensitive: '烤布丁拿鐵', replacement: '莓果戚風;檸檬蘋果戚風',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866453/CHIFFON_FRUIT_fswhqh.webp'
  },
];


// --- QUESTION POOLS (Randomized) ---
export const QUESTION_SETS: Question[][] = [
  // SET 1: 放鬆與充電 (Relaxation)
  [
    {
      id: 1,
      question: "嗨，這週過得還好嗎？",
      subtitle: "現在最想做什麼來放鬆一下",
      options: [
        { id: 'q1_a', label: '窩在角落發發呆', scores: { classic: 2, deep: 2, bright: 0, fruity: 0 } },
        { id: 'q1_b', label: '找朋友大聊特聊', scores: { classic: 0, deep: 0, bright: 2, fruity: 2 } },
        { id: 'q1_c', label: '去外面吹吹風', scores: { classic: 1, deep: 1, bright: 1, fruity: 0 } },
      ],
    },
    {
      id: 2,
      question: "遇到卡關的時候，你通常會...",
      options: [
        { id: 'q2_a', label: '相信過去的經驗', scores: { classic: 3, deep: 0, bright: 0, fruity: 0 } },
        { id: 'q2_b', label: '試試看全新的方法', scores: { classic: 0, deep: 0, bright: 3, fruity: 0 } },
        { id: 'q2_c', label: '先睡一覺再說', scores: { classic: 0, deep: 2, bright: 0, fruity: 1 } },
      ],
    },
    {
      id: 3,
      question: "現在的味蕾，想要哪種感覺？",
      options: [
        { id: 'q3_a', label: '有點苦的大人味', scores: { classic: 0, deep: 3, bright: 0, fruity: 0 } },
        { id: 'q3_b', label: '單純溫柔的甜', scores: { classic: 3, deep: 0, bright: 0, fruity: 0 } },
        { id: 'q3_c', label: '酸酸甜甜的果香', scores: { classic: 0, deep: 0, bright: 1, fruity: 3 } },
      ],
    },
  ],

  // SET 2: 直覺與氛圍 (Intuition)
  [
    {
      id: 1,
      question: "早安，或是晚安。現在心情如何？",
      subtitle: "誠實地面對自己的狀態",
      options: [
        { id: 'q1_a', label: '很平靜', scores: { classic: 3, deep: 1, bright: 0, fruity: 0 } },
        { id: 'q1_b', label: '有點累', scores: { classic: 1, deep: 2, bright: 0, fruity: 0 } },
        { id: 'q1_c', label: '充滿期待', scores: { classic: 0, deep: 0, bright: 3, fruity: 2 } },
      ],
    },
    {
      id: 2,
      question: "看菜單的時候，你的直覺通常是...",
      options: [
        { id: 'q2_a', label: '點最經典的招牌', scores: { classic: 3, deep: 0, bright: 0, fruity: 0 } },
        { id: 'q2_b', label: '被照片漂亮的吸引', scores: { classic: 0, deep: 0, bright: 2, fruity: 2 } },
        { id: 'q2_c', label: '看當下想吃什麼', scores: { classic: 1, deep: 1, bright: 1, fruity: 1 } },
      ],
    },
    {
      id: 3,
      question: "如果要把心情具象化，現在是...",
      options: [
        { id: 'q3_a', label: '深沈的靛藍色', scores: { classic: 0, deep: 3, bright: 0, fruity: 0 } },
        { id: 'q3_b', label: '溫暖的鵝黃色', scores: { classic: 3, deep: 0, bright: 1, fruity: 1 } },
        { id: 'q3_c', label: '清新的草綠色', scores: { classic: 0, deep: 0, bright: 3, fruity: 1 } },
      ],
    },
  ],

  // SET 3: 陪伴與選擇 (Companionship)
  [
    {
      id: 1,
      question: "如果可以，現在最想去哪裡？",
      subtitle: "閉上眼睛想像一下",
      options: [
        { id: 'q1_a', label: '安靜的深夜書房', scores: { classic: 1, deep: 3, bright: 0, fruity: 0 } },
        { id: 'q1_b', label: '陽光普照的草地', scores: { classic: 0, deep: 0, bright: 3, fruity: 2 } },
        { id: 'q1_c', label: '熟悉的自家臥室', scores: { classic: 3, deep: 1, bright: 0, fruity: 0 } },
      ],
    },
    {
      id: 2,
      question: "對於「驚喜」，你的感覺是？",
      options: [
        { id: 'q2_a', label: '還是不要比較好', scores: { classic: 2, deep: 2, bright: 0, fruity: 0 } },
        { id: 'q2_b', label: '越多越好', scores: { classic: 0, deep: 0, bright: 3, fruity: 2 } },
        { id: 'q2_c', label: '小小的就好', scores: { classic: 2, deep: 0, bright: 1, fruity: 1 } },
      ],
    },
    {
      id: 3,
      question: "選一個陪你度過這段時間的夥伴",
      options: [
        { id: 'q3_a', label: '一杯熱茶', scores: { classic: 2, deep: 1, bright: 0, fruity: 1 } },
        { id: 'q3_b', label: '一杯冰氣泡水', scores: { classic: 0, deep: 0, bright: 3, fruity: 2 } },
        { id: 'q3_c', label: '一杯熱咖啡', scores: { classic: 1, deep: 3, bright: 0, fruity: 0 } },
      ],
    },
  ],

  // SET 4: 溫度與季節 (Temperature & Season)
  [
    {
      id: 1,
      question: "你最喜歡哪種天氣的氛圍？",
      subtitle: "感受一下空氣的溫度",
      options: [
        { id: 'q1_a', label: '清爽明媚的晴天', scores: { classic: 0, deep: 0, bright: 3, fruity: 2 } },
        { id: 'q1_b', label: '微涼的陰雨天', scores: { classic: 0, deep: 3, bright: 0, fruity: 0 } },
        { id: 'q1_c', label: '乾燥溫暖的秋日', scores: { classic: 3, deep: 1, bright: 0, fruity: 0 } },
      ],
    },
    {
      id: 2,
      question: "如果要在月島待一下午，你會...",
      options: [
        { id: 'q2_a', label: '帶一本書靜靜閱讀', scores: { classic: 2, deep: 2, bright: 0, fruity: 0 } },
        { id: 'q2_b', label: '觀察窗外的路人', scores: { classic: 0, deep: 1, bright: 2, fruity: 1 } },
        { id: 'q2_c', label: '瘋狂拍照發限動', scores: { classic: 0, deep: 0, bright: 1, fruity: 3 } },
      ],
    },
    {
      id: 3,
      question: "你喜歡什麼樣的口感？",
      options: [
        { id: 'q3_a', label: '綿密濃郁化不開', scores: { classic: 1, deep: 3, bright: 0, fruity: 0 } },
        { id: 'q3_b', label: '層層堆疊的口感', scores: { classic: 3, deep: 0, bright: 1, fruity: 0 } },
        { id: 'q3_c', label: '輕盈蓬鬆像雲朵', scores: { classic: 0, deep: 0, bright: 2, fruity: 2 } },
      ],
    },
  ],

  // SET 5: 想像與維度 (Imagination & Dimension)
  [
    {
      id: 1,
      question: "如果有任意門，現在想去哪？",
      subtitle: "直覺選擇一個場景",
      options: [
        { id: 'q1_a', label: '京都的老茶屋', scores: { classic: 2, deep: 2, bright: 0, fruity: 0 } },
        { id: 'q1_b', label: '巴黎的河畔', scores: { classic: 1, deep: 1, bright: 2, fruity: 0 } },
        { id: 'q1_c', label: '熱帶的無人島', scores: { classic: 0, deep: 0, bright: 1, fruity: 3 } },
      ],
    },
    {
      id: 2,
      question: "你覺得自己比較像哪種時間？",
      options: [
        { id: 'q2_a', label: '清晨六點的微光', scores: { classic: 1, deep: 0, bright: 3, fruity: 1 } },
        { id: 'q2_b', label: '正午十二點的艷陽', scores: { classic: 0, deep: 0, bright: 2, fruity: 3 } },
        { id: 'q2_c', label: '深夜兩點的寧靜', scores: { classic: 0, deep: 4, bright: 0, fruity: 0 } },
      ],
    },
    {
      id: 3,
      question: "最後，想要一份怎樣的禮物？",
      options: [
        { id: 'q3_a', label: '大家都說讚的經典', scores: { classic: 3, deep: 0, bright: 0, fruity: 0 } },
        { id: 'q3_b', label: '外表看不出來的驚喜', scores: { classic: 0, deep: 2, bright: 1, fruity: 1 } },
        { id: 'q3_c', label: '色彩繽紛看了就開心', scores: { classic: 0, deep: 0, bright: 2, fruity: 2 } },
      ],
    },
  ],
];
