import {
  ActionRequireData,
  ApproveTokenRequireData,
  AssetOrderRequireData,
  BatchRevokePermit2RequireData,
  CancelTxRequireData,
  ContractCallRequireData,
  ContractRequireData,
  ParsedTransactionActionData,
  PushMultiSigRequireData,
  RevokeTokenApproveRequireData,
  SendRequireData,
  SwapRequireData,
  WrapTokenRequireData,
  TransferOwnerRequireData,
  AddLiquidityRequireData,
} from '@rabby-wallet/rabby-action';
import React from 'react';
import { CommonAction } from '../../CommonAction';
import AssetOrder from '../AssetOrder';
import { BatchRevokePermit2 } from '../BatchRevokePermit2';
import CancelTx from '../CancelTx';
import ContractCall from '../ContractCall';
import CrossSwapToken from '../CrossSwapToken';
import CrossToken from '../CrossToken';
import DeployContract from '../DeployContract';
import PushMultiSig from '../PushMultiSig';
import RevokePermit2 from '../RevokePermit2';
import RevokeTokenApprove from '../RevokeTokenApprove';
import Send from '../Send';
import Swap from '../Swap';
import TokenApprove from '../TokenApprove';
import UnWrapToken from '../UnWrapToken';
import WrapToken from '../WrapToken';
import TransferOwner from '../TransferOwner';
import MultiSwap from '../MultiSwap';
import SwapLimitPay from '../SwapLimitPay';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain } from '@debank/common';
import AddLiquidity from '../AddLiquidity';

const SingleAction: React.FC<{
  data: ParsedTransactionActionData;
  requireData: ActionRequireData;
  engineResults: Result[];
  chain: Chain;
  raw: Record<string, string | number>;
  isTypedData?: boolean;
  onChange(tx: Record<string, any>): void;
  spendingLimit?: string | null;
}> = ({
  data,
  requireData,
  chain,
  engineResults,
  onChange,
  raw,
  isTypedData,
  spendingLimit,
}) => {
  return (
    <>
      {data.swap && (
        <Swap
          data={data.swap}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.crossToken && (
        <CrossToken
          data={data.crossToken}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.crossSwapToken && (
        <CrossSwapToken
          data={data.crossSwapToken}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.wrapToken && (
        <WrapToken
          data={data.wrapToken}
          requireData={requireData as WrapTokenRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.unWrapToken && (
        <UnWrapToken
          data={data.unWrapToken}
          requireData={requireData as WrapTokenRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.send && (
        <Send
          data={data.send}
          requireData={requireData as SendRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.approveToken && (
        <TokenApprove
          data={data.approveToken}
          requireData={requireData as ApproveTokenRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
          spendingLimit={spendingLimit}
        />
      )}
      {data.revokeToken && (
        <RevokeTokenApprove
          data={data.revokeToken}
          requireData={requireData as RevokeTokenApproveRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
        />
      )}
      {data.revokePermit2 && (
        <RevokePermit2
          data={data.revokePermit2}
          requireData={requireData as RevokeTokenApproveRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
        />
      )}
      {data.cancelTx && (
        <CancelTx
          data={data.cancelTx}
          requireData={requireData as CancelTxRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
        ></CancelTx>
      )}
      {data?.deployContract && <DeployContract />}
      {data?.pushMultiSig && (
        <PushMultiSig
          data={data.pushMultiSig}
          requireData={requireData as PushMultiSigRequireData}
          chain={chain}
        />
      )}
      {data?.assetOrder && (
        <AssetOrder
          data={data.assetOrder}
          requireData={requireData as ContractRequireData}
          chain={chain}
          engineResults={engineResults}
          sender={(requireData as AssetOrderRequireData).sender}
        />
      )}
      {data?.transferOwner && (
        <TransferOwner
          data={data.transferOwner}
          requireData={requireData as TransferOwnerRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data?.multiSwap && (
        <MultiSwap
          data={data.multiSwap}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
          sender={(requireData as SwapRequireData).sender}
        />
      )}
      {data?.swapLimitPay && (
        <SwapLimitPay
          data={data.swapLimitPay}
          requireData={requireData as SwapRequireData}
          chain={chain}
          engineResults={engineResults}
          sender={(requireData as SwapRequireData).sender}
        />
      )}
      {!isTypedData && data.contractCall && (
        <ContractCall
          data={data.contractCall}
          requireData={requireData as ContractCallRequireData}
          chain={chain}
          engineResults={engineResults}
          onChange={onChange}
          raw={raw}
        />
      )}
      {!isTypedData && data.common && (
        <CommonAction
          data={data.common}
          requireData={requireData as ContractCallRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.permit2BatchRevokeToken && (
        <BatchRevokePermit2
          data={data.permit2BatchRevokeToken}
          requireData={requireData as BatchRevokePermit2RequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
      {data.addLiquidity && (
        <AddLiquidity
          data={data.addLiquidity}
          requireData={requireData as AddLiquidityRequireData}
          chain={chain}
          engineResults={engineResults}
        />
      )}
    </>
  );
};

export const TransactionActionList: React.FC<{
  data: ParsedTransactionActionData;
  requireData: ActionRequireData;
  engineResults: Result[];
  chain: Chain;
  raw: Record<string, string | number>;
  isTypedData?: boolean;
  onChange(tx: Record<string, any>): void;
  spendingLimit?: string | null;
}> = ({
  data,
  requireData,
  engineResults,
  chain,
  onChange,
  raw,
  isTypedData = false,
  spendingLimit,
}) => {
  return (
    <SingleAction
      data={data}
      requireData={requireData}
      chain={chain}
      engineResults={engineResults}
      onChange={onChange}
      raw={raw}
      isTypedData={isTypedData}
      spendingLimit={spendingLimit}
    />
  );
};
