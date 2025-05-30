import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LandingPage from '@pages/LandingPage';
import { TranslationProvider } from '@contexts/TranslationContext';
import { ThemeProvider } from '@contexts/ThemeContext';

describe('Hero Section', () => {
  const renderHero = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <TranslationProvider>
            <LandingPage />
          </TranslationProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('displays the correct hero content', () => {
    renderHero();
    
    // Check for the main hero content
    expect(screen.getByText(/\+1,200 personas ya lo usaron para conseguir empleo/i)).toBeInTheDocument();
    expect(screen.getByText(/Convierte tu CV en un imán para reclutadores/i)).toBeInTheDocument();
    expect(screen.getByText(/De desempleado a contratado en 90 días/i)).toBeInTheDocument();
    
    // Check for call-to-action buttons
    expect(screen.getByText(/Empieza gratis/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver cómo funciona/i)).toBeInTheDocument();
  });

  it('has working navigation links', () => {
    renderHero();
    
    const startFreeLink = screen.getByText(/Empieza gratis/i);
    const howItWorksLink = screen.getByText(/Ver cómo funciona/i);
    
    expect(startFreeLink.closest('a')).toHaveAttribute('href', '/comienza-gratis');
    expect(howItWorksLink.closest('a')).toHaveAttribute('href', '/como-funciona');
  });
});
