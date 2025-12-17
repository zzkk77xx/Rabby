import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useHistory } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { Input } from 'antd';

import { Modal } from 'ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import { useWallet } from 'ui/utils';
import './style.less';

import PendingApproval from './components/PendingApproval';

import { CurrentConnection } from './components/CurrentConnection';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPanel } from './components/DashboardPanel';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { GasPriceBar } from './components/GasPriceBar';
import { CHAINS_ENUM } from '@/constant';
import Settings from './components/Settings';
import { useMemoizedFn } from 'ahooks';

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();

  const { firstNotice, updateContent, version } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));

  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const getCurrentAccount = async () => {
    const account = await dispatch.account.getCurrentAccountAsync();
    if (!account) {
      history.replace('/no-address');
      return;
    }
  };

  useEffect(() => {
    getCurrentAccount();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      dispatch.gift.checkGiftEligibilityAsync({
        address: currentAccount.address,
        currentAccount,
      });
    }
  }, [currentAccount]);

  useEffect(() => {
    (async () => {
      await dispatch.addressManagement.getHilightedAddressesAsync();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
      const pendingCount = await wallet.getPendingApprovalCount();
      setPendingApprovalCount(pendingCount);
      const hasAnyAccountClaimedGift = await wallet.getHasAnyAccountClaimedGift();
      dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
    })();
  }, []);

  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, [dispatch]);

  const { t } = useTranslation();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.SETH
  );

  const [settingVisible, setSettingVisible] = useState(false);
  const toggleShowMoreSettings = useMemoizedFn(() => {
    setSettingVisible(!settingVisible);
  });

  const [showDefiModulePrompt, setShowDefiModulePrompt] = useState(false);
  const [defiModuleAddress, setDefiModuleAddress] = useState('');
  const [showSafeInput, setShowSafeInput] = useState(false);
  const [safeAddress, setSafeAddress] = useState('');
  const [isLoadingModule, setIsLoadingModule] = useState(false);

  useEffect(() => {
    (async () => {
      const moduleAddress = await wallet.getDefiInteractorModule();
      if (!moduleAddress) {
        setShowDefiModulePrompt(true);
      }
    })();
  }, []);

  const handleSetDefiModule = useMemoizedFn(async () => {
    const trimmedAddress = defiModuleAddress.trim();

    // If showing Safe input, handle Safe address submission
    if (showSafeInput) {
      const trimmedSafeAddress = safeAddress.trim();
      if (!trimmedSafeAddress || !/^0x[a-fA-F0-9]{40}$/.test(trimmedSafeAddress)) {
        alert('Please enter a valid Safe address (0x followed by 40 hexadecimal characters)');
        return;
      }

      try {
        setIsLoadingModule(true);
        await dispatch.preference.setDefiInteractorSafe(trimmedSafeAddress);
        setShowDefiModulePrompt(false);
        setShowSafeInput(false);
      } catch (error) {
        console.error('Failed to set Safe address:', error);
        alert('Failed to save the Safe address. Please try again.');
      } finally {
        setIsLoadingModule(false);
      }
      return;
    }

    // Validate module address
    if (!trimmedAddress) {
      // Empty address - skip
      setShowDefiModulePrompt(false);
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      alert('Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)');
      return;
    }

    // Try to set module and auto-fetch Safe address
    try {
      setIsLoadingModule(true);
      const result = await dispatch.preference.setDefiInteractorModule(trimmedAddress);

      if (result?.success === false) {
        // Auto-fetch failed, show manual Safe input
        setShowSafeInput(true);
      } else {
        // Success
        setShowDefiModulePrompt(false);
      }
    } catch (error) {
      console.error('Failed to set DeFi module:', error);
      // Show manual input on error
      setShowSafeInput(true);
    } finally {
      setIsLoadingModule(false);
    }
  });

  const handleSkipDefiModule = useMemoizedFn(() => {
    setShowDefiModulePrompt(false);
    setShowSafeInput(false);
  });

  const handleBackToModule = useMemoizedFn(() => {
    setShowSafeInput(false);
    setSafeAddress('');
  });

  return (
    <>
      <div className={clsx('dashboard')}>
        <DashboardHeader onSettingClick={toggleShowMoreSettings} />
        <DashboardPanel onSettingClick={toggleShowMoreSettings} />
        <div className="px-[16px] pb-[13px]">
          <GasPriceBar currentConnectedSiteChain={currentConnectedSiteChain} />
          <CurrentConnection onChainChange={setCurrentConnectedSiteChain} />
        </div>
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title={t('page.dashboard.home.whatsNew')}
        className="first-notice"
        onCancel={() => {
          dispatch.appVersion.afterFirstLogin();
        }}
        maxHeight="420px"
      >
        <div>
          <p className="mb-12">{version}</p>
          <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
        </div>
      </Modal>

      <Modal
        visible={showDefiModulePrompt}
        title="Set DeFi Interactor Module"
        className="defi-module-prompt modal-support-darkmode"
        onCancel={showSafeInput ? handleBackToModule : handleSkipDefiModule}
        okText={showSafeInput ? 'Save Safe Address' : 'Set Module'}
        cancelText={showSafeInput ? 'Back' : 'Skip'}
        onOk={handleSetDefiModule}
        maxHeight="400px"
        confirmLoading={isLoadingModule}
      >
        <div>
          <p style={{ marginBottom: '12px' }}>
            {showSafeInput
              ? 'Could not automatically fetch Safe address from Sepolia or Ethereum Mainnet. Please enter it manually:'
              : 'Would you like to set a DeFi Interactor Module address? This is recommended for Safe multisig wallets.'}
          </p>
          <Input
            placeholder={showSafeInput ? 'Enter Safe address (0x...)' : 'Enter module address (0x...)'}
            value={showSafeInput ? safeAddress : defiModuleAddress}
            onChange={(e) => showSafeInput ? setSafeAddress(e.target.value) : setDefiModuleAddress(e.target.value)}
            onPressEnter={handleSetDefiModule}
            disabled={showSafeInput ? false : isLoadingModule}
          />
          {showSafeInput && (
            <button
              onClick={handleBackToModule}
              style={{
                marginTop: '8px',
                background: 'none',
                border: 'none',
                color: '#239363',
                cursor: 'pointer',
                padding: 0,
                fontSize: '13px'
              }}
            >
              ← Back to module address
            </button>
          )}
        </div>
      </Modal>

      {pendingApprovalCount > 0 && (
        <PendingApproval
          onRejectAll={() => {
            setPendingApprovalCount(0);
          }}
          count={pendingApprovalCount}
        />
      )}

      <Settings visible={settingVisible} onClose={toggleShowMoreSettings} />
    </>
  );
};

export default connectStore()(Dashboard);
