import React from 'react';
import {
  Eye,
  EyeOff,
  Heart,
  Lock,
  PencilLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { MOONMOON_SITES } from '../constants';
import {
  KIWIMU_CHARACTER_OPTIONS,
  ProfileCenterSyncStatus,
  PROFILE_CENTER_AVATAR_URL,
  ProfileCenterDraft,
  resolvePassportTitle,
} from '../src/lib/profileCenter';
import { KiwimuPanel } from './kiwimu/KiwimuPanel';

interface ProfileCenterProps {
  draft: ProfileCenterDraft;
  mbtiType: string | null;
  visitedSiteCount: number;
  hasIdentity: boolean;
  syncStatus: ProfileCenterSyncStatus;
  onChange: (next: ProfileCenterDraft) => void;
}

interface PrivacySealProps {
  checked: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}

const PrivacySeal: React.FC<PrivacySealProps> = ({
  checked,
  label,
  description,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative overflow-hidden rounded-[1.6rem] border-2 p-4 text-left transition-all ${
        checked
          ? 'border-brand-black bg-brand-lime text-brand-black shadow-[3px_3px_0px_black]'
          : 'border-brand-black/10 bg-white text-brand-black'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/45">
            公開印記
          </p>
          <h4 className="mt-1 text-sm font-black">{label}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
            checked
              ? 'border-brand-black bg-white/70 text-brand-black'
              : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/45'
          }`}
        >
          {checked ? <Eye size={12} /> : <EyeOff size={12} />}
          {checked ? '公開' : '隱藏'}
        </span>
      </div>

      <p className="mt-3 text-[11px] font-medium leading-relaxed text-brand-black/65">
        {description}
      </p>
    </button>
  );
};

const ProfileCenter: React.FC<ProfileCenterProps> = ({
  draft,
  mbtiType,
  visitedSiteCount,
  hasIdentity,
  syncStatus,
  onChange,
}) => {
  const selectedCharacter =
    KIWIMU_CHARACTER_OPTIONS.find((option) => option.id === draft.favoriteCharacterId) ||
    KIWIMU_CHARACTER_OPTIONS[0];
  const passportTitle = resolvePassportTitle(draft.passportTitleId);
  const syncToneClass =
    syncStatus.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : syncStatus.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : syncStatus.tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : syncStatus.tone === 'syncing'
            ? 'border-sky-200 bg-sky-50 text-sky-700'
            : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/55';

  const updateDraft = <K extends keyof ProfileCenterDraft>(
    key: K,
    value: ProfileCenterDraft[K]
  ) => {
    onChange({
      ...draft,
      [key]: value,
    });
  };

  return (
    <KiwimuPanel padded={false}>
      <div className="border-b-2 border-brand-black bg-brand-black px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-brand-lime" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              Passport Holder
            </p>
            <h3 className="text-sm font-black">持有人頁</h3>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[linear-gradient(180deg,#fffdf6_0%,#f7f7f3_100%)] p-4">
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-brand-black bg-white shadow-[4px_4px_0px_black]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-lime/20 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-brand-black/5 blur-2xl" />

          <div className="relative p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/35">
                  Holder Record
                </p>
                <p className="mt-1 text-xs font-bold text-brand-black/60">
                  打開護照時，第一眼看到的就是這一頁。
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                  hasIdentity
                    ? 'border-brand-black bg-brand-lime text-brand-black'
                    : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/45'
                }`}
              >
                {hasIdentity ? '已啟用' : '訪客模式'}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="rounded-[1.75rem] border-2 border-brand-black bg-brand-black p-1 shadow-[3px_3px_0px_black]">
                  <img
                    src={PROFILE_CENTER_AVATAR_URL}
                    alt="Kiwimu 預設頭像"
                    className="h-24 w-24 rounded-[1.3rem] bg-white object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-brand-black bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-brand-black">
                  Kiwimu
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="rounded-[1.5rem] border border-brand-black/10 bg-brand-gray/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/35">
                    護照顯示名
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <PencilLine size={14} className="text-brand-black/35" />
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(event) => updateDraft('displayName', event.target.value)}
                      placeholder="輸入你想在護照裡顯示的名字"
                      className="w-full border-none bg-transparent p-0 text-base font-black text-brand-black outline-none placeholder:text-brand-black/20"
                    />
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium leading-relaxed text-brand-black/60">
                  會先沿用 Google 或 LIFF 名稱，再覆蓋成你想留在護照裡的名字。
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[1.4rem] border border-brand-black/10 bg-brand-gray/10 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/35">
                  陪伴角色
                </p>
                <p className="mt-1 text-sm font-black text-brand-black">
                  {selectedCharacter.name}
                </p>
                <p className="mt-1 text-[10px] font-medium text-brand-black/50">
                  {selectedCharacter.mood}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-brand-black/10 bg-brand-gray/10 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/35">
                  護照稱號
                </p>
                <p className="mt-1 text-sm font-black text-brand-black">
                  {passportTitle.label}
                </p>
                <p className="mt-1 text-[10px] font-medium text-brand-black/50">
                  {passportTitle.hint}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-[1.5rem] border px-3 py-3 ${syncToneClass}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">
            Shared Profile Sync
          </p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed">
            {syncStatus.message}
          </p>
        </section>

        <section className="rounded-[2rem] border-2 border-brand-black bg-brand-black p-4 text-white shadow-[4px_4px_0px_black]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-lime" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                Privacy Seals
              </p>
              <h4 className="text-sm font-black">公開印記</h4>
            </div>
          </div>

          <p className="mt-2 text-[11px] font-medium leading-relaxed text-white/65">
            決定哪些身份痕跡會留在你的公開護照頁上。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <PrivacySeal
              checked={draft.isMbtiPublic}
              label="靈魂甜點"
              description={
                mbtiType
                  ? `目前已帶入 ${mbtiType}，之後可決定是否出現在公開護照頁。`
                  : '目前尚未從 MBTI 站帶入結果。'
              }
              onToggle={() => updateDraft('isMbtiPublic', !draft.isMbtiPublic)}
            />
            <PrivacySeal
              checked={draft.isFootprintPublic}
              label="月島足跡"
              description={`目前累積 ${visitedSiteCount}/${MOONMOON_SITES.length} 站，之後可決定是否展示探索進度。`}
              onToggle={() => updateDraft('isFootprintPublic', !draft.isFootprintPublic)}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border-2 border-brand-black bg-white p-4 shadow-[4px_4px_0px_black]">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-brand-black" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/35">
                Favorite Companion
              </p>
              <h4 className="text-sm font-black text-brand-black">陪伴角色</h4>
            </div>
          </div>

          <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
            先選一位最像你的角色，之後再把解鎖條件綁進來。
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {KIWIMU_CHARACTER_OPTIONS.map((option) => {
              const isSelected = option.id === draft.favoriteCharacterId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateDraft('favoriteCharacterId', option.id)}
                  className={`rounded-[1.4rem] border-2 px-3 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-brand-black bg-brand-lime text-brand-black shadow-[3px_3px_0px_black]'
                      : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-black">{option.name}</p>
                      <p className="mt-1 text-[10px] font-medium">{option.mood}</p>
                    </div>
                    {isSelected ? (
                      <span className="rounded-full border border-brand-black bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em]">
                        選定
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border-2 border-brand-black bg-brand-black p-4 text-white shadow-[4px_4px_0px_black]">
          <div className="absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-brand-lime/15 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-brand-lime" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  Passport Title
                </p>
                <h4 className="text-sm font-black">護照稱號</h4>
              </div>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">
                    {passportTitle.label}
                  </p>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-white/65">
                    {passportTitle.hint}。這裡先保留為系統發放欄位。
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-lime">
                  {draft.passportTitleId}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-brand-lime/30 bg-brand-lime/10 p-3">
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 text-brand-lime-dark" />
            <p className="text-[10px] font-medium leading-relaxed text-brand-black/65">
              這一版已直接接 shared profiles。若上方同步提示出現 warning / error，就代表這次重整後不一定會從 shared row 讀回。
            </p>
          </div>
        </section>
      </div>
    </KiwimuPanel>
  );
};

export default ProfileCenter;
