import React, { useState } from 'react';
import {
  fulfillPassportPudding,
  fulfillRewardRedemption,
  type StaffPassportPuddingFulfillment,
  type StaffRewardFulfillment,
} from '../api/rewards';
import PageHeader from '../components/PageHeader';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: '目前登入帳號不是有效店員，請改用已登記的店員帳號。',
  NOT_ELIGIBLE: '查無此項目，或尚未符合核銷資格。',
  EXPIRED: '此核銷憑證已過期。',
  ALREADY_PROCESSED: '此項目已核銷；畫面會顯示原核銷紀錄。',
  INVALID_PROOF: '核銷憑證格式錯誤或已失效。',
  ROLLOUT_DISABLED: '此核銷功能目前尚未開放。',
  UNAVAILABLE: '核銷服務暫時無法確認，請稍後再試。',
};

function resolveError(error: Error | null): string {
  return ERROR_MESSAGES[error?.message || 'UNAVAILABLE'] || ERROR_MESSAGES.UNAVAILABLE;
}

export default function RedeemPage() {
  const { user, loading, signInWithGoogle, signOut } = useSupabaseAuth();
  const [mode, setMode] = useState<'reward' | 'passport'>('reward');
  const [passportNum, setPassportNum] = useState('');
  const [redemptionCredential, setRedemptionCredential] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [fulfilledReward, setFulfilledReward] = useState<StaffRewardFulfillment | null>(null);
  const [fulfilledPudding, setFulfilledPudding] = useState<StaffPassportPuddingFulfillment | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  async function handlePuddingFulfill(event: React.FormEvent) {
    event.preventDefault();
    const passportNumber = Number.parseInt(passportNum, 10);
    if (!Number.isSafeInteger(passportNumber) || passportNumber < 1 || passportNumber > 100) {
      setRedeemError('請輸入 1–100 的護照編號');
      return;
    }

    setRedeeming(true);
    setRedeemError(null);
    setFulfilledPudding(null);
    const result = await fulfillPassportPudding({ passportNumber });
    setRedeeming(false);

    if (result.error || !result.data) {
      setRedeemError(resolveError(result.error));
      return;
    }

    setFulfilledPudding(result.data);
  }

  async function handleRewardFulfill(event: React.FormEvent) {
    event.preventDefault();
    const credential = redemptionCredential.trim();
    if (credential.length < 10 || !credential.includes('.')) {
      setRedeemError('請貼上會員畫面顯示的完整核銷憑證');
      return;
    }

    setRedeeming(true);
    setRedeemError(null);
    setFulfilledReward(null);
    const result = await fulfillRewardRedemption({ credential });
    setRedeeming(false);

    if (result.error || !result.data) {
      setRedeemError(resolveError(result.error));
      return;
    }

    setFulfilledReward(result.data);
  }

  return (
    <div className="ku-passport-route-shell bg-brand-bg font-sans">
      <PageHeader />
      <div className="mx-auto max-w-md px-5 pb-10 pt-28">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-brand-black/40">月島店員驗證</p>
          <h1 className="mt-2 font-serif text-3xl text-brand-black">兌換核銷</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-black/55">
            所有核銷都會綁定目前的 Supabase Auth 店員帳號並寫入稽核紀錄。
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border-2 border-brand-black/10 bg-white p-6 text-center text-sm font-semibold text-brand-black/50">
            正在確認店員登入狀態…
          </div>
        ) : !user ? (
          <div className="rounded-2xl border-2 border-brand-black bg-white p-6 text-center shadow-[4px_4px_0px_black]">
            <p className="text-base font-black text-brand-black">請先登入店員帳號</p>
            <p className="mt-2 text-sm leading-relaxed text-brand-black/55">
              共用店員密碼已停用；只有 staff_members 中的有效帳號可以核銷。
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle(window.location.href)}
              className="mt-5 w-full rounded-2xl border-2 border-brand-black bg-brand-lime py-3 text-sm font-black text-brand-black shadow-[3px_3px_0px_black]"
            >
              使用 Google 登入店員帳號
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-brand-black/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-brand-black/35">目前帳號</p>
                <p className="mt-1 truncate text-sm font-bold text-brand-black">{user.email || user.id}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="shrink-0 rounded-full border border-brand-black/15 px-3 py-1.5 text-xs font-bold text-brand-black/60"
              >
                登出
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-black/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('reward');
                  setRedeemError(null);
                  setFulfilledPudding(null);
                }}
                className={`rounded-xl py-2 text-sm font-medium ${mode === 'reward' ? 'bg-brand-black text-brand-bg' : 'text-brand-black/50'}`}
              >
                點數兌換憑證
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('passport');
                  setRedeemError(null);
                  setFulfilledReward(null);
                }}
                className={`rounded-xl py-2 text-sm font-medium ${mode === 'passport' ? 'bg-brand-black text-brand-bg' : 'text-brand-black/50'}`}
              >
                護照布丁
              </button>
            </div>

            <form
              onSubmit={mode === 'reward' ? handleRewardFulfill : handlePuddingFulfill}
              className="mb-6 space-y-3"
            >
              {mode === 'reward' ? (
                <>
                  <textarea
                    value={redemptionCredential}
                    onChange={(event) => {
                      setRedemptionCredential(event.target.value);
                      setRedeemError(null);
                      setFulfilledReward(null);
                    }}
                    placeholder="貼上 R2-… 開頭的完整核銷憑證"
                    className="min-h-32 w-full resize-none rounded-2xl border border-brand-black/10 bg-brand-black px-5 py-4 font-mono text-xs leading-relaxed text-brand-bg outline-hidden placeholder:text-brand-bg/30"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                  <button
                    type="submit"
                    disabled={redeeming || Boolean(fulfilledReward)}
                    className="w-full rounded-2xl bg-brand-lime py-3 text-sm font-black text-brand-black disabled:opacity-40"
                  >
                    {redeeming ? '核銷中…' : '確認核銷點數福利'}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-brand-black px-5 py-4">
                    <span className="text-sm text-brand-bg/50">#</span>
                    <input
                      type="number"
                      value={passportNum}
                      onChange={(event) => {
                        setPassportNum(event.target.value);
                        setRedeemError(null);
                        setFulfilledPudding(null);
                      }}
                      placeholder="001"
                      min={1}
                      max={100}
                      className="w-16 min-w-0 flex-1 bg-transparent text-sm text-brand-bg outline-hidden placeholder:text-brand-bg/30"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={redeeming || Boolean(fulfilledPudding)}
                    className="rounded-2xl bg-brand-lime px-6 text-sm font-black text-brand-black disabled:opacity-40"
                  >
                    {redeeming ? '確認中…' : '確認兌換'}
                  </button>
                </div>
              )}
              {redeemError && <p className="px-1 text-xs font-semibold text-red-500">{redeemError}</p>}
            </form>

            {fulfilledReward && (
              <div className="rounded-2xl bg-brand-lime p-6 text-center">
                <p className="font-black text-brand-black">
                  ✓ {fulfilledReward.replayed ? '已核銷，載入原紀錄' : '核銷完成'}
                </p>
                <p className="mt-2 text-sm text-brand-black/70">{fulfilledReward.rewardName}</p>
                <p className="mt-1 text-xs text-brand-black/50">
                  {new Date(fulfilledReward.fulfilledAt).toLocaleString('zh-TW')}
                </p>
              </div>
            )}

            {fulfilledPudding && (
              <div className="rounded-2xl bg-brand-lime p-6 text-center">
                <p className="font-black text-brand-black">
                  ✓ {fulfilledPudding.replayed ? '已兌換，載入原紀錄' : '兌換完成'}
                </p>
                <p className="mt-2 text-sm text-brand-black/70">{fulfilledPudding.holderName}</p>
                <p className="mt-1 text-xs text-brand-black/50">
                  護照 #{String(fulfilledPudding.passportNumber).padStart(3, '0')} · {new Date(fulfilledPudding.fulfilledAt).toLocaleString('zh-TW')}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
