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
import { PUBLIC_MOONMOON_SITES } from '../constants';
import {
  KIWIMU_CHARACTER_OPTIONS,
  ProfileCenterSyncStatus,
  PROFILE_CENTER_AVATAR_URL,
  ProfileCenterDraft,
  LOCKED_PASSPORT_TITLE,
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
      aria-pressed={checked}
      onClick={onToggle}
      className={`relative overflow-hidden rounded-[1.6rem] border-2 p-4 text-left transition-all ${
        checked
          ? 'border-brand-black bg-brand-gold text-brand-black shadow-[3px_3px_0px_black]'
          : 'border-brand-black/10 bg-white text-brand-black'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-brand-black/65">
            公開偏好
          </p>
          <h4 className="mt-1 text-sm font-black">{label}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.16em] ${
            checked
              ? 'border-brand-black bg-white/70 text-brand-black'
              : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/65'
          }`}
        >
          {checked ? <Eye size={12} /> : <EyeOff size={12} />}
          {checked ? '願意公開' : '不公開'}
        </span>
      </div>

      <p className="mt-3 text-[12px] font-medium leading-relaxed text-brand-black/65">
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
            ? 'border-[#D8D7C4] bg-[#E6E8D9] text-[#304F2F]'
            : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/65';

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
    <KiwimuPanel padded={false} className="border-brand-black/20 shadow-[2px_2px_0px_rgba(0,0,0,0.35)]">
      <div className="border-b border-brand-black/10 bg-white px-4 py-3 text-brand-black">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-black/10 bg-brand-gold/40">
            <UserRound size={15} className="text-brand-black" />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-black/65">
              Holder Record
            </p>
            <h3 className="text-sm font-black text-brand-black">身份資料</h3>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[linear-gradient(180deg,#fffdf6_0%,#f7f7f3_100%)] p-4">
        <section className="relative overflow-hidden rounded-4xl border-2 border-brand-black bg-white shadow-[4px_4px_0px_black]">
          <div className="relative p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-black/65">
                  Holder Record
                </p>
                <p className="mt-1 text-xs font-bold text-[#5F6856]">
                  這裡維護護照名稱、公開偏好與陪伴角色。
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.16em] ${
                  hasIdentity
                    ? 'border-brand-black bg-brand-gold text-brand-black'
                    : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/65'
                }`}
              >
                {hasIdentity ? '已啟用' : '訪客模式'}
              </span>
            </div>

            <div className="flex flex-col items-start gap-6 min-[420px]:flex-row min-[420px]:gap-4">
              <div className="relative shrink-0">
                <div className="rounded-[1.75rem] border-2 border-brand-black bg-brand-black p-1 shadow-[3px_3px_0px_black]">
                  <img
                    src={PROFILE_CENTER_AVATAR_URL}
                    alt="Kiwimu 預設頭像"
                    className="h-24 w-24 rounded-[1.3rem] bg-white object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-brand-black bg-white px-2 py-1 text-[12px] font-black uppercase tracking-[0.14em] text-brand-black">
                  Kiwimu
                </div>
              </div>

              <div className="min-w-0 w-full flex-1">
                <div className="rounded-3xl border border-brand-black/10 bg-brand-gray/10 px-3 py-2">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-brand-black/65">
                    護照顯示名
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <PencilLine size={14} className="text-brand-black/65" />
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(event) => updateDraft('displayName', event.target.value)}
                      placeholder="輸入你想在護照裡顯示的名字"
                      className="min-h-11 w-full border-none bg-transparent p-0 text-base font-black text-brand-black outline-hidden placeholder:text-[#5F6856]"
                    />
                  </div>
                </div>

                <p className="mt-3 text-[12px] font-medium leading-relaxed text-[#5F6856]">
                  可以使用登入帳號的名稱，也可以改成你想留在護照裡的名字。
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[1.4rem] border border-brand-black/10 bg-brand-gray/10 px-3 py-3">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-brand-black/65">
                  陪伴角色
                </p>
                <p className="mt-1 text-sm font-black text-brand-black">
                  {selectedCharacter.name}
                </p>
                <p className="mt-1 text-[12px] font-medium text-brand-black/65">
                  {selectedCharacter.mood}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-brand-black/10 bg-brand-gray/10 px-3 py-3">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-brand-black/65">
                  護照稱號
                </p>
                <p className="mt-1 text-sm font-black text-brand-black">
                  {passportTitle.label}
                </p>
                <p className="mt-1 text-[12px] font-medium text-brand-black/65">
                  {passportTitle.hint}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border px-3 py-3 ${syncToneClass}`}>
          <p className="text-[12px] font-black uppercase tracking-[0.18em]">
            會員資料同步
          </p>
          <p className="mt-1 text-[12px] font-medium leading-relaxed">
            {syncStatus.message}
          </p>
        </section>

        <section className="rounded-4xl border-2 border-brand-black bg-brand-black p-4 text-white shadow-[4px_4px_0px_black]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-gold" />
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/65">
                Privacy Seals
              </p>
              <h4 className="text-sm font-black">公開偏好</h4>
            </div>
          </div>

          <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/65">
            先記下你的公開偏好。公開護照頁目前只顯示護照編號、持有人名稱、邀請進度與布丁領取狀態，不會展示下面這些資料。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <PrivacySeal
              checked={draft.isMbtiPublic}
              label="靈魂甜點"
              description={
                mbtiType
                  ? `目前已帶入 ${mbtiType}。這是偏好設定，公開護照頁目前不會顯示。`
                  : '還沒有測驗結果。完成免費 MBTI 測驗後，可回來查看。'
              }
              onToggle={() => updateDraft('isMbtiPublic', !draft.isMbtiPublic)}
            />
            <PrivacySeal
              checked={draft.isFootprintPublic}
              label="月島足跡"
              description={`目前累積 ${visitedSiteCount}/${PUBLIC_MOONMOON_SITES.length} 站。這是偏好設定，公開護照頁目前不會顯示。`}
              onToggle={() => updateDraft('isFootprintPublic', !draft.isFootprintPublic)}
            />
          </div>
        </section>

        <section className="rounded-4xl border-2 border-brand-black bg-white p-4 shadow-[4px_4px_0px_black]">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-brand-black" />
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-brand-black/65">
                Favorite Companion
              </p>
              <h4 className="text-sm font-black text-brand-black">陪伴角色</h4>
            </div>
          </div>

          <p className="mt-2 text-[12px] font-medium leading-relaxed text-brand-black/65">
            選一位最像你的陪伴角色，會顯示在你的身份資料裡。
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
                      ? 'border-brand-black bg-brand-gold text-brand-black shadow-[3px_3px_0px_black]'
                      : 'border-brand-black/10 bg-brand-gray/10 text-brand-black/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-black">{option.name}</p>
                      <p className="mt-1 text-[12px] font-medium">{option.mood}</p>
                    </div>
                    {isSelected ? (
                      <span className="rounded-full border border-brand-black bg-white px-2 py-1 text-[12px] font-black uppercase tracking-[0.14em]">
                        選定
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-4xl border-2 border-brand-black bg-brand-black p-4 text-white shadow-[4px_4px_0px_black]">
          <div className="absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-brand-gold/15 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-brand-gold" />
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/65">
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
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/65">
                    {passportTitle.hint}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-brand-gold">
                  {draft.passportTitleId === LOCKED_PASSPORT_TITLE.id ? '尚未開放' : draft.passportTitleId}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-brand-gold/30 bg-brand-gold/10 p-3">
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 text-brand-green" />
            <p className="text-[12px] font-medium leading-relaxed text-[#5F6856]">
              請以上方同步狀態為準。未同步的變更只保留在此裝置，換裝置前請確認已保存至會員資料。
            </p>
          </div>
        </section>
      </div>
    </KiwimuPanel>
  );
};

export default ProfileCenter;
