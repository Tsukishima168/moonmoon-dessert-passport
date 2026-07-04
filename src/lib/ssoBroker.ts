export const SSO_BROKER_MODE_KEY = 'kiwimu_sso_broker_mode';
export const SSO_BROKER_MODE_POPUP = 'popup';
export const SSO_BROKER_MESSAGE_TYPE = 'kiwimu:sso:complete';

type SsoBrokerStatus = 'success' | 'error';

export interface SsoBrokerMessage {
  type: typeof SSO_BROKER_MESSAGE_TYPE;
  status: SsoBrokerStatus;
  redirectTo?: string;
  message?: string;
}

export function getIncomingSsoMode(params: URLSearchParams): string | null {
  return params.get('presentation') || params.get('sso_presentation') || params.get('mode');
}

export function isSsoBrokerMode(params: URLSearchParams): boolean {
  const mode = getIncomingSsoMode(params);
  return mode === SSO_BROKER_MODE_POPUP || mode === 'sso';
}

export function saveSsoBrokerMode(mode: string | null) {
  if (mode !== SSO_BROKER_MODE_POPUP) return;

  try {
    sessionStorage.setItem(SSO_BROKER_MODE_KEY, SSO_BROKER_MODE_POPUP);
  } catch {
    /* ignore */
  }
}

export function isPopupBrokerSession(): boolean {
  try {
    return sessionStorage.getItem(SSO_BROKER_MODE_KEY) === SSO_BROKER_MODE_POPUP;
  } catch {
    return false;
  }
}

export function clearSsoBrokerMode() {
  try {
    sessionStorage.removeItem(SSO_BROKER_MODE_KEY);
  } catch {
    /* ignore */
  }
}

export function removeSsoBrokerParams(params: URLSearchParams) {
  params.delete('presentation');
  params.delete('sso_presentation');
  params.delete('mode');
  params.delete('intent');
  params.delete('source_site');
}

export function notifySsoBrokerComplete(
  redirectTo: string | null,
  status: SsoBrokerStatus = 'success',
  message?: string
): boolean {
  if (!isPopupBrokerSession() || !redirectTo || !window.opener || window.opener.closed) {
    return false;
  }

  let targetOrigin: string;
  try {
    targetOrigin = new URL(redirectTo).origin;
  } catch {
    return false;
  }

  const payload: SsoBrokerMessage = {
    type: SSO_BROKER_MESSAGE_TYPE,
    status,
    redirectTo,
    ...(message ? { message } : {}),
  };

  window.opener.postMessage(payload, targetOrigin);
  clearSsoBrokerMode();

  window.setTimeout(() => {
    window.close();
    window.location.replace(redirectTo);
  }, 120);

  return true;
}
