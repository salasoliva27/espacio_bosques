/**
 * Custodial backend wallet — holds project funds on behalf of the community.
 * In simulation mode, transactions are logged but not broadcast to any network.
 */
import { ethers } from 'ethers';
import { SIMULATION_MODE } from '../config/mode';
import { logger } from '../utils/logger';

let _provider: ethers.JsonRpcProvider | null = null;
let _wallet: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getWallet(): ethers.Wallet {
  if (!_wallet) {
    const pk = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!pk) throw new Error('BACKEND_WALLET_PRIVATE_KEY not set');
    _wallet = new ethers.Wallet(pk, getProvider());
  }
  return _wallet;
}

export function getWalletAddress(): string {
  try {
    return getWallet().address;
  } catch {
    // Fallback — Hardhat account #0 public address
    return '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  }
}

/**
 * Simulate sending ETH to an escrow contract (POC).
 * Returns a fake tx hash in simulation mode.
 */
export async function fundProject(
  projectId: string,
  ethAmount: number
): Promise<{ txHash: string; simulation: boolean }> {
  if (SIMULATION_MODE()) {
    const txHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    logger.info(`[wallet] simulation fund: project=${projectId} amount=${ethAmount} ETH txHash=${txHash}`);
    return { txHash, simulation: true };
  }

  // Real path — not yet wired to a deployed contract
  logger.warn('[wallet] real fund not implemented — falling back to simulation');
  const txHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
  return { txHash, simulation: true };
}
