import React, { useState } from 'react'
import { getPassportByNumber, redeemPudding, type Passport } from '../api/passportSystem'

const REDEEM_PASSWORD = 'MOONMOON2025'

export default function RedeemPage() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const [passportNum, setPassportNum] = useState('')
  const [passport, setPassport] = useState<Passport | null>(null)
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwInput === REDEEM_PASSWORD) {
      setAuthed(true)
    } else {
      setPwError(true)
      setPwInput('')
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(passportNum, 10)
    if (!num || num < 1 || num > 100) { setLookupError('請輸入 1–100 的護照編號'); return }
    setLooking(true)
    setLookupError(null)
    setPassport(null)
    setRedeemSuccess(false)

    const { data, error } = await getPassportByNumber(num)
    if (error || !data) setLookupError('找不到此護照編號')
    else setPassport(data)
    setLooking(false)
  }

  async function handleRedeem() {
    if (!passport) return
    setRedeeming(true)
    setRedeemError(null)

    const { error } = await redeemPudding({
      passport_id: passport.id,
      verified_by: 'staff',
    })

    if (error) {
      setRedeemError('寫入失敗，請再試')
      setRedeeming(false)
    } else {
      setRedeemSuccess(true)
      setRedeeming(false)
    }
  }

  const eligible = passport
    ? passport.invite_slots_used >= passport.invite_slots_total && !passport.pudding_claimed
    : false

  // Step 1: Password
  if (!authed) {
    return (
      <div className="min-h-screen bg-brand-black font-sans flex items-center justify-center">
        <div className="max-w-sm mx-auto px-5 w-full">
          <p className="text-brand-bg/40 text-xs tracking-widest uppercase mb-2">月島端驗證</p>
          <h1 className="font-serif text-3xl text-brand-bg mb-8">兌換驗證</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              placeholder="店員密碼"
              className="w-full bg-white/10 text-brand-bg rounded-2xl px-5 py-4 text-sm outline-none placeholder:text-brand-bg/30 mb-3"
              autoComplete="current-password"
              required
            />
            {pwError && <p className="text-red-400 text-xs mb-3 px-1">密碼錯誤</p>}
            <button
              type="submit"
              className="w-full bg-brand-lime text-brand-black rounded-full py-4 text-sm font-medium"
            >
              進入
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Step 2: Lookup + redeem
  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <div className="max-w-md mx-auto px-5 py-10">

        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">月島端驗證</p>
          <h1 className="font-serif text-3xl text-brand-black mt-2">護照兌換</h1>
        </div>

        {/* Lookup */}
        <form onSubmit={handleLookup} className="mb-6">
          <div className="flex gap-2">
            <div className="flex items-center bg-brand-black rounded-2xl px-5 py-4 gap-2 flex-1">
              <span className="text-brand-bg/50 text-sm">#</span>
              <input
                type="number"
                value={passportNum}
                onChange={e => setPassportNum(e.target.value)}
                placeholder="001"
                min={1}
                max={100}
                className="flex-1 bg-transparent text-brand-bg text-sm outline-none placeholder:text-brand-bg/30 w-16"
                required
              />
            </div>
            <button
              type="submit"
              disabled={looking}
              className="bg-brand-black text-brand-bg rounded-2xl px-6 text-sm disabled:opacity-40"
            >
              查詢
            </button>
          </div>
          {lookupError && <p className="text-red-400 text-xs mt-2 px-1">{lookupError}</p>}
        </form>

        {/* Passport info */}
        {passport && (
          <div className="bg-brand-black rounded-2xl p-6 mb-4">
            <p className="text-brand-bg/40 text-xs tracking-widest uppercase mb-4">護照資訊</p>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-brand-bg/50">編號</span>
                <span className="text-brand-bg font-medium">#{String(passport.passport_number).padStart(3, '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-bg/50">持有人</span>
                <span className="text-brand-bg">{passport.holder_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-bg/50">邀請進度</span>
                <span className="text-brand-bg">{passport.invite_slots_used} / {passport.invite_slots_total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-bg/50">布丁兌換</span>
                <span className={`font-medium ${passport.pudding_claimed ? 'text-brand-bg/40' : eligible ? 'text-brand-lime' : 'text-brand-bg/40'}`}>
                  {passport.pudding_claimed ? '已兌換，無法重複使用' : eligible ? '可兌換' : '未達成'}
                </span>
              </div>
            </div>

            {eligible && !redeemSuccess && (
              <>
                {redeemError && <p className="text-red-400 text-xs mb-3">{redeemError}</p>}
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full bg-brand-lime text-brand-black rounded-full py-3 text-sm font-medium disabled:opacity-40"
                >
                  {redeeming ? '確認中...' : '確認兌換布丁'}
                </button>
              </>
            )}

            {redeemSuccess && (
              <div className="text-center py-2">
                <p className="text-brand-lime font-medium">✓ 兌換完成</p>
                <p className="text-brand-bg/40 text-xs mt-1">已寫入兌換紀錄</p>
              </div>
            )}

            {!eligible && !redeemSuccess && (
              <p className="text-brand-bg/40 text-sm text-center">此護照尚未達到兌換條件</p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
