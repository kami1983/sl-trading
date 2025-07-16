// Here we export some useful types and functions for interacting with the Anchor program.
import { address } from 'gill'
import { SolanaClusterId } from '@wallet-ui/react'
import { APP_PROGRAM_ADDRESS } from './client/js'
import AppIDL from '../target/idl/app.json'

// Re-export the generated IDL and type
export { AppIDL }

// This is a helper function to get the program ID for the App program depending on the cluster.
export function getAppProgramId(cluster: SolanaClusterId) {
  switch (cluster) {
    case 'solana:devnet':
    case 'solana:testnet':
      // This is the program ID for the App program on devnet and testnet.
      return address('6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF')
    case 'solana:mainnet':
    default:
      return APP_PROGRAM_ADDRESS
  }
}

export * from './client/js'
