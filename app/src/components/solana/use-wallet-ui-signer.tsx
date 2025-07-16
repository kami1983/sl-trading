import { useWalletAccountTransactionSendingSigner, useWalletUi } from '@wallet-ui/react'

export function useWalletUiSigner() {
  const { account, cluster } = useWalletUi()

  if (!account || !cluster) {
    return null
  }

  return useWalletAccountTransactionSendingSigner(account, cluster.id)
}
