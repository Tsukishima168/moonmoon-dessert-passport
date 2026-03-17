import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPassportById, type Passport } from '../api/passportSystem'

export default function PassportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setError('無效的護照連結'); setLoading(false); return }
    getPassportById(id).then(({ data, error }) => {
      if (error || !data) setError('找不到護照')
      else setPassport(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <StatusView text="載入中..." />
  if (error || !passport) return <StatusView text={error ?? '找不到護照'} />

  const canRedeem = passport.invite_slots_used >= passport.invite_slots_total && !passport.pudding_claimed
  const slotsLeft = passport.invite_slots_total - passport.invite_slots_used
  const canInvite = passport.status === 'active' && slotsLeft > 0

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <div className="max-w-md mx-auto px-5 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">Kiwimu Passport</p>
          <h1 className="font-serif text-5xl text-brand-black mt-2">
            #{String(passport.passport_number).padStart(3, '0')}
          </h1>
          <p className="text-brand-black/60 mt-1">{passport.holder_name}</p>
        </div>

        {/* Invite progress */}
        <div className="bg-brand-black rounded-2xl p-6 mb-4">
          <p className="text-brand-bg/40 text-xs tracking-widest uppercase mb-4">邀請進度</p>
          <div className="flex gap-2 mb-4">
            {Array.from({ length: passport.invite_slots_total }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < passport.invite_slots_used ? 'bg-brand-lime' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
          <p className="text-brand-bg text-sm">
            已邀請 <span className="text-brand-lime font-medium">{passport.invite_slots_used}</span> / {passport.invite_slots_total} 位
          </p>
          {slotsLeft > 0 && (
            <p className="text-brand-bg/40 text-xs mt-1">再邀請 {slotsLeft} 位朋友，即可兌換月島布丁</p>
          )}
        </div>

        {/* Pudding status */}
        <div className={`rounded-2xl p-6 mb-6 ${canRedeem ? 'bg-brand-lime' : 'bg-brand-gray'}`}>
          <p className="text-brand-black/50 text-xs tracking-widest uppercase mb-1">月島布丁</p>
          <p className="text-brand-black font-medium text-sm">
            {passport.pudding_claimed
              ? '✓ 已兌換'
              : canRedeem
              ? '🎉 可兌換！帶護照連結到店讓店員確認'
              : `集滿 ${passport.invite_slots_total} 個邀請即可兌換`}
          </p>
        </div>

        {/* Invite button */}
        {canInvite && (
          <button
            onClick={() => navigate(`/invite/${id}`)}
            className="w-full bg-brand-black text-brand-bg rounded-full py-4 text-sm tracking-wide hover:opacity-80 transition-opacity"
          >
            邀請朋友 →
          </button>
        )}

        {!canInvite && passport.status === 'active' && (
          <p className="text-center text-brand-black/40 text-sm py-4">邀請名額已用完</p>
        )}

        {passport.status === 'suspended' && (
          <p className="text-center text-red-400 text-sm py-4">此護照已暫停使用</p>
        )}

      </div>
    </div>
  )
}

function StatusView({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <p className="text-brand-black/40 text-sm">{text}</p>
    </div>
  )
}
