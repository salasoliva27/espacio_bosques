import { ethers } from 'ethers'
import { BLOCKCHAIN_RPC } from '../config/mode'

let provider: ethers.JsonRpcProvider
let wallet: ethers.Wallet

export function getProvider() {
  if (!provider) provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC)
  return provider
}

export function getWallet() {
  if (!wallet) {
    const pk = process.env.BACKEND_WALLET_PRIVATE_KEY
    if (!pk) throw new Error('BACKEND_WALLET_PRIVATE_KEY not set in .env')
    wallet = new ethers.Wallet(pk, getProvider())
  }
  return wallet
}

export async function fundProject(
  contractAddress: string,
  projectId: string,
  ethAmount: string,
  abi: any[]
) {
  const w = getWallet()
  const contract = new ethers.Contract(contractAddress, abi, w)
  const tx = await contract.fundProject(projectId, {
    value: ethers.parseEther(ethAmount)
  })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber }
}
