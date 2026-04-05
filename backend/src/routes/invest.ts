import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { quoteConversion, buyEthWithMxn } from '../services/bitso'
import { fundProject } from '../services/wallet'
import { SIMULATION_MODE } from '../config/mode'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function loadContractAbi(): any[] | null {
  const artifactPath = path.resolve(
    __dirname,
    '../../../contracts/artifacts/contracts/EspacioBosques.sol/EspacioBosques.json'
  )
  if (!fs.existsSync(artifactPath)) return null
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
    return artifact.abi ?? null
  } catch {
    return null
  }
}

// GET /api/invest/quote?mxn=500
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const mxn = parseFloat(req.query.mxn as string)
    if (!mxn || mxn < 100) { res.status(400).json({ error: 'Mínimo $100 MXN' }); return }
    const quote = await quoteConversion(mxn)
    res.json({ ...quote, simulation: SIMULATION_MODE })
  } catch (err: any) {
    console.error('[invest/quote]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/invest  body: { projectId, mxnAmount, userId }
router.post('/', async (req: Request, res: Response) => {
  const { projectId, mxnAmount, userId } = req.body
  if (!projectId || !mxnAmount || !userId) {
    res.status(400).json({ error: 'Missing fields' }); return
  }
  if (mxnAmount < 100) { res.status(400).json({ error: 'Mínimo $100 MXN' }); return }

  try {
    const order = await buyEthWithMxn(mxnAmount)

    let tx = null
    if (process.env.CONTRACT_ADDRESS) {
      const abi = loadContractAbi()
      if (abi) {
        tx = await fundProject(
          process.env.CONTRACT_ADDRESS,
          projectId,
          order.eth.toFixed(8),
          abi
        )
      } else {
        console.warn('[invest] Contract artifact not found — skipping on-chain funding')
      }
    }

    const { data } = await sb
      .from('eb_investments')
      .insert({
        user_id: userId,
        project_id: projectId,
        mxn_amount: mxnAmount,
        eth_amount: order.eth,
        bitso_order_id: order.orderId,
        tx_hash: tx?.txHash ?? 'pending',
        simulation: SIMULATION_MODE,
        status: 'confirmed'
      })
      .select()
      .single()

    res.json({ success: true, investment: data, transaction: tx, simulation: SIMULATION_MODE })
  } catch (err: any) {
    console.error('[invest]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
