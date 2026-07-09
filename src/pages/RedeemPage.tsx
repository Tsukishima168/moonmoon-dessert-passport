import React, { useState } from 'react'
import { redeemPuddingStaff } from '../api/passportSystem'
import { fulfillRewardRedemptionStaff, type RewardRedemption } from '../api/rewards'
import PageHeader from '../components/PageHeader'

export default function RedeemPage() {
  const [mode, setMode] = useState<'reward' | 'passport'>('reward')
  const [pwInput, setPwInput] = useState('')
  const [passportNum, setPassportNum] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const [fulfilledReward, setFulfilledReward] = useState<RewardRedemption | null>(null)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(passportNum, 10)
    if (!num || num < 1 || num > 100) { setRedeemError('請輸入 1–100 的護照編號'); return }
    if (!pwInput.trim()) { setRedeemError('請輸入店員密碼'); return }

    setRedeeming(true)
    setRedeemError(null)

    const { error } = await redeemPuddingStaff({
      passport_number: num,
      staff_password: pwInput,
    })

    if (error) {
      const msgMap: Record<string, string> = {
        'Invalid password': '密碼錯誤',
        'Passport not found': '找不到此護照編號',
        'Invite slots not full': '邀請尚未集滿',
        'Already redeemed': '已兌換，無法重複使用',
      }
      setRedeemError(msgMap[error.message] ?? '寫入失敗，請再試')
      setRedeeming(false)
    } else {
      setRedeemSuccess(true)
      setRedeeming(false)
    }
  }

  async function handleRewardFulfill(e: React.FormEvent) {
    e.preventDefault()
    const code = redemptionCode.trim().toUpperCase()
    if (code.length < 10) { setRedeemError('請輸入完整兌換碼'); return }
    if (!pwInput.trim()) { setRedeemError('請輸入店員密碼'); return }

    setRedeeming(true)
    setRedeemError(null)
    setFulfilledReward(null)

    const { data, error } = await fulfillRewardRedemptionStaff({
      redemptionCode: code,
      staffPassword: pwInput,
    })

    if (error) {
      const msgMap: Record<string, string> = {
        invalid_password: '密碼錯誤',
        invalid_code: '兌換碼格式不正確',
        invalid_used_or_expired: '兌換碼不存在、已核銷或已過期',
        server_configuration_error: '伺服器密碼設定異常，請聯繫管理員',
      }
      setRedeemError(msgMap[error.message] ?? '核銷失敗，請再試')
      setRedeeming(false)
      return
    }

    setFulfilledReward(data)
    setRedeeming(false)
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <PageHeader />
      <div className="max-w-md mx-auto px-5 pt-28 pb-10">

        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">月島端驗證</p>
          <h1 className="font-serif text-3xl text-brand-black mt-2">兌換核銷</h1>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-black/5 p-1">
          <button
            type="button"
            onClick={() => { setMode('reward'); setRedeemError(null); setRedeemSuccess(false) }}
            className={`rounded-xl py-2 text-sm font-medium ${mode === 'reward' ? 'bg-brand-black text-brand-bg' : 'text-brand-black/50'}`}
          >
            點數兌換碼
          </button>
          <button
            type="button"
            onClick={() => { setMode('passport'); setRedeemError(null); setFulfilledReward(null) }}
            className={`rounded-xl py-2 text-sm font-medium ${mode === 'passport' ? 'bg-brand-black text-brand-bg' : 'text-brand-black/50'}`}
          >
            護照布丁
          </button>
        </div>

        <form onSubmit={mode === 'reward' ? handleRewardFulfill : handleRedeem} className="space-y-3 mb-6">
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setRedeemError(null) }}
            placeholder="店員密碼"
            className="w-full bg-brand-black/5 border border-brand-black/10 text-brand-black rounded-2xl px-5 py-4 text-sm outline-hidden placeholder:text-brand-black/30"
            autoComplete="current-password"
            required
          />
          {mode === 'reward' ? (
            <div className="flex gap-2">
              <div className="flex items-center bg-brand-black rounded-2xl px-5 py-4 gap-2 flex-1">
                <span className="text-brand-bg/50 text-sm">CODE</span>
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={e => { setRedemptionCode(e.target.value.toUpperCase()); setRedeemError(null); setFulfilledReward(null) }}
                  placeholder="AB12CD34EF56"
                  className="flex-1 bg-transparent text-brand-bg text-sm outline-hidden placeholder:text-brand-bg/30 min-w-0"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={redeeming || Boolean(fulfilledReward)}
                className="bg-brand-lime text-brand-black rounded-2xl px-6 text-sm font-medium disabled:opacity-40"
              >
                {redeeming ? '核銷中...' : '核銷'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex items-center bg-brand-black rounded-2xl px-5 py-4 gap-2 flex-1">
                <span className="text-brand-bg/50 text-sm">#</span>
                <input
                  type="number"
                  value={passportNum}
                  onChange={e => { setPassportNum(e.target.value); setRedeemError(null) }}
                  placeholder="001"
                  min={1}
                  max={100}
                  className="flex-1 bg-transparent text-brand-bg text-sm outline-hidden placeholder:text-brand-bg/30 w-16"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={redeeming || redeemSuccess}
                className="bg-brand-lime text-brand-black rounded-2xl px-6 text-sm font-medium disabled:opacity-40"
              >
                {redeeming ? '確認中...' : '確認兌換'}
              </button>
            </div>
          )}
          {redeemError && <p className="text-red-400 text-xs px-1">{redeemError}</p>}
        </form>

        {fulfilledReward && (
          <div className="bg-brand-lime rounded-2xl p-6 text-center">
            <p className="text-brand-black font-medium">✓ 核銷完成</p>
            <p className="text-brand-black/70 text-sm mt-2">{fulfilledReward.reward_name}</p>
            <p className="text-brand-black/50 text-xs mt-1">兌換碼 {fulfilledReward.redemption_code} 已核銷</p>
          </div>
        )}

        {redeemSuccess && (
          <div className="bg-brand-lime rounded-2xl p-6 text-center">
            <p className="text-brand-black font-medium">✓ 兌換完成</p>
            <p className="text-brand-black/50 text-xs mt-1">護照 #{passportNum.padStart(3, '0')} 已寫入兌換紀錄</p>
          </div>
        )}

      </div>
    </div>
  )
}
