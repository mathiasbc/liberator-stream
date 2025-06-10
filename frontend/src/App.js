import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme/theme';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Dashboard />
    </ChakraProvider>
  );
}

export default App;
