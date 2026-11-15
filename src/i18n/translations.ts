import type { SupportedLanguage } from '../types';

export const LANGUAGE_OPTIONS: Array<{ code: SupportedLanguage; label: string; nativeLabel: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
];

export const UI_COPY: Record<
  SupportedLanguage,
  {
    appTagline: string;
    leaderNav: {
      dashboard: string;
      orders: string;
      newOrder: string;
      pricing: string;
      allocation: string;
      progress: string;
      quality: string;
      consolidation: string;
      payouts: string;
      members: string;
      settings: string;
    };
    memberNav: {
      dashboard: string;
      work: string;
      progress: string;
      earnings: string;
      audioSummary: string;
      settings: string;
    };
    common: {
      signOut: string;
      online: string;
      offline: string;
      syncNow: string;
      pendingSync: string;
      synced: string;
      savedLocally: string;
      listenAudio: string;
      replay: string;
    };
  }
> = {
  en: {
    appTagline: 'Voice-First AI Assistant for Self-Help Groups',
    leaderNav: {
      dashboard: 'Dashboard',
      orders: 'Orders',
      newOrder: 'Voice Intake',
      pricing: 'Pricing',
      allocation: 'Allocation',
      progress: 'Production',
      quality: 'Quality',
      consolidation: 'Consolidation',
      payouts: 'Payouts',
      members: 'Members',
      settings: 'Settings',
    },
    memberNav: {
      dashboard: 'My Home',
      work: 'My Work',
      progress: 'Report Work',
      earnings: 'My Earnings',
      audioSummary: 'Audio Summary',
      settings: 'Settings',
    },
    common: {
      signOut: 'Sign Out',
      online: 'Online',
      offline: 'Offline Mode',
      syncNow: 'Sync Now',
      pendingSync: 'Pending Sync',
      synced: 'Synchronized',
      savedLocally: 'Saved Locally',
      listenAudio: 'Play Audio',
      replay: 'Replay',
    },
  },
  te: {
    appTagline: 'స్వయం సహాయక సంఘాల కోసం వాయిస్-ఫస్ట్ AI సహాయకుడు',
    leaderNav: {
      dashboard: 'డాష్‌బోర్డ్',
      orders: 'ఆర్డర్లు',
      newOrder: 'వాయిస్ ఆర్డర్',
      pricing: 'ధర నిర్ణయం',
      allocation: 'పని పంపిణీ',
      progress: 'ఉత్పత్తి స్థితి',
      quality: 'నాణ్యత తనిఖీ',
      consolidation: 'ఆర్డర్ ఏకీకరణ',
      payouts: 'చెల్లింపులు',
      members: 'సభ్యులు',
      settings: 'సెట్టింగ్‌లు',
    },
    memberNav: {
      dashboard: 'నా హోమ్',
      work: 'నా పని',
      progress: 'పని నివేదిక',
      earnings: 'నా సంపాదన',
      audioSummary: 'ఆడియో సారాంశం',
      settings: 'సెట్టింగ్‌లు',
    },
    common: {
      signOut: 'లాగ్ అవుట్',
      online: 'ఆన్‌లైన్',
      offline: 'ఆఫ్‌లైన్ మోడ్',
      syncNow: 'ఇప్పుడే సింక్ చేయండి',
      pendingSync: 'సింక్ పెండింగ్',
      synced: 'సింక్ అయింది',
      savedLocally: 'లోకల్‌గా సేవ్ అయింది',
      listenAudio: 'ఆడియో వినండి',
      replay: 'మళ్లీ వినండి',
    },
  },
  hi: {
    appTagline: 'स्वयं सहायता समूहों के लिए वॉइस-फर्स्ट एआई सहायक',
    leaderNav: {
      dashboard: 'डैशबोर्ड',
      orders: 'ऑर्डर',
      newOrder: 'वॉइस ऑर्डर',
      pricing: 'मूल्य निर्धारण',
      allocation: 'कार्य वितरण',
      progress: 'उत्पादन',
      quality: 'गुणवत्ता जांच',
      consolidation: 'समेकन',
      payouts: 'भुगतान',
      members: 'सदस्य',
      settings: 'सेटिंग्स',
    },
    memberNav: {
      dashboard: 'मेरा होम',
      work: 'मेरा काम',
      progress: 'काम दर्ज करें',
      earnings: 'मेरी कमाई',
      audioSummary: 'ऑडियो सारांश',
      settings: 'सेटिंग्स',
    },
    common: {
      signOut: 'लॉग आउट',
      online: 'ऑनलाइन',
      offline: 'ऑफ़लाइन मोड',
      syncNow: 'सिंक करें',
      pendingSync: 'सिंक बाकी',
      synced: 'सिंक हो गया',
      savedLocally: 'लोकल सेव्ड',
      listenAudio: 'ऑडियो सुनें',
      replay: 'फिर सुनें',
    },
  },
  kn: {
    appTagline: 'ಸ್ವಸಹಾಯ ಗುಂಪುಗಳಿಗಾಗಿ ಧ್ವನಿ-ಮೊದಲ AI ಸಹಾಯಕ',
    leaderNav: {
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      orders: 'ಆರ್ಡರ್‌ಗಳು',
      newOrder: 'ಧ್ವನಿ ಆರ್ಡರ್',
      pricing: 'ಬೆಲೆ ನಿಗದಿ',
      allocation: 'ಕೆಲಸ ಹಂಚಿಕೆ',
      progress: 'ಉತ್ಪಾದನೆ',
      quality: 'ಗುಣಮಟ್ಟ',
      consolidation: 'ಏಕೀಕರಣ',
      payouts: 'ಪಾವತಿಗಳು',
      members: 'ಸದಸ್ಯರು',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    },
    memberNav: {
      dashboard: 'ನನ್ನ ಹೋಮ್',
      work: 'ನನ್ನ ಕೆಲಸ',
      progress: 'ಕೆಲಸ ವರದಿ',
      earnings: 'ನನ್ನ ಗಳಿಕೆ',
      audioSummary: 'ಆಡಿಯೋ ಸಾರಾಂಶ',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    },
    common: {
      signOut: 'ಲಾಗ್ ಔಟ್',
      online: 'ಆನ್‌ಲೈನ್',
      offline: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್',
      syncNow: 'ಈಗ ಸಿಂಕ್ ಮಾಡಿ',
      pendingSync: 'ಸಿಂಕ್ ಬಾಕಿ',
      synced: 'ಸಿಂಕ್ ಆಗಿದೆ',
      savedLocally: 'ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ',
      listenAudio: 'ಆಡಿಯೋ ಕೇಳಿ',
      replay: 'ಮತ್ತೆ ಕೇಳಿ',
    },
  },
};
