import { t } from 'i18next';
import { getChainList } from './chain';
import { ConstructorOptions } from '@rabby-wallet/eth-walletconnect-keyring/type';

export const GET_WALLETCONNECT_CONFIG: () => ConstructorOptions = () => {
  return {
    // 1h
    maxDuration: 3600000,
    clientMeta: {
      description: t('global.appDescription'),
      url: 'https://rabby.io',
      icons: [
        'https://static-assets.rabby.io/files/122da969-da58-42e9-ab39-0a8dd38d94b8.png',
      ],
      name: 'MultiSub',
    },
    projectId: '99906ad0175c9aed44cccc246b16614e',
  };
};

export const allChainIds = getChainList('mainnet').map((item) => item.id);
