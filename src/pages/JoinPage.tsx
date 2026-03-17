import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPassportById, createInvitation, type Passport } from '../api/passportSystem'
import PageHeader from '../components/PageHeader'

export default function JoinPage() {
  const { passportId } = useParams<{ passportId: string }>()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [igHandle, setIgHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!passportId) { setError('無效的邀請連結'); setLoading(false); return }
    getPassportById(passportId).then(({ data, error }) => {
      if (error || !data) { setError('找不到這張護照'); setLoading(false); return }
      if (data.status !== 'active') { setError('此護照已暫停使用'); setLoading(false); return }
      if (data.invite_slots_used >= data.invite_slots_total) { setError('此護照的邀請名額已滿'); setLoading(false); return }
      setPassport(data)
      setLoading(false)
    })
  }, [passportId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const handle = igHandle.replace(/^@/, '').trim()
    if (!handle || !passportId) return
    setSubmitting(true)
    const { error } = await createInvitation({ from_passport_id: passportId, invitee_contact: handle, invitee_contact_type: 'ig' })
    if (error) {
      setError('送出失敗，請稍後再試')
      setSubmitting(false)
      return
    }
    setSuccess(true)
    setSubmitting(false)
  }

  if (loading) return <StatusView text="載入中..." />
  if (error) return <StatusView text={error} />

  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg font-sans">
        <PageHeader />
        <div className="max-w-md mx-auto px-5 pt-28 pb-10 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="font-sans font-black text-2xl text-brand-black mb-2">已接受邀請</h1>
          <p className="text-brand-black/50 text-sm">你已成功加入 {passport?.holder_name} 的 Kiwimu 宇宙</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <PageHeader />
      <div className="max-w-md mx-auto px-5 pt-28 pb-10">
        <div className="mb-8">
          <p className="text-xs text-brand-black/40 tracking-widest uppercase">邀請加入</p>
          <h1 className="font-sans font-black text-3xl text-brand-black mt-2">
            你被 {passport?.holder_name} 邀請了
          </h1>
          <p className="text-brand-black/50 text-sm mt-1">填入你的 IG 帳號，接受邀請</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-brand-black rounded-2xl px-4 py-3 flex items-center mb-4">
            <span className="text-brand-bg/40 text-sm mr-2">@</span>
            <input
              type="text"
              value={igHandle}
              onChange={e => setIgHandle(e.target.value)}
              placeholder="ig_username"
              className="flex-1 bg-transparent text-brand-bg text-sm outline-none placeholder:text-brand-bg/30"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!igHandle.trim() || submitting}
            className="w-full bg-brand-lime text-brand-black rounded-full py-4 text-sm tracking-wide font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
          >
            {submitting ? '送出中...' : '確認接受邀請'}
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
