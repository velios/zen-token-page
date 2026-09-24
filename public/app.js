const oauthKey = 'zenmoney_oauth_random';
const rosterKey = 'zenmoney_token_roster_v1';
const localOAuth = {
  origin: 'http://localhost:3000',
  authorizeUrl: 'https://api.zenmoney.ru/oauth2/authorize/',
  tokenUrl: 'https://api.zenmoney.ru/oauth2/token/',
  clientId: 'g61164be3dd7521a6511ce97adc6bb',
  clientSecret: 'b2828c65b7',
};
const localMode = location.origin === localOAuth.origin;
const status = document.querySelector('#status');
const list = document.querySelector('#accounts');
const token = document.querySelector('#token');
const empty = document.querySelector('#empty');
const dashboard = document.querySelector('#dashboard');
const add = document.querySelector('#add');
const copy = document.querySelector('#copy');
const reveal = document.querySelector('#reveal');
const remove = document.querySelector('#remove');
let accounts = [];
let activeId = null;
let temporaryToken = null;
let visible = false;

function say(message) { status.textContent = message; }
function save(nextAccounts, nextId) {
  try {
    localStorage.setItem(rosterKey, JSON.stringify({accounts: nextAccounts, activeId: nextId}));
    return true;
  } catch { return false; }
}
try {
  const stored = JSON.parse(localStorage.getItem(rosterKey) || 'null');
  if (Array.isArray(stored?.accounts)) {
    accounts = stored.accounts.filter(account =>
      Number.isSafeInteger(account?.id) && account.id > 0 &&
      typeof account.login === 'string' && typeof account.accessToken === 'string' && account.accessToken
    );
    activeId = accounts.some(account => account.id === stored.activeId) ? stored.activeId : accounts[0]?.id;
  }
} catch { say('Браузер не открыл сохранённые аккаунты.'); }

function unverified() {
  return temporaryToken ? {id: 0, login: 'Непроверенный токен', accessToken: temporaryToken} : null;
}
function current() {
  if (activeId === 0 && temporaryToken) return unverified();
  return accounts.find(account => account.id === activeId) || accounts[0] || unverified();
}
function render() {
  const temporary = unverified();
  const entries = temporary ? [temporary, ...accounts] : accounts;
  const selected = current();
  empty.hidden = entries.length > 0;
  dashboard.hidden = entries.length === 0;
  add.hidden = entries.length === 0;
  list.replaceChildren();
  for (const account of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account';
    button.setAttribute('aria-pressed', String(account.id === selected?.id));
    const name = document.createElement('span');
    name.textContent = account.login || 'Аккаунт ' + account.id;
    const id = document.createElement('small');
    id.textContent = account.id ? 'ID ' + account.id : 'Не сохранён';
    button.append(name, id);
    button.onclick = () => {
      activeId = account.id;
      visible = false;
      if (activeId) save(accounts, activeId);
      render();
      say('');
      list.children[entries.indexOf(account)].focus();
    };
    list.append(button);
  }
  copy.textContent = 'Скопировать';
  if (!selected) { token.value = ''; return; }
  token.value = selected.accessToken;
  token.type = visible ? 'text' : 'password';
  reveal.textContent = visible ? 'Скрыть' : 'Показать';
}

function authorizeUrl(state) {
  if (!localMode) return '/auth?state=' + encodeURIComponent(state);
  const target = new URL(localOAuth.authorizeUrl);
  target.search = new URLSearchParams({
    response_type: 'code',
    client_id: localOAuth.clientId,
    redirect_uri: localOAuth.origin,
    state,
  });
  return target;
}
async function exchangeCode(code) {
  if (!localMode) {
    const response = await fetch('/exchange', {
      method: 'POST', credentials: 'omit',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({code}),
    });
    const body = await response.json();
    if (!response.ok || typeof body.accessToken !== 'string' || !body.accessToken) throw new Error();
    return body.accessToken;
  }
  const response = await fetch(localOAuth.tokenUrl, {
    method: 'POST', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: localOAuth.clientId,
      client_secret: localOAuth.clientSecret,
      redirect_uri: localOAuth.origin,
      code,
    }),
  });
  const body = await response.json();
  if (!response.ok || typeof body.access_token !== 'string' || !body.access_token) throw new Error();
  return body.access_token;
}
function beginLogin() {
  try {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const random = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    sessionStorage.setItem(oauthKey, random);
    location.assign(authorizeUrl('token:' + random));
  } catch { say('Браузер не сохранил данные для входа. Проверьте настройки и попробуйте ещё раз.'); }
}
add.onclick = beginLogin;
document.querySelector('#empty-add').onclick = beginLogin;
reveal.onclick = () => { visible = !visible; render(); };
copy.onclick = async () => {
  const selected = current();
  if (!selected) return;
  try {
    await navigator.clipboard.writeText(selected.accessToken);
    copy.textContent = 'Скопировано';
    say('');
  } catch {
    visible = true;
    render();
    token.focus();
    token.select();
    say('Копирование не сработало. Токен выделен, скопируйте его вручную.');
  }
};
remove.onclick = () => {
  const selected = current();
  if (!selected || !confirm('Удалить токен из этого браузера? Доступ в ZenMoney не отзывается.')) return;
  if (selected.id === 0) {
    temporaryToken = null;
    activeId = accounts[0]?.id || null;
  } else {
    const next = accounts.filter(account => account.id !== selected.id);
    const nextId = next[0]?.id || null;
    if (!save(next, nextId)) { say('Браузер не удалил токен. Попробуйте ещё раз.'); return; }
    accounts = next;
    activeId = nextId;
  }
  visible = false;
  render();
  say('Токен удален из браузера');
};
render();

(async () => {
  const params = new URLSearchParams(location.search);
  if (!['code', 'state', 'error'].some(key => params.has(key))) return;
  history.replaceState(null, '', location.pathname);
  let expected = null;
  try {
    expected = sessionStorage.getItem(oauthKey);
    sessionStorage.removeItem(oauthKey);
  } catch {}
  if (!expected || params.get('state') !== 'token:' + expected) { say('Проверка входа не прошла. Начните заново.'); return; }
  if (params.has('error') || !params.get('code')) { say('Вход не завершён. Начните заново.'); return; }
  try {
    say('Получаем токен…');
    const accessToken = await exchangeCode(params.get('code'));
    let profile;
    try {
      const verified = await fetch('https://api.zenmoney.ru/v8/diff/', {
        method: 'POST', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: {authorization: 'Bearer ' + accessToken, 'content-type': 'application/json'},
        body: JSON.stringify({serverTimestamp: 0, currentClientTimestamp: Math.floor(Date.now() / 1000), forceFetch: ['user']}),
        signal: AbortSignal.timeout(15000),
      });
      if (!verified.ok) throw new Error();
      const data = await verified.json();
      const users = Array.isArray(data?.user) ? data.user.filter(user => user?.parent === null) : [];
      const user = users[0];
      if (users.length !== 1 || !Number.isSafeInteger(user?.id) || user.id <= 0 || typeof user.login !== 'string') throw new Error();
      profile = {id: user.id, login: user.login, accessToken};
    } catch {
      temporaryToken = accessToken;
      activeId = 0;
      visible = false;
      render();
      say('Токен получен, но аккаунт не определён. Скопируйте токен до обновления или закрытия страницы.');
      return;
    }
    const next = [profile, ...accounts.filter(account => account.id !== profile.id)];
    const saved = save(next, profile.id);
    accounts = next;
    activeId = profile.id;
    temporaryToken = null;
    visible = false;
    render();
    say(saved ? 'Токен сохранён в этом браузере.' : 'Браузер не сохранил токен. Скопируйте его до обновления страницы.');
  } catch { say('Не удалось получить токен. Начните вход заново.'); }
})();
