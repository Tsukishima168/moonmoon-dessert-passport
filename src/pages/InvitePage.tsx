import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPassportById, createInvitation, type Passport } from '../api/passportSystem'
import PageHeader from '../components/PageHeader'

export default function InvitePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setError('無效連結'); setLoading(false); return }
    getPassportById(id).then(({ data, error }) => {
      if (error || !data) setError('找不到護照')
      else if (data.status !== 'active') setError('此護照已暫停')
      else if (data.invite_slots_used >= data.invite_slots_total) setError('邀請名額已用完')
      else setPassport(data)
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim() || !passport || !id) return
    setSubmitting(true)
    setError(null)

    const { error } = await createInvitation({
      from_passport_id: id,
      invitee_contact: contact.trim().replace(/^@/, ''),
      invitee_contact_type: 'ig',
    })

    if (error) {
      setError('提交失敗，請再試一次')
      setSubmitting(false)
    } else {
      setSuccess(true)
    }
  }

  if (loading) return <StatusView text="載入中..." />
  if (error && !passport) return <StatusView text={error} />

  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg font-sans flex items-center justify-center">
        <div className="max-w-md mx-auto px-5 text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="font-serif text-3xl text-brand-black mb-3">邀請成功</h1>
          <p className="text-brand-black/60 text-sm mb-8">
            已記錄 @{contact.trim().replace(/^@/, '')} 的邀請
          </p>
          <button
            onClick={() => navigate(`/passport/${id}`)}
            className="text-brand-black/50 text-sm underline underline-offset-4"
          >
            回到護照
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <PageHeader />
      <div className="max-w-md mx-auto px-5 pt-28 pb-10">

        <button
          onClick={() => navigate(`/passport/${id}`)}
          className="text-brand-black/40 text-sm mb-8 hover:text-brand-black transition-colors"
        >
          ← 返回
        </button>

        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">邀請朋友</p>
          <h1 className="font-serif text-3xl text-brand-black mt-2">填入 IG 帳號</h1>
          {passport && (
            <p className="text-brand-black/50 text-sm mt-1">
              剩餘名額：{passport.invite_slots_total - passport.invite_slots_used} 個
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center bg-brand-black rounded-2xl px-5 py-4 gap-2">
              <span className="text-brand-bg/50 text-sm">@</span>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="ig_username"
                className="flex-1 bg-transparent text-brand-bg text-sm outline-none placeholder:text-brand-bg/30"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-4 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !contact.trim()}
            className="w-full bg-brand-lime text-brand-black rounded-full py-4 text-sm font-medium tracking-wide disabled:opacity-40 transition-opacity"
          >
            {submitting ? '提交中...' : '確認邀請'}
          </button>
        </form>

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
