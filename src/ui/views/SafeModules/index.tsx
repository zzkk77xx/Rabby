import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from 'ui/utils';
import { findChain } from '@/utils/chain';
import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { Chain } from '@debank/common';
import { sortBy } from 'lodash';
import { Skeleton } from 'antd';
import { NameAndAddress, Empty } from '@/ui/component';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import './style.less';

interface SafeInfoWithChain {
  chain?: Chain | null;
  data: BasicSafeInfo;
}

export const SafeModules: React.FC = () => {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const wallet = useWallet();
  const [safeInfo, setSafeInfo] = useState<SafeInfoWithChain[]>([]);
  const [activeData, setActiveData] = useState<SafeInfoWithChain | undefined>();
  const [loading, setLoading] = useState(true);

  // Use Safe address from DefiInteractor config if available
  const defiInteractorSafe = useRabbySelector(
    (state) => state.preference.defiInteractorSafe
  );
  const safeAddress = useMemo(
    () => defiInteractorSafe || account?.address,
    [defiInteractorSafe, account?.address]
  );

  useEffect(() => {
    const fetchSafeInfo = async () => {
      console.log('[SafeModules] Fetching Safe info', {
        defiInteractorSafe,
        accountAddress: account?.address,
        safeAddress,
      });

      if (!safeAddress) {
        console.log('[SafeModules] No safe address available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const networks = await wallet.getGnosisNetworkIds(safeAddress);
        console.log('[SafeModules] Networks returned:', networks);

        if (!networks || networks.length === 0) {
          console.log('[SafeModules] No Safe networks found for address:', safeAddress);
          setLoading(false);
          return;
        }

        const res = await Promise.all(
          networks.map(async (networkId) => {
            const info = await wallet.getBasicSafeInfo({
              address: safeAddress,
              networkId,
            });

            return {
              chain: findChain({ networkId }),
              data: info,
            };
          })
        );

        const sortedList = sortBy(res, (item) => -(item?.data?.owners?.length || 0));
        setSafeInfo(sortedList);
        setActiveData(sortedList[0]);
      } catch (error) {
        console.error('Failed to fetch Safe info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSafeInfo();
  }, [safeAddress]);

  if (!account) {
    return null;
  }

  return (
    <div className="safe-modules">
      <div className="safe-modules-header">
        <h1 className="safe-modules-title">Safe Information</h1>
        <div className="safe-modules-subtitle">
          View your Safe configuration across networks
        </div>
      </div>

      {loading ? (
        <div className="safe-modules-loading">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : safeInfo.length === 0 ? (
        <div className="safe-modules-empty">
          <Empty
            title="No Safe Information"
            desc="This account is not a Safe multisig or Safe data could not be loaded"
          />
        </div>
      ) : (
        <div className="safe-modules-content">
          {safeInfo.length > 1 && (
            <div className="safe-modules-tabs">
              <div className="tabs-container">
                <div className="tabs">
                  {safeInfo.map((item) => (
                    <div
                      key={item.chain?.enum}
                      className={clsx(
                        'tabs-item',
                        activeData?.chain?.enum === item.chain?.enum && 'is-active'
                      )}
                      onClick={() => setActiveData(item)}
                    >
                      <div className="tabs-item-title">{item.chain?.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeData && (
            <div className="safe-modules-info">
              <div className="safe-info-section">
                <h3 className="section-title">Safe Configuration</h3>
                <div className="safe-info-grid">
                  <div className="info-item">
                    <span className="info-label">Network</span>
                    <span className="info-value">{activeData.chain?.name || 'Unknown'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Safe Version</span>
                    <span className="info-value">{activeData.data.version}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Threshold</span>
                    <span className="info-value">
                      {activeData.data.threshold} of {activeData.data.owners.length}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Nonce</span>
                    <span className="info-value">{activeData.data.nonce}</span>
                  </div>
                </div>
              </div>

              <div className="safe-info-section">
                <h3 className="section-title">
                  Signers ({activeData.data.owners.length})
                </h3>
                <div className="signers-list">
                  {activeData.data.owners.map((owner, index) => (
                    <div key={owner} className="signer-item">
                      <div className="signer-index">{index + 1}</div>
                      <NameAndAddress address={owner} nameClass="max-143" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="safe-info-section">
                <h3 className="section-title">Modules</h3>
                <div className="modules-placeholder">
                  <p className="placeholder-text">
                    Module management coming soon. Modules allow you to extend Safe functionality with custom logic.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafeModules;
