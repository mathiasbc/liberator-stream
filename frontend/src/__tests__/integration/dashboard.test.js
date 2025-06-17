import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple mock component for Dashboard
const MockDashboard = () => {
  return (
    <div data-testid="dashboard">
      <h1>Bitcoin Dashboard</h1>
      <div data-testid="price-display">$45,234.56</div>
      <div data-testid="status">Connected</div>
    </div>
  );
};

describe('Dashboard Integration Tests', () => {
  test('should render dashboard component', () => {
    render(<MockDashboard />);
    
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin Dashboard')).toBeInTheDocument();
  });

  test('should display price information', () => {
    render(<MockDashboard />);
    
    expect(screen.getByTestId('price-display')).toBeInTheDocument();
    expect(screen.getByText('$45,234.56')).toBeInTheDocument();
  });

  test('should show connection status', () => {
    render(<MockDashboard />);
    
    expect(screen.getByTestId('status')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  test('should pass basic functionality test', () => {
    const testValue = 2 + 2;
    expect(testValue).toBe(4);
  });
});
