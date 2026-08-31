import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('manual Collector’s Room smoke path', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('keeps curation, configuration, and checkout review usable without WebMCP', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /find the piece/i })).toBeInTheDocument();
    expect(screen.getByText('Manual experience ready')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Braider', level: 3 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /apply visible configuration/i }));
    expect(screen.getByText('Current configuration')).toBeInTheDocument();
    expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('$80');

    fireEvent.click(screen.getByRole('button', { name: /prepare checkout review/i }));
    expect(screen.getByText('Exact Mini review')).toBeInTheDocument();
    expect(screen.getByText('Total $80')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm handoff.*review-only demo/i })).toBeInTheDocument();
  });
});
