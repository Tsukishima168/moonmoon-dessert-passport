import { Question, DessertRecommendation, StickerReward, Stamp, RewardTier, Achievement, MoonSite, RedeemableItem } from './types';

// Configuration URLs
export const LINKS = {
  MBTI_TEST: "https://kiwimu.com",
  LINE_OA: "https://lin.ee/vpkYztb",
  INSTAGRAM: "https://www.instagram.com/moon_moon_dessert/",
  GOOGLE_MAPS: "https://g.page/r/CdR9ng9TTJF3EBM/review",
  NAVIGATION: "https://map.kiwimu.com",
};

// Branding Assets
export const BRANDING = {
  KIWIMU_LOGO: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Kiwimu-English_syrudw.png",
  STANDARDIZED_CHINESE_LOGO: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744158/Enter-05_nrt403.webp", // Mocking standardized logo for now if actual one not provided, using main illustration as fallback or placeholder
  LANDING_ILLUSTRATION: "https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_640/v1768744158/Enter-05_nrt403.webp",
};

// ─── Simplified Passport Stamp System (8 stamps) ───
// Emojis removed, animations added
export const STAMPS: Stamp[] = [
  {
    id: 'shop_checkin',
    name: '月島登陸',
    description: '抵達月島甜點店',
    icon: 'MapPin',
    animationType: 'pulse',
    unlockMethod: 'gps',
    guideCta: '定位簽到',
    guideHint: '到店後按一下，GPS 自動偵測！',
    location: {
      lat: 23.0473181,
      lng: 120.1987003,
      radius: 100
    }
  },
  {
    id: 'quiz_completed',
    name: '靈魂甜點',
    description: '完成甜點測驗',
    icon: 'CheckCircle',
    animationType: 'bounce',
    unlockMethod: 'qr',
    guideCta: '做測驗',
    guideHint: '回答 3 題，找到你的命定甜點！'
  },
  {
    id: 'ig_followed',
    name: 'IG 追蹤',
    description: '追蹤 @moon_moon_dessert',
    icon: 'Instagram',
    animationType: 'float',
    unlockMethod: 'external',
    externalLink: LINKS.INSTAGRAM,
    guideCta: '追蹤 IG',
    guideHint: '按下前往，追蹤後回來點完成！'
  },
  {
    id: 'line_joined',
    name: 'LINE 好友',
    description: '加入月島官方帳號',
    icon: 'MessageCircle',
    animationType: 'float',
    unlockMethod: 'external',
    externalLink: LINKS.LINE_OA,
    guideCta: '加 LINE',
    guideHint: '加好友就能收到新品通知！'
  },
  {
    id: 'order_with_staff',
    name: '點餐成功',
    description: '向店員點餐並掃 QR',
    icon: 'ShoppingBag',
    animationType: 'bounce',
    unlockMethod: 'qr',
    requiredParam: 'order',
    guideCta: '掃描點餐 QR',
    guideHint: '點餐後請店員出示 QR Code！'
  },
  {
    id: 'secret_qr_1',
    name: '秘密角落 #1',
    description: '找到店內隱藏 QR Code',
    icon: 'MapPin',
    animationType: 'pulse',
    unlockMethod: 'qr',
    requiredParam: 'secret1',
    guideCta: '找 QR Code',
    guideHint: '店內藏有隱藏 QR Code，找找看！'
  },
  {
    id: 'secret_qr_2',
    name: '秘密角落 #2',
    description: '找到另一個隱藏 QR Code',
    icon: 'MapPin',
    animationType: 'pulse',
    unlockMethod: 'qr',
    requiredParam: 'secret2',
    guideCta: '繼續找',
    guideHint: '還有一個哦，仔細看看四周！'
  },
  {
    id: 'google_review',
    name: 'Google 評論',
    description: '留下你的真心評價',
    icon: 'Star',
    animationType: 'spin',
    unlockMethod: 'external',
    externalLink: LINKS.GOOGLE_MAPS,
    guideCta: '寫評論',
    guideHint: '幫月島留下評論，讓更多人認識我們！'
  },
  {
    id: 'egg_master_2026_q1',
    name: '島主限定徽章',
    description: '於月島地圖找齊 8 顆彩蛋後解鎖的限定徽章',
    icon: 'Sparkles',
    animationType: 'float',
    unlockMethod: 'qr',
    isSecret: true,
    guideCta: '領取限定徽章',
    guideHint: '完成月島地圖彩蛋挑戰後，可透過限定連結領取。'
  },
];

// ─── Reward Tiers (4 tiers) ───
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
    description: '招牌經典烤布丁乙個，全收集獎勵。',
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
    url: 'https://kiwimu.com',
    description: '找到你的靈魂甜點',
    iconType: 'BrainCircuit'
  },
  {
    id: 'moon_map',
    name: '月島地圖',
    url: 'https://map.kiwimu.com',
    description: '品牌導覽與簽到',
    iconType: 'Map'
  },
  {
    id: 'dessert_booking',
    name: '甜點預訂',
    url: 'https://shop.kiwimu.com',
    description: '線上預訂甜點',
    iconType: 'CakeSlice'
  },
  {
    id: 'gacha',
    name: '月島扭蛋',
    url: 'https://gacha.kiwimu.com',
    description: '抽運籤拿獎勵',
    iconType: 'Dices'
  },
];

// ─── Points Redemption Store ───
export const REDEEMABLE_ITEMS: RedeemableItem[] = [
  // 飲品 (低門檻)
  {
    id: 'tea_buckwheat', name: '蕎麥茶', description: '清爽回甘的日式蕎麥茶',
    pointsCost: 50, category: 'drink', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'coffee_iced', name: '冰美式咖啡', description: '經典冰美式，黑咖啡的純粹力量',
    pointsCost: 80, category: 'drink', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'coffee_sicily', name: '西西里咖啡', description: '檸檬與咖啡的完美碰撞',
    pointsCost: 100, category: 'drink', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'latte_matcha', name: '抹茶拿鐵', description: '小山園抹茶 × 北海道鮮奶',
    pointsCost: 120, category: 'drink', available: true, redemptionMethod: 'show-screen',
  },
  // 甜點 (中門檻)
  {
    id: 'second_half', name: '第二杯半價券', description: '任一飲品第二杯享半價',
    pointsCost: 150, category: 'dessert', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'pudding_classic', name: '經典烤布丁', description: '招牌十勝鮮奶烤布丁',
    pointsCost: 200, category: 'dessert', available: true, redemptionMethod: 'show-screen',
    imageUrl: 'https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/menu-images/classic_pudding.webp',
  },
  {
    id: 'chiffon_slice', name: '戚風蛋糕切片', description: '當日限定口味戚風蛋糕一片',
    pointsCost: 300, category: 'dessert', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'seasonal_fruit', name: '季節鮮果甜點', description: '季節限定鮮果甜點一份',
    pointsCost: 350, category: 'dessert', available: true, redemptionMethod: 'show-screen',
  },
  // 周邊 (高門檻)
  {
    id: 'sticker_set', name: 'Kiwimu 限量貼紙組', description: '四款 Kiwimu 角色貼紙',
    pointsCost: 100, category: 'merch', available: true, redemptionMethod: 'show-screen',
  },
  {
    id: 'cooler_bag', name: '品牌保冷提袋', description: '月島專屬環保保冷提袋',
    pointsCost: 500, category: 'merch', available: true, redemptionMethod: 'show-screen',
  },
];


// --- STICKER REWARDS ---
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

// --- DESSERT DATABASE ---
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
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1771923719/dessert/menu_item_8e59b833-853a-4164-b747-6382c4bd7658.webp'
  },
  {
    id: 'ENFJ', mbti: 'ENFJ', name: '檸檬蘋果戚風蛋糕', series: '戚風', style: '亮色',
    hook: '明亮如陽光的清新力量，溫緩並照亮每一個被遺忘的角落。',
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
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1771923727/dessert/menu_item_212f556e-502a-4e5a-90bb-e77e7b92f7ba.webp'
  },
  {
    id: 'ESTP', mbti: 'ESTP', name: '巧克力布朗尼千層', series: '千層', style: '深色',
    hook: '極致感官的爆發體驗，追求速度與最直白的生命熱情。',
    drink_stable: '西西里美式', drink_sensitive: '焙茶拿鐵', replacement: '經典十勝原味千層;蜜香紅茶千層',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1771923691/dessert/menu_item_d323bd72-12ff-4bbb-9533-16fac4d08bba.webp'
  },
  {
    id: 'ESFP', mbti: 'ESFP', name: '綜合水果戚風蛋糕', series: '戚風', style: '果香',
    hook: '點亮全場的色彩盛宴，將每一刻都轉化為永恆的快樂慶典。',
    drink_stable: '日本柚子美式', drink_sensitive: '烤布丁拿鐵', replacement: '莓果戚風;檸檬蘋果戚風',
    imageUrl: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_320/v1767866453/CHIFFON_FRUIT_fswhqh.webp'
  },
];


// --- QUESTION POOLS ---
export const QUESTION_SETS: Question[][] = [
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
  // ... (Question sets remain unchanged, emojis were already minimal or absent here)
];
