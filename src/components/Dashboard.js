import React from 'react';
import { Box } from '@chakra-ui/react';
import Header from './Header';
import PriceSection from './PriceSection';
import Chart from './Chart';
import { useDataManager } from '../hooks/useDataManager';

const Dashboard = () => {
  const { data, isLoading, error } = useDataManager();

  // Get the current timeframe data
  const currentOhlcData = data.ohlcData[data.currentTimeframe] || [];

  if (isLoading) {
    return (
      <Box
        minHeight='100vh'
        display='flex'
        alignItems='center'
        justifyContent='center'
      >
        <div>Loading Bitcoin Dashboard...</div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        minHeight='100vh'
        display='flex'
        alignItems='center'
        justifyContent='center'
      >
        <div>Error loading data: {error}</div>
      </Box>
    );
  }

  return (
    <Box minHeight='100vh'>
      <Header
        blockHeight={data.blockHeight || 0}
        lastUpdate={data.lastUpdate}
        secondsSinceUpdate={data.secondsSinceUpdate}
      />
      <Box p='32px'>
        <PriceSection
          currentPrice={data.currentPrice || 0}
          priceChange={data.priceChange || 0}
          volume={data.volume || 0}
          marketCap={data.marketCap || 0}
          timeframe={data.currentTimeframe}
          marketDominance={data.marketDominance}
          totalSupply={data.totalSupply}
          extendedSupplyData={data.extendedSupplyData}
          blockHeight={data.blockHeight}
        />
        <Chart sampleData={currentOhlcData} timeframe={data.currentTimeframe} />
      </Box>
    </Box>
  );
};

export default Dashboard;
