// app/api/secure-entry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  http as viemHttp,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const PRIVATE_KEY      = process.env.PLATFORM_WALLET_PRIVATE_KEY as `0x${string}`
const RPC_URL          = process.env.BASE_RPC_URL!

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'contentHash', type: 'bytes32' },
      { internalType: 'string',  name: 'username',    type: 'string'  },
      { internalType: 'string',  name: 'platform',    type: 'string'  },
    ],
    name:            'secureEntry',
    outputs:         [],
    stateMutability: 'nonpayable',
    type:            'function',
  },
] as const

export async function POST(req: NextRequest) {
  try {
    const { url, username, platform, timestamp } = await req.json()

    if (!url || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
      return NextResponse.json({ error: 'Server not configured for onchain operations' }, { status: 500 })
    }

    // Create deterministic content hash from url + username + timestamp
    const ts = timestamp || Date.now().toString()
    const contentHash = keccak256(
      encodePacked(
        ['string', 'string', 'string'],
        [url, username, ts]
      )
    )

    // Set up wallet client (platform wallet pays gas)
    const account = privateKeyToAccount(PRIVATE_KEY)

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    })

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    })

    // Call the smart contract
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi:     CONTRACT_ABI,
      functionName: 'secureEntry',
      args: [contentHash, username, platform || 'Other'],
    })

    // Wait for receipt to get block number
    const receipt = await publicClient.waitForTransactionReceipt({
      hash:               txHash,
      confirmations:      1,
      pollingInterval:    2000,
      timeout:            60_000,
    })

    return NextResponse.json({
      success:       true,
      txHash,
      blockNumber:   receipt.blockNumber.toString(),
      contentHash,
      walletAddress: account.address,
      chain:         'base',
      explorerUrl:   `https://basescan.org/tx/${txHash}`,
    })

  } catch (err: any) {
    console.error('Secure entry onchain error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to secure onchain' },
      { status: 500 }
    )
  }
}