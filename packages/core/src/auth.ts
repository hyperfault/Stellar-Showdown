/**
 * Pokémon Showdown login server flows. The server sends a `|challstr|` nonce
 * over the socket; we exchange it at the login server for an assertion and
 * finish with `/trn <name>,0,<assertion>`.
 */

export interface AssertionResult {
  assertion: string;
  /** Canonical username as registered (registered login only). */
  username?: string;
}

async function postLoginForm(loginServerUrl: string, params: Record<string, string>): Promise<string> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${loginServerUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Login server error: HTTP ${res.status}`);
  return res.text();
}

/** Guest login: no password, claims an unregistered name. */
export async function fetchGuestAssertion(
  loginServerUrl: string,
  userid: string,
  challstr: string,
): Promise<AssertionResult> {
  const text = await postLoginForm(loginServerUrl, {
    act: 'getassertion',
    userid,
    challstr,
  });
  if (text.startsWith(';') || text.length < 2) {
    throw new Error('Guest login failed: name may be registered or invalid.');
  }
  if (text.startsWith(']')) {
    const data = JSON.parse(text.slice(1)) as { assertion?: string };
    if (data.assertion) return { assertion: data.assertion };
    throw new Error('Guest login failed.');
  }
  return { assertion: text };
}

/** Registered login with username + password. */
export async function fetchRegisteredAssertion(
  loginServerUrl: string,
  username: string,
  password: string,
  challstr: string,
): Promise<AssertionResult> {
  const text = await postLoginForm(loginServerUrl, {
    act: 'login',
    name: username,
    pass: password,
    challstr,
  });
  if (!text.startsWith(']')) throw new Error('Unexpected login server response.');
  const data = JSON.parse(text.slice(1)) as {
    actionsuccess?: boolean;
    actionerror?: string;
    assertion?: string;
    curuser?: { username?: string };
  };
  if (!data.actionsuccess || !data.assertion || data.assertion.startsWith(';')) {
    throw new Error(
      data.actionerror ||
        (data.assertion && !data.assertion.startsWith(';')
          ? data.assertion
          : 'Login failed: check username and password.'),
    );
  }
  return { assertion: data.assertion, username: data.curuser?.username };
}
