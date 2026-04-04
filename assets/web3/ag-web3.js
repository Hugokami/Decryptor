/**
 * AG-WEB3.JS
 * Tiny helper for state-based Web3 icon interaction
 */

const AG_WEB3 = {
  /**
   * Set the state of an AG-WEB3 icon
   * @param {HTMLElement|string} el - Element or CSS selector
   * @param {string} state - idle | signing | pending | success | error
   */
  setState: (el, state) => {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (target) {
      target.setAttribute('data-ag-state', state);
      // Optional: Trigger custom events for integrations
      target.dispatchEvent(new CustomEvent('agStateChange', { detail: { state } }));
    }
  },

  /**
   * Cycle through states (for testing/demo)
   */
  cycle: (el) => {
    const states = ['idle', 'signing', 'pending', 'success', 'error'];
    let current = states.indexOf(el.getAttribute('data-ag-state')) || 0;
    setInterval(() => {
      current = (current + 1) % states.length;
      this.setState(el, states[current]);
    }, 2000);
  }
};

// Auto-export if using modules, or attach to window
window.agSetState = AG_WEB3.setState;
window.agCycleState = AG_WEB3.cycle;
