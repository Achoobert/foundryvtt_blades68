describe('Pause overlay animations', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.licenseAgreeAndClickAccept();
    cy.setupInputPasswordAndClickLogin();
    cy.closeTourOverlay();
    cy.launchTestWorldFromSetup();
    cy.loginAsGM();

    cy.window({ timeout: 120000 }).should((win) => {
      expect(win.game.ready, 'game.ready').to.eq(true);
    });

    
    cy.window().then((win) => {
      const realMatchMedia = win.matchMedia.bind(win);
      cy.stub(win, 'matchMedia').callsFake((query) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: false,
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {}
          };
        }
        return realMatchMedia(query);
      });
    });
  });

  afterEach(() => {
    cy.window().then((win) => {
      win.game.settings.set('core', 'photosensitiveMode', false);
      win.game.settings.set('blades68', 'PauseAnimation', 'bluetime');
      
      
      win.ui.pause.render();
      win.game.togglePause(false);
    });
  });

  it('renders 5 bluetime blobs', () => {
    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'bluetime');
      win.game.togglePause(true);
    });
    cy.get('#pause[data-b68-pause-animation="bluetime"] .blades68-bluetime-blob').should('have.length', 5);
    cy.screenshot('pause-bluetime', { capture: 'viewport' });
  });

  it('renders animated VHS static with scanlines and tracking band', () => {
    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'vhs');
      win.game.togglePause(true);
    });
    cy.get('#pause[data-b68-pause-animation="vhs"] canvas.blades68-vhs-static').should('exist');
    cy.get('#pause[data-b68-reduced-motion]').should('not.exist');

    cy.window().should((win) => {
      const pause = win.document.querySelector('#pause');
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('b68-vhs-flicker');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('b68-vhs-roll');
    });

    
    cy.window().then((win) => {
      const canvas = win.document.querySelector('#pause canvas.blades68-vhs-static');
      const first = canvas.toDataURL();
      cy.wait(500);
      cy.window().should((win2) => {
        const canvas2 = win2.document.querySelector('#pause canvas.blades68-vhs-static');
        expect(canvas2.toDataURL() === first, 'grain frozen').to.eq(false);
      });
    });

    cy.screenshot('pause-vhs', { capture: 'viewport' });
  });

  it('calms VHS animation under photosensitive mode without freezing grain', () => {
    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'vhs');
      win.game.togglePause(true);
      
      win.game.settings.set('core', 'photosensitiveMode', true);
      win.ui.pause.render();
    });
    cy.get('#pause[data-b68-reduced-motion]').should('exist');
    cy.get('#pause canvas.blades68-vhs-static').should('exist');

    cy.window().should((win) => {
      const pause = win.document.querySelector('#pause');
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('none');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('none');
    });

    
    cy.window().then((win) => {
      const canvas = win.document.querySelector('#pause canvas.blades68-vhs-static');
      const first = canvas.toDataURL();
      cy.wait(600);
      cy.window().should((win2) => {
        const canvas2 = win2.document.querySelector('#pause canvas.blades68-vhs-static');
        expect(canvas2.toDataURL() === first, 'calm grain frozen').to.eq(false);
      });
    });

    cy.screenshot('pause-vhs-calm', { capture: 'viewport' });
  });

  it('renders vanilla mode with no animation', () => {
    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'vanilla');
      win.game.togglePause(true);
    });
    cy.get('#pause[data-b68-pause-animation="vanilla"]').should('exist');
    cy.get('#pause canvas.blades68-vhs-static').should('not.exist');
    cy.get('#pause .blades68-bluetime').should('not.exist');

    cy.window().should((win) => {
      const pause = win.document.querySelector('#pause');
      expect(win.getComputedStyle(pause.querySelector('img')).animationName, 'logo').to.eq('none');
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('none');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('none');
    });

    cy.screenshot('pause-vanilla', { capture: 'viewport' });
  });
});
