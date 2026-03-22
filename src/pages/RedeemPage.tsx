import React, { useState } from 'react'
import { redeemPuddingStaff } from '../api/passportSystem'
import PageHeader from '../components/PageHeader'

export default function RedeemPage() {
  const [pwInput, setPwInput] = useState('')
  const [passportNum, setPassportNum] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
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

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <PageHeader />
      <div className="max-w-md mx-auto px-5 pt-28 pb-10">

        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">月島端驗證</p>
          <h1 className="font-serif text-3xl text-brand-black mt-2">護照兌換</h1>
        </div>

        <form onSubmit={handleRedeem} className="space-y-3 mb-6">
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setRedeemError(null) }}
            placeholder="店員密碼"
            className="w-full bg-brand-black/5 border border-brand-black/10 text-brand-black rounded-2xl px-5 py-4 text-sm outline-none placeholder:text-brand-black/30"
            autoComplete="current-password"
            required
          />
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
                className="flex-1 bg-transparent text-brand-bg text-sm outline-none placeholder:text-brand-bg/30 w-16"
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
          {redeemError && <p className="text-red-400 text-xs px-1">{redeemError}</p>}
        </form>

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
