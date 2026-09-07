import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import DepthCarousel from './components/DepthCarousel';

const mountNode = document.getElementById('depthCarousel');
const sourceItems = Array.isArray(window.__PORTFOLIO_CERTIFICATES__)
  ? window.__PORTFOLIO_CERTIFICATES__
  : [];

if (mountNode && sourceItems.length) {
  const status = document.querySelector('.cert-status');
  const updateStatus = index => {
    if (status) {
      status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(sourceItems.length).padStart(2, '0')}`;
    }
  };

  createRoot(mountNode).render(
    <StrictMode>
      <DepthCarousel items={sourceItems} onChange={updateStatus} />
    </StrictMode>
  );
}
