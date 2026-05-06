const baseUrl = process.env.AI_NAVIGATION_URL ?? 'http://localhost:3001'

const cases = [
  {
    name: 'health',
    run: async () => {
      const response = await fetch(`${baseUrl}/health`)
      const json = await response.json()
      assert(response.ok, 'health response must be ok')
      assert(json.status === 'ok', `expected health ok, got ${JSON.stringify(json)}`)
      return json
    },
  },
  {
    name: 'login redirect',
    query: 'войти',
    expect: (json) => json.action === 'redirect' && json.target?.url === '/',
  },
  {
    name: 'register redirect',
    query: 'регистрация',
    expect: (json) => json.action === 'redirect' && json.target?.url === '/register',
  },
  {
    name: 'account suggest',
    query: 'аккаунт',
    expect: (json) => json.action === 'suggest' && Array.isArray(json.suggestions) && json.suggestions.length > 0,
  },
  {
    name: 'fallback',
    query: 'абсолютно непонятный запрос без смысла',
    expect: (json) => json.action === 'fallback',
  },
]

for (const testCase of cases) {
  if (testCase.run) {
    await testCase.run()
    console.log(`ok ${testCase.name}`)
    continue
  }

  const response = await fetch(`${baseUrl}/api/navigation-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: testCase.query, locale: 'ru' }),
  })
  const json = await response.json()
  assert(response.ok, `${testCase.name}: response must be ok`)
  assert(testCase.expect(json), `${testCase.name}: unexpected response ${JSON.stringify(json)}`)
  console.log(`ok ${testCase.name}`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}
