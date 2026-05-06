import http from 'node:http'
import { config } from './config.js'
import { loadCards } from './cards.js'
import { buildIndex } from './indexBuilder.js'
import { navigationSearch } from './search.js'
import type { SearchRequest } from './types.js'

const cards = await loadCards(config.cardsPath)
const index = await buildIndex(cards)

const server = http.createServer(async (request, response) => {
  try {
    setCorsHeaders(response)

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'ai-navigation-service',
        cards: cards.length,
        embedding_model: config.embeddingModel,
        embedding_mock: config.embeddingMock,
      })
      return
    }

    if (request.method === 'POST' && request.url === '/api/navigation-search') {
      const body = (await readJson(request)) as SearchRequest
      const result = await navigationSearch(body.query ?? '', cards, index)
      sendJson(response, 200, result)
      return
    }

    sendJson(response, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(response, 500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

server.listen(config.port, '0.0.0.0', () => {
  console.log(`ai-navigation-service listening on :${config.port}`)
})

function setCorsHeaders(response: http.ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

async function readJson(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
