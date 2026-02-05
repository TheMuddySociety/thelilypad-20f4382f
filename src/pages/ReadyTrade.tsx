import React from 'react';
import { useChain } from '@/providers/ChainProvider';
import { SolanaBattleTemplate } from '@/components/battle/templates/SolanaBattleTemplate';
import { MonadBattleTemplate } from '@/components/battle/templates/MonadBattleTemplate';
import { XRPLBattleTemplate } from '@/components/battle/templates/XRPLBattleTemplate';
import { Navbar } from '@/components/Navbar';

// Container component that selects the correct template based on chain
const ReadyTrade = () => {
  const { chain } = useChain();

  // Template Strategy Pattern
  const renderTemplate = () => {
    switch (chain.id) {
      case 'monad':
        return <MonadBattleTemplate />;

      case 'xrpl':
        return <XRPLBattleTemplate />;

      case 'solana':
      default:
        return <SolanaBattleTemplate />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <Navbar />
      {renderTemplate()}
    </div>
  );
};

export default ReadyTrade;
