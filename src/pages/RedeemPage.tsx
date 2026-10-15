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
      setRedeemError(Object.hasOwn(msgMap, error.message) ? msgMap[error.message] : '核銷未完成，請確認網路後再試；若持續發生，請聯繫門市負責人。')
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
        server_configuration_error: '目前無法核銷，請聯繫門市負責人協助。',
      }
      setRedeemError(Object.hasOwn(msgMap, error.message) ? msgMap[error.message] : '核銷未完成，請確認網路後再試；若持續發生，請聯繫門市負責人。')
      setRedeeming(false)
      return
    }

    setFulfilledReward(data)
    setRedeeming(false)
  }

  return (
    <div className="ku-passport-route-shell bg-brand-bg font-sans">
      <PageHeader />
      <main className="redeem-main">

        <div className="redeem-head">
          <p className="redeem-eyebrow">月島端驗證</p>
          <h1 className="redeem-title">兌換核銷</h1>
        </div>

        <div className="redeem-card">

          <div className="redeem-toggle">
            <button
              type="button"
              onClick={() => { setMode('reward'); setRedeemError(null); setRedeemSuccess(false) }}
              className={`redeem-toggle-btn${mode === 'reward' ? ' is-active' : ''}`}
            >
              點數兌換碼
            </button>
            <button
              type="button"
              onClick={() => { setMode('passport'); setRedeemError(null); setFulfilledReward(null) }}
              className={`redeem-toggle-btn${mode === 'passport' ? ' is-active' : ''}`}
            >
              護照布丁
            </button>
          </div>

          <form onSubmit={mode === 'reward' ? handleRewardFulfill : handleRedeem} className="redeem-form">
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setRedeemError(null) }}
              placeholder="店員密碼"
              className="redeem-input"
              autoComplete="current-password"
              required
            />
            {mode === 'reward' ? (
              <div className="redeem-row">
                <div className="redeem-field">
                  <span className="redeem-field-label">CODE</span>
                  <input
                    type="text"
                    value={redemptionCode}
                    onChange={e => { setRedemptionCode(e.target.value.toUpperCase()); setRedeemError(null); setFulfilledReward(null) }}
                    placeholder="AB12CD34EF56"
                    className="redeem-field-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={redeeming || Boolean(fulfilledReward)}
                  className="member-button redeem-submit"
                >
                  {redeeming ? '核銷中...' : '核銷'}
                </button>
              </div>
            ) : (
              <div className="redeem-row">
                <div className="redeem-field">
                  <span className="redeem-field-label">#</span>
                  <input
                    type="number"
                    value={passportNum}
                    onChange={e => { setPassportNum(e.target.value); setRedeemError(null) }}
                    placeholder="001"
                    min={1}
                    max={100}
                    className="redeem-field-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={redeeming || redeemSuccess}
                  className="member-button redeem-submit"
                >
                  {redeeming ? '確認中...' : '確認兌換'}
                </button>
              </div>
            )}
            {redeemError && <p className="redeem-error">{redeemError}</p>}
          </form>

          {fulfilledReward && (
            <div className="redeem-result">
              <p className="redeem-result-title">✓ 核銷完成</p>
              <p className="redeem-result-body">{fulfilledReward.reward_name}</p>
              <p className="redeem-result-note">兌換碼 {fulfilledReward.redemption_code} 已核銷</p>
            </div>
          )}

          {redeemSuccess && (
            <div className="redeem-result">
              <p className="redeem-result-title">✓ 兌換完成</p>
              <p className="redeem-result-note">護照 #{passportNum.padStart(3, '0')} 已完成兌換</p>
            </div>
          )}

        </div>

      </main>
    </div>
  )
}
