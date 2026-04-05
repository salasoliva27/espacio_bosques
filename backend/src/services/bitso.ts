import crypto from 'crypto'
import { BITSO_BASE_URL } from '../config/mode'

const KEY = process.env.BITSO_API_KEY!
const SECRET = process.env.BITSO_API_SECRET!

function auth(method: string, path: string, body = '') {
  const nonce = Date.now().toString()
  const msg = `${nonce}${method}${path}${body}`
  const sig = crypto.createHmac('sha256', SECRET).update(msg).digest('hex')
  return `Bitso ${KEY}:${nonce}:${sig}`
}

async function req(method: string, path: string, body?: object) {
  const b = body ? JSON.stringify(body) : ''
  const res = await fetch(`${BITSO_BASE_URL}${path}`, {
    method,
    headers: { Authorization: auth(method, path, b), 'Content-Type': 'application/json' },
    body: b || undefined
  })
  return res.json()
}

export async function getEthMxnRate(): Promise<number> {
  const d = await req('GET', '/ticker/?book=eth_mxn')
  return parseFloat(d.payload.last)
}

export async function quoteConversion(mxn: number) {
  const rate = await getEthMxnRate()
  return { mxn, eth: mxn / rate, rate }
}

export async function buyEthWithMxn(mxn: number) {
  const { eth } = await quoteConversion(mxn)
  const order = await req('POST', '/orders/', {
    book: 'eth_mxn', side: 'buy', type: 'market',
    major: eth.toFixed(8)
  })
  return { orderId: order.payload.oid, eth, mxn, status: order.payload.status }
}
