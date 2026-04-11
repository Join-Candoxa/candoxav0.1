// app/api/secure-entry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

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
      return NextResponse.json({ error: 'Missing url or username' }, { status: 400 })
    }

    const privateKey      = process.env.PLATFORM_WALLET_PRIVATE_KEY
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const rpcUrl          = process.env.BASE_RPC_URL

    if (!privateKey || !contractAddress || !rpcUrl) {
      console.error('Missing env vars:', { privateKey: !!privateKey, contractAddress: !!contractAddress, rpcUrl: !!rpcUrl })
      return NextResponse.json({ error: 'Server not configured for onchain operations' }, { status: 500 })
    }

    // Ensure private key has 0x prefix
    const formattedKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`
    const contractAddr = contractAddress as `0x${string}`

    const ts = timestamp || Date.now().toString()
    const contentHash = keccak256(
      encodePacked(['string', 'string', 'string'], [url, username, ts])
    )

    const account = privateKeyToAccount(formattedKey)

    const walletClient = createWalletClient({
      account,
      chain:     base,
      transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
      chain:     base,
      transport: http(rpcUrl),
    })

    console.log('Sending tx from:', account.address, 'to contract:', contractAddr)

    const txHash = await walletClient.writeContract({
      address:      contractAddr,
      abi:          CONTRACT_ABI,
      functionName: 'secureEntry',
      args:         [contentHash, username, platform || 'Other'],
    })

    console.log('Tx sent:', txHash)

    const receipt = await publicClient.waitForTransactionReceipt({
      hash:           txHash,
      confirmations:  1,
      pollingInterval: 2000,
      timeout:        60_000,
    })

    console.log('Tx confirmed, block:', receipt.blockNumber.toString())

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
    console.error('Secure entry onchain error:', err?.message, err?.cause)
    return NextResponse.json(
      { error: err?.message || 'Failed to secure onchain' },
      { status: 500 }
    )
  }
}