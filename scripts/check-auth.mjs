import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { transformWithEsbuild } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ReactRouter from 'react-router-dom';

// Exercise the production components without a browser or a test-only dependency.
// The hook runner preserves state and effects; requests, cookies and cache are mocked.
const projectRoot = new URL('../', import.meta.url);
const jsx = (type, props, ...children) => ({
  type,
  props: { ...props, ...(children.length ? { children } : {}) },
});
const fragment = Symbol('Fragment');
const tick = () => new Promise(resolve => setImmediate(resolve));

function createHookRunner() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = new Map();
  const sameDependencies = (previous, next) => previous && next &&
    previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]));
  const hooks = {
    createContext: value => ({ Provider: Symbol('Provider'), value }),
    useContext: context => context.value,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!sameDependencies(slots[index], dependencies)) effects.push({ index, callback });
      slots[index] = dependencies;
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!slots[index] || !sameDependencies(slots[index].dependencies, dependencies)) {
        slots[index] = { callback, dependencies };
      }
      return slots[index].callback;
    },
  };
  return {
    hooks,
    render(callback) {
      cursor = 0;
      return callback();
    },
    async flushEffects() {
      const pending = effects;
      effects = [];
      pending.forEach(({ index, callback }) => {
        cleanups.get(index)?.();
        cleanups.set(index, callback());
      });
      await tick();
    },
    unmount() {
      cleanups.forEach(cleanup => cleanup?.());
      cleanups.clear();
    },
  };
}

async function loadSource(relativePath, dependencies, globals = {}) {
  const filename = fileURLToPath(new URL(relativePath, projectRoot));
  const source = await readFile(filename, 'utf8');
  const { code } = await transformWithEsbuild(source, filename, {
    loader: relativePath.endsWith('.jsx') ? 'jsx' : 'js',
    format: 'cjs',
    jsxFactory: '__jsx',
    jsxFragment: '__fragment',
    define: { 'import.meta.env.MODE': '"production"' },
  });
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require(id) {
      assert.ok(id in dependencies, `Unexpected import ${id} in ${relativePath}`);
      return dependencies[id];
    },
    __jsx: jsx,
    __fragment: fragment,
    console: { error() {}, warn() {}, log() {} },
    ...globals,
  }, { filename });
  return module.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

async function mountAuth({ result, error = result ? null : { response: { status: 401 } } } = {}) {
  const runner = createHookRunner();
  const storage = new Map([['ph_sports_access_token', 'legacy-token'], ['token', 'older-token']]);
  const localStorage = {
    getItem() { throw new Error('Authentication must not read browser tokens'); },
    setItem() { throw new Error('Authentication must not store credentials in browser storage'); },
    removeItem: key => storage.delete(key),
  };
  const location = { href: '/', pathname: '/', search: '', hash: '' };
  const listeners = new Map();
  const window = {
    localStorage, location,
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  const calls = [];
  const cacheEvents = [];
  let get = () => error ? Promise.reject(error) : Promise.resolve(result);
  let post = () => Promise.resolve();
  const apiClient = {
    get(path) { calls.push({ method: 'GET', path }); return get(path); },
    post(path, data) { calls.push({ method: 'POST', path, data }); return post(path, data); },
  };
  const { AuthProvider } = await loadSource('src/api/lib/AuthContext.jsx', {
    react: runner.hooks,
    '@/apiClient': { default: apiClient, __esModule: true },
    '@/lib/query-client': { queryClientInstance: {
      cancelQueries() { cacheEvents.push('cancel'); },
      clear() { cacheEvents.push('clear'); },
    } },
  }, { localStorage, window });
  const render = () => runner.render(() => AuthProvider({ children: null })).props.value;
  render();
  await runner.flushEffects();
  return {
    render,
    calls,
    storage,
    cacheEvents,
    setGet: callback => { get = callback; },
    setPost: callback => { post = callback; },
    expireSession: () => listeners.get('ph-sports:session-expired')?.(),
    unmount: () => runner.unmount(),
    listeners,
  };
}

let passed = 0;
async function check(name, callback) {
  await callback();
  passed++;
  console.log(`✓ ${name}`);
}

const student = { id: 'student-1', role: 'student', email: 'student@example.test', profile_complete: true };
const otherStudent = { ...student, id: 'student-2', email: 'another@example.test' };

await check('a guest checks the cookie session and finishes signed out', async () => {
  const auth = await mountAuth();
  const state = auth.render();
  assert.equal(state.isLoadingAuth, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.authError?.type, 'auth_required');
  assert.deepEqual(auth.calls, [{ method: 'GET', path: '/auth/me' }]);
  assert.equal(auth.storage.size, 0, 'Legacy browser tokens are removed');
});

for (const status of [403, 500]) {
  await check(`HTTP ${status} ends loading with a recoverable account error`, async () => {
    const auth = await mountAuth({ error: { response: { status } } });
    const state = auth.render();
    assert.equal(state.isLoadingAuth, false);
    assert.equal(state.user, null);
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.authError?.type, 'auth_error');
  });
}

for (const error of [new Error('Network Error'), { code: 'ECONNABORTED', message: 'timeout' }]) {
  await check(`${error.message} ends loading with a recoverable error`, async () => {
    const auth = await mountAuth({ error });
    assert.equal(auth.render().isLoadingAuth, false);
    assert.equal(auth.render().user, null);
    assert.equal(auth.render().authError?.type, 'auth_error');
  });
}

await check('a valid cookie session returns the authenticated user', async () => {
  const auth = await mountAuth({ result: student });
  assert.equal(auth.render().user, student);
  assert.equal(auth.render().isAuthenticated, true);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError, null);
});

await check('retry clears an error while waiting and accepts the refreshed user', async () => {
  const auth = await mountAuth({ error: new Error('Network Error') });
  const response = deferred();
  auth.setGet(() => response.promise);
  const refresh = auth.render().checkUserAuth();
  assert.equal(auth.render().isLoadingAuth, true);
  assert.equal(auth.render().authError, null);
  response.resolve(student);
  assert.equal(await refresh, student);
  assert.equal(auth.render().user, student);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError, null);
});

await check('an expired refresh removes both user and account cache', async () => {
  const auth = await mountAuth({ result: student });
  const before = auth.cacheEvents.length;
  auth.setGet(() => Promise.reject({ response: { status: 401 } }));
  assert.equal(await auth.render().checkUserAuth(), null);
  assert.equal(auth.render().user, null);
  assert.equal(auth.render().isAuthenticated, false);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError?.type, 'auth_required');
  assert.deepEqual(auth.cacheEvents.slice(before), ['cancel', 'clear']);
});

for (const [method, path, credentials] of [
  ['login', '/auth/login', { email: student.email, password: 'a long private password' }],
  ['register', '/auth/register', { email: student.email, password: 'a long private password', full_name: 'A Student' }],
]) {
  await check(`${method} sends credentials to its endpoint and accepts the new session`, async () => {
    const auth = await mountAuth();
    const response = deferred();
    auth.setPost(() => response.promise);
    const pending = auth.render()[method](credentials);
    await tick();
    assert.equal(auth.render().isLoadingAuth, true);
    assert.equal(auth.render().authError, null);
    assert.deepEqual(auth.calls.at(-1), { method: 'POST', path, data: credentials });
    response.resolve(student);
    assert.equal(await pending, student);
    assert.equal(auth.render().user, student);
    assert.equal(auth.render().isAuthenticated, true);
    assert.equal(auth.render().isLoadingAuth, false);
    assert.equal(auth.render().authError, null);
  });
}

await check('failed credentials are reported and cannot leave a signed-in user', async () => {
  const auth = await mountAuth();
  const error = { response: { status: 401, data: { error: 'Email or password is incorrect.' } } };
  auth.setPost(() => Promise.reject(error));
  await assert.rejects(auth.render().login({ email: student.email, password: 'wrong' }), actual => actual === error);
  assert.equal(auth.render().user, null);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.match(auth.render().authError.message, /Email or password is incorrect/);
});

await check('refreshing one account preserves cache, but switching accounts clears it', async () => {
  const auth = await mountAuth({ result: student });
  const baseline = auth.cacheEvents.length;
  auth.setGet(() => Promise.resolve({ ...student, full_name: 'Updated Name' }));
  await auth.render().checkUserAuth();
  assert.equal(auth.cacheEvents.length, baseline);
  auth.setPost(() => Promise.resolve(otherStudent));
  await auth.render().login({ email: otherStudent.email, password: 'a long private password' });
  assert.equal(auth.render().user, otherStudent);
  assert.ok(auth.cacheEvents.length > baseline);
  assert.deepEqual(auth.cacheEvents.slice(baseline, baseline + 2), ['cancel', 'clear']);
});

await check('logout waits for server revocation before completing and clears account data', async () => {
  const auth = await mountAuth({ result: student });
  const response = deferred();
  auth.setPost(() => response.promise);
  const before = auth.cacheEvents.length;
  const pending = auth.render().logout();
  await tick();
  assert.equal(auth.render().isLoadingAuth, true);
  assert.equal(auth.render().user, student);
  assert.deepEqual(auth.calls.at(-1), { method: 'POST', path: '/auth/logout', data: undefined });
  response.resolve();
  assert.equal(await pending, true);
  assert.equal(auth.render().user, null);
  assert.equal(auth.render().isAuthenticated, false);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError?.type, 'auth_required');
  assert.deepEqual(auth.cacheEvents.slice(before), ['cancel', 'clear']);
});

await check('failed logout keeps the active account and reports that revocation failed', async () => {
  const auth = await mountAuth({ result: student });
  auth.setPost(() => Promise.reject(new Error('Network Error')));
  const before = auth.cacheEvents.length;
  assert.equal(await auth.render().logout(), false);
  assert.equal(auth.render().user, student);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError?.type, 'auth_error');
  assert.match(auth.render().authError.message, /Sign-out did not complete/);
  assert.equal(auth.cacheEvents.length, before);
});

await check('logout prevents a late account response from signing the user back in', async () => {
  const auth = await mountAuth({ result: student });
  const response = deferred();
  auth.setGet(() => response.promise);
  const refresh = auth.render().checkUserAuth();
  await tick();
  assert.equal(await auth.render().logout(), true);
  response.resolve(student);
  assert.equal(await refresh, null);
  assert.equal(auth.render().user, null);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError?.type, 'auth_required');
});

await check('logout is serialized after a pending login so late Set-Cookie cannot restore it', async () => {
  const auth = await mountAuth();
  const response = deferred();
  let serverSession = null;
  auth.setPost((path) => {
    if (path === '/auth/login') return response.promise.then(user => { serverSession = user.id; return user; });
    assert.equal(path, '/auth/logout');
    serverSession = null;
    return Promise.resolve();
  });
  const login = auth.render().login({ email: student.email, password: 'a long private password' });
  await tick();
  const logout = auth.render().logout();
  await tick();
  assert.deepEqual(auth.calls.filter(call => call.method === 'POST').map(call => call.path), ['/auth/login']);
  response.resolve(student);
  assert.equal(await login, null);
  assert.equal(await logout, true);
  assert.equal(serverSession, null);
  assert.equal(auth.render().user, null);
  assert.deepEqual(auth.calls.filter(call => call.method === 'POST').map(call => call.path), ['/auth/login', '/auth/logout']);
});

await check('a refresh waits for an in-flight login and reads its final cookie session', async () => {
  const auth = await mountAuth();
  const response = deferred();
  auth.setPost(() => response.promise);
  auth.setGet(() => Promise.resolve(student));
  const login = auth.render().login({ email: student.email, password: 'a long private password' });
  await tick();
  const refresh = auth.render().checkUserAuth();
  await tick();
  assert.equal(auth.calls.filter(call => call.method === 'GET').length, 1);
  response.resolve(student);
  assert.equal(await login, null);
  assert.equal(await refresh, student);
  assert.equal(auth.render().user, student);
});

await check('an older failed request cannot overwrite a more recent successful refresh', async () => {
  const auth = await mountAuth({ result: student });
  const older = deferred();
  auth.setGet(() => older.promise);
  const oldRefresh = auth.render().checkUserAuth();
  await tick();
  auth.setGet(() => Promise.resolve(otherStudent));
  assert.equal(await auth.render().checkUserAuth(), otherStudent);
  older.reject({ response: { status: 401 } });
  assert.equal(await oldRefresh, null);
  assert.equal(auth.render().user, otherStudent);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError, null);
});

await check('an expired feature session clears account data and invalidates pending refreshes', async () => {
  const auth = await mountAuth({ result: student });
  const response = deferred();
  auth.setGet(() => response.promise);
  const refresh = auth.render().checkUserAuth();
  await tick();
  const before = auth.cacheEvents.length;
  auth.expireSession();
  response.resolve(student);
  assert.equal(await refresh, null);
  assert.equal(auth.render().user, null);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError?.type, 'auth_required');
  assert.deepEqual(auth.cacheEvents.slice(before), ['cancel', 'clear']);
});

await check('a stale feature 401 cannot cancel a new sign-in after account data was cleared', async () => {
  const auth = await mountAuth({ result: student });
  const response = deferred();
  auth.setPost(() => response.promise);
  const login = auth.render().login({ email: otherStudent.email, password: 'a long private password' });
  await tick();
  const before = auth.cacheEvents.length;
  auth.expireSession();
  assert.equal(auth.render().isLoadingAuth, true);
  assert.equal(auth.render().authError, null);
  assert.equal(auth.cacheEvents.length, before);
  response.resolve(otherStudent);
  assert.equal(await login, otherStudent);
  assert.equal(auth.render().user, otherStudent);
  assert.equal(auth.render().isAuthenticated, true);
  assert.equal(auth.render().isLoadingAuth, false);
  assert.equal(auth.render().authError, null);
});

await check('unmount removes the expiry listener and ignores late account results', async () => {
  const response = deferred();
  const auth = await mountAuth({ result: response.promise });
  auth.unmount();
  response.resolve(student);
  await tick();
  assert.equal(auth.listeners.size, 0);
  assert.equal(auth.render().user, null);
});

await check('malformed account responses end loading with a recoverable error', async () => {
  for (const result of [{}, { email: ' ' }, null]) {
    const auth = await mountAuth({ result, error: null });
    assert.equal(auth.render().user, null);
    assert.equal(auth.render().isLoadingAuth, false);
    assert.equal(auth.render().authError?.type, 'auth_error');
  }
});

await check('API requests use same-origin cookies, CSRF header and a finite timeout', async () => {
  let options;
  let responseHandlers;
  const events = [];
  const client = { interceptors: { response: { use(...handlers) { responseHandlers = handlers; } } } };
  await loadSource('src/api/apiClient.js', {
    axios: { create(config) { options = config; return client; } },
  }, { window: { dispatchEvent(event) { events.push(event.type); } }, Event });
  assert.equal(options.timeout, 15_000);
  assert.equal(options.baseURL, '/api');
  assert.equal(options.withCredentials, true);
  assert.equal(options.headers['X-PH-Sports-Request'], '1');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers.Authorization, undefined);
  assert.deepEqual(responseHandlers[0]({ data: student }), student);
  for (const url of ['/auth/me', '/auth/login', '/auth/register', '/auth/logout']) {
    await assert.rejects(responseHandlers[1]({ response: { status: 401 }, config: { url } }));
  }
  assert.equal(events.length, 0, 'Auth form errors do not expire another request');
  await assert.rejects(responseHandlers[1]({ response: { status: 401 }, config: { url: '/teams' } }));
  assert.deepEqual(events, ['ph-sports:session-expired']);
  await assert.rejects(responseHandlers[1]({ response: { status: 403 }, config: { url: '/admin' } }));
  assert.equal(events.length, 1, 'A permission denial does not sign out a valid session');
});

// Use the production route matcher and components with inert page sentinels.
// Rendering a feature sentinel is equivalent to mounting its data-fetching page.
const passthrough = ({ children }) => children;
let currentAuth;
let authWrites = 0;
let retries = 0;
let signOuts = 0;
let location;
let mountedPages;
let buttons;
let redirects;
let profileSetup;
const retry = async () => { retries++; return student; };
const signOut = async () => { signOuts++; return true; };
const reactGlobals = { __jsx: React.createElement, __fragment: React.Fragment, URLSearchParams };
const ui = {
  '@/components/ui/card': { Card: passthrough, CardContent: passthrough },
  '@/components/ui/button': {
    Button: props => {
      buttons.push(props);
      return React.createElement('button', { type: props.type, onClick: props.onClick, disabled: props.disabled }, props.children);
    },
  },
  '@/components/ui/input': { Input: props => React.createElement('input', props) },
  '@/components/ui/label': { Label: props => React.createElement('label', props) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
};
const router = {
  ...ReactRouter,
  BrowserRouter: ({ children }) => React.createElement(ReactRouter.Router, {
    location,
    navigator: { createHref: to => typeof to === 'string' ? to : ReactRouter.createPath(to) },
    static: true,
  }, children),
  Navigate: props => { redirects.push(props); return null; },
};
const authModule = { AuthProvider: passthrough, useAuth: () => currentAuth };
const loginModule = await loadSource('src/api/pages/Login.jsx', {
  ...ui,
  react: React,
  'react-router-dom': router,
  '@/lib/AuthContext': authModule,
}, reactGlobals);
const pageSentinel = name => () => {
  mountedPages.push(name);
  return React.createElement('div', { 'data-page': name }, name);
};
const appDependencies = {
  ...ui,
  react: React,
  '@/components/ui/toaster': { Toaster: () => null },
  sonner: { Toaster: () => null },
  '@tanstack/react-query': { QueryClientProvider: passthrough },
  '@/lib/query-client': { queryClientInstance: {} },
  'react-router-dom': router,
  './lib/PageNotFound': { default: pageSentinel('PageNotFound'), __esModule: true },
  '@/lib/AuthContext': authModule,
  '@/components/UserNotRegisteredError': { default: pageSentinel('UserNotRegisteredError'), __esModule: true },
  '@/components/layout/AppLayout': { default: () => React.createElement(ReactRouter.Outlet), __esModule: true },
  '@/pages/Landing': { default: pageSentinel('Landing'), __esModule: true },
  '@/pages/Login': loginModule,
  '@/pages/ProfileSetup': {
    default: props => { profileSetup = props; return React.createElement('div', null, 'ProfileSetup'); },
    __esModule: true,
  },
  '@/api': { api: { auth: { updateMe() { authWrites++; }, logout: signOut } } },
};
for (const page of ['Dashboard', 'Teams', 'TrainingLog', 'VenueBooking',
  'ManageRequests', 'StudentProfile', 'AdminDashboard']) {
  appDependencies[`@/pages/${page}`] = { default: pageSentinel(page), __esModule: true };
}
const { default: App } = await loadSource('src/api/App.jsx', appDependencies, reactGlobals);
function renderApp(state = {}, path = '/') {
  const url = new URL(path, 'https://phsports.example.test');
  location = { pathname: url.pathname, search: url.search, hash: url.hash };
  mountedPages = [];
  buttons = [];
  redirects = [];
  profileSetup = null;
  currentAuth = {
    user: null,
    authError: null,
    isLoadingAuth: false,
    checkUserAuth: retry,
    logout: signOut,
    login: async () => student,
    register: async () => student,
    navigateToLogin() { throw new Error('Must not redirect to an unimplemented login route'); },
    ...state,
  };
  return renderToStaticMarkup(React.createElement(App));
}

await check('guests can preview the homepage during missing, expired, loading and failed sessions', () => {
  for (const state of [{}, { authError: { type: 'auth_required' } }, { isLoadingAuth: true },
    { authError: { type: 'auth_error' } }]) {
    renderApp(state);
    assert.deepEqual(mountedPages, ['Landing']);
    assert.equal(redirects.length, 0);
  }
});

await check('the preview remains available to signed-in users at /home', () => {
  renderApp({ user: student }, '/home');
  assert.deepEqual(mountedPages, ['Landing']);
  assert.equal(redirects.length, 0);
});

await check('every feature requires authentication before its page can mount', () => {
  for (const path of ['/dashboard', '/teams', '/training', '/booking', '/requests', '/profile', '/admin']) {
    for (const authError of [null, { type: 'auth_required' }, { type: 'auth_error' }]) {
      renderApp({ authError }, path);
      assert.deepEqual(mountedPages, []);
      assert.equal(redirects.length, 1);
      assert.equal(redirects[0].to, `/login?redirect=${encodeURIComponent(path)}`);
      assert.equal(redirects[0].replace, true);
    }
  }
});

await check('login redirects preserve the requested feature, query and fragment', () => {
  const destination = '/booking?venue=court#availability';
  renderApp({}, destination);
  assert.equal(redirects[0].to, `/login?redirect=${encodeURIComponent(destination)}`);
  renderApp({ user: student }, redirects[0].to);
  assert.equal(redirects[0].to, destination);
});

await check('protected pages show loading while an auth request is pending', () => {
  const html = renderApp({ isLoadingAuth: true }, '/teams');
  assert.match(html, /Loading your account/);
  assert.match(html, /animate-spin/);
  assert.deepEqual(mountedPages, []);
  assert.equal(redirects.length, 0);
});

await check('the login screen offers real email/password sign-in, registration and preview', () => {
  for (const authError of [null, { type: 'auth_required' }]) {
    const html = renderApp({ authError }, '/login?redirect=%2Fteams');
    assert.match(html, /Welcome back/);
    assert.match(html, /type="email"/);
    assert.match(html, /type="password"/);
    assert.match(html, /Create an account/);
    assert.match(html, /href="\/home"/);
    assert.deepEqual(mountedPages, []);
    assert.doesNotMatch(html, /sign-in link|Select your role/);
  }
});

await check('login submission is disabled while checking an existing cookie session', () => {
  const html = renderApp({ isLoadingAuth: true }, '/login');
  assert.match(html, /Please wait/);
  assert.equal(buttons.find(props => props.type === 'submit').disabled, true);
});

await check('server and network failures retain a working form and session retry', async () => {
  const html = renderApp({ authError: { type: 'auth_error', message: 'Please try again.' } }, '/login');
  assert.match(html, /Please try again/);
  assert.match(html, /type="password"/);
  const button = buttons.find(props => props.children === 'Check your existing session again');
  assert.ok(button);
  await button.onClick();
  assert.equal(retries, 1);
});

await check('login destinations reject external URLs, unknown routes and redirect loops', () => {
  for (const destination of ['https://example.test', '//example.test', '/\\example.test',
    '/login', '/home', '/unknown', '/%2Fexample.test', 'javascript:alert(1)']) {
    const search = `?redirect=${encodeURIComponent(destination)}`;
    assert.equal(loginModule.getLoginDestination(search), '/dashboard');
    renderApp({ user: student }, `/login${search}`);
    assert.equal(redirects[0].to, '/dashboard');
  }
  assert.equal(loginModule.getLoginDestination(''), '/dashboard');
  assert.equal(loginModule.getLoginDestination('?redirect=%2Fteams%3Fsport%3Drowing%23members'), '/teams?sport=rowing#members');
});

await check('unregistered-user handling remains available', () => {
  renderApp({ authError: { type: 'user_not_registered' } }, '/dashboard');
  assert.deepEqual(mountedPages, ['UserNotRegisteredError']);
});

await check('incomplete profiles refresh authentication after setup', async () => {
  renderApp({ user: { ...student, profile_complete: false } }, '/teams');
  assert.ok(profileSetup);
  assert.deepEqual(mountedPages, []);
  assert.equal(await profileSetup.onComplete(), student);
  assert.equal(retries, 2);
});

await check('teachers cannot mount features without explicit approval and can sign out', async () => {
  for (const status of ['pending', 'rejected', null, undefined]) {
    const html = renderApp({ user: { ...student, role: 'teacher', teacher_status: status } }, '/teams');
    assert.match(html, status === 'rejected' ? /Registration not approved/ : /Awaiting Approval/);
    assert.deepEqual(mountedPages, []);
    const button = buttons.find(props => props.children === 'Sign Out');
    assert.ok(button);
    await button.onClick();
  }
  assert.equal(signOuts, 4);
});

await check('signed-in root visitors are sent to the protected dashboard', () => {
  renderApp({ user: student });
  assert.deepEqual(mountedPages, []);
  assert.equal(redirects.length, 1);
  assert.equal(redirects[0].to, '/dashboard');
  assert.equal(redirects[0].replace, true);
});

await check('complete students and admins enter their dashboard without render-time writes', () => {
  for (const user of [student, { ...student, role: 'admin', profile_complete: false }]) {
    renderApp({ user }, '/dashboard');
    assert.deepEqual(mountedPages, ['Dashboard']);
    assert.equal(profileSetup, null);
  }
  assert.equal(authWrites, 0);
});

await check('complete students can enter their permitted feature routes', () => {
  for (const [path, page] of [['/dashboard', 'Dashboard'], ['/teams', 'Teams'], ['/training', 'TrainingLog'],
    ['/booking', 'VenueBooking'], ['/profile', 'StudentProfile']]) {
    renderApp({ user: student }, path);
    assert.deepEqual(mountedPages, [page]);
    assert.equal(redirects.length, 0);
  }
});

await check('an admin-looking email cannot bypass profile setup or role authorization', () => {
  const user = { ...student, email: 'admin@phsports.edu', profile_complete: false };
  renderApp({ user }, '/admin');
  assert.ok(profileSetup);
  assert.deepEqual(mountedPages, []);
  renderApp({ user: { ...user, profile_complete: true } }, '/admin');
  assert.deepEqual(mountedPages, []);
  assert.equal(redirects[0].to, '/dashboard');
});

await check('incomplete student and approved teacher profiles cannot mount any feature', () => {
  for (const user of [{ ...student, profile_complete: false },
    { ...student, role: 'teacher', teacher_status: 'approved', profile_complete: false }]) {
    for (const path of ['/dashboard', '/teams', '/training', '/booking', '/requests', '/profile', '/admin']) {
      renderApp({ user }, path);
      assert.ok(profileSetup);
      assert.deepEqual(mountedPages, []);
    }
  }
});

await check('role guards hold for route case and trailing slash variants', () => {
  for (const path of ['/admin', '/admin/', '/ADMIN', '/requests', '/requests/', '/REQUESTS']) {
    renderApp({ user: student }, path);
    assert.deepEqual(mountedPages, []);
    assert.equal(redirects[0].to, '/dashboard');
    assert.equal(redirects[0].replace, true);
  }
  const teacher = { ...student, role: 'teacher', teacher_status: 'approved' };
  renderApp({ user: teacher }, '/requests');
  assert.deepEqual(mountedPages, ['ManageRequests']);
  renderApp({ user: teacher }, '/admin');
  assert.deepEqual(mountedPages, []);
  assert.equal(redirects[0].to, '/dashboard');
  for (const [path, page] of [['/admin/', 'AdminDashboard'], ['/REQUESTS', 'ManageRequests']]) {
    renderApp({ user: { ...student, role: 'admin' } }, path);
    assert.deepEqual(mountedPages, [page]);
  }
});

// Exercise the production form handlers with editable hook state. Browser-native
// required/email checks remain browser concerns; these cases verify app behavior.
async function mountLogin({ login = async () => student, register = async () => student } = {}) {
  const runner = createHookRunner();
  const components = {
    ...ui,
    react: runner.hooks,
    'react-router-dom': { Link: Symbol('Link'), Navigate: Symbol('Navigate'), useLocation: () => ({ search: '?redirect=%2Fteams' }) },
    '@/lib/AuthContext': { useAuth: () => ({ user: null, authError: null, isLoadingAuth: false, login, register }) },
  };
  const { default: Login } = await loadSource('src/api/pages/Login.jsx', components, { URLSearchParams });
  const render = () => runner.render(() => Login());
  const collect = (node, result = []) => {
    if (Array.isArray(node)) node.forEach(child => collect(child, result));
    else if (node && typeof node === 'object') { result.push(node); collect(node.props?.children, result); }
    return result;
  };
  const textContent = node => Array.isArray(node) ? node.map(textContent).join('')
    : node && typeof node === 'object' ? textContent(node.props?.children)
      : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  const find = predicate => {
    const node = collect(render()).find(predicate);
    assert.ok(node, 'Expected form element exists');
    return node;
  };
  return {
    find,
    text: () => textContent(render()),
    nodes: () => collect(render()),
    field: name => find(node => node.props?.name === name),
    change(name, value) { find(node => node.props?.name === name).props.onChange({ target: { value } }); },
    toggle() { find(node => node.type === 'button' && ['Create an account', 'Sign in'].includes(textContent(node))).props.onClick(); },
    submit: () => find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
  };
}

await check('the sign-in form submits an email and password without a role or token', async () => {
  const calls = [];
  const form = await mountLogin({ login: async credentials => { calls.push(credentials); return student; } });
  form.change('email', ' student@example.test ');
  form.change('password', ' keep this password exactly ');
  await form.submit();
  assert.deepEqual(Object.keys(calls[0]).sort(), ['email', 'password']);
  assert.equal(calls[0].email, student.email);
  assert.equal(calls[0].password, ' keep this password exactly ');
  assert.equal(form.field('password').props.value, '');
  assert.equal(form.field('password').props.autoComplete, 'current-password');
  assert.equal(form.nodes().some(node => node.type === 'select'), false);
});

await check('registration requires matching passwords before sending any request', async () => {
  let requests = 0;
  const form = await mountLogin({ register: async () => { requests++; return student; } });
  form.toggle();
  form.change('name', 'A Student');
  form.change('password', 'a sufficiently long password');
  form.change('confirmation', 'a different long password');
  await form.submit();
  assert.equal(requests, 0);
  assert.match(form.text(), /passwords do not match/);
  assert.equal(form.field('password').props.autoComplete, 'new-password');
  assert.ok(form.field('name').props.required);
});

await check('registration rejects whitespace-only names before sending any request', async () => {
  const calls = [];
  const form = await mountLogin({ register: async credentials => { calls.push(credentials); return student; } });
  form.toggle();
  form.change('email', student.email);
  form.change('password', 'a sufficiently long password');
  form.change('confirmation', 'a sufficiently long password');
  for (const name of ['', '   ', '\t\n', '\u3000\u00a0']) {
    form.change('name', name);
    await form.submit();
    assert.match(form.text(), /enter your full name/);
    assert.equal(calls.length, 0);
  }
  form.change('name', ' A Student ');
  await form.submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].full_name, 'A Student');
});

await check('registration enforces 15–128 Unicode characters and sends the account name', async () => {
  const calls = [];
  const form = await mountLogin({ register: async credentials => { calls.push(credentials); return student; } });
  form.toggle();
  form.change('name', ' A Student ');
  form.change('email', ' student@example.test ');
  for (const password of ['a'.repeat(14), 'a'.repeat(129), '🛶'.repeat(14)]) {
    form.change('password', password);
    form.change('confirmation', password);
    await form.submit();
    assert.match(form.text(), /between 15 and 128/);
    assert.equal(calls.length, 0);
  }
  for (const password of ['🛶'.repeat(15), 'a'.repeat(128)]) {
    form.change('password', password);
    form.change('confirmation', password);
    await form.submit();
    assert.equal(calls.at(-1).password, password);
    assert.equal(calls.at(-1).full_name, 'A Student');
    assert.equal(calls.at(-1).email, student.email);
  }
  assert.equal(calls.length, 2);
});

await check('failed sign-in displays the server message and enables another attempt', async () => {
  const response = deferred();
  const form = await mountLogin({ login: () => response.promise });
  form.change('email', student.email);
  form.change('password', 'a long private password');
  const pending = form.submit();
  assert.equal(form.field('email').props.disabled, true);
  assert.equal(form.find(node => node.type === 'form').props['aria-busy'], true);
  response.reject({ response: { data: { error: 'Email or password is incorrect.' } } });
  await pending;
  assert.match(form.text(), /Email or password is incorrect/);
  assert.equal(form.field('email').props.disabled, false);
  assert.equal(form.find(node => node.type === 'form').props['aria-busy'], false);
});

await check('switching between sign-in and registration clears password fields', async () => {
  const form = await mountLogin();
  form.change('password', 'a long private password');
  form.toggle();
  assert.equal(form.field('password').props.value, '');
  form.change('password', 'another private password');
  form.change('confirmation', 'another private password');
  form.toggle();
  assert.equal(form.field('password').props.value, '');
  assert.equal(form.nodes().some(node => node.props?.name === 'confirmation'), false);
});

console.log(`Authentication regression checks passed: ${passed}`);
