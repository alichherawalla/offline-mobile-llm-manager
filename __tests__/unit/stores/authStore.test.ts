/**
 * Auth Store Unit Tests
 *
 * Tests for authentication and lockout functionality.
 * Priority: P0 (Critical) - Security is critical.
 */

import { useAuthStore } from '../../../src/stores/authStore';
import { resetStores, getAuthState } from '../../utils/testHelpers';

// Constants matching the store
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

describe('authStore', () => {
  beforeEach(() => {
    resetStores();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Initial State
  // ============================================================================
  describe('initial state', () => {
    it('starts with auth disabled', () => {
      expect(getAuthState().isEnabled).toBe(false);
    });

    it('starts locked (will be relevant when enabled)', () => {
      expect(getAuthState().isLocked).toBe(true);
    });

    it('starts with zero failed attempts', () => {
      expect(getAuthState().failedAttempts).toBe(0);
    });

    it('starts with no lockout', () => {
      expect(getAuthState().lockoutUntil).toBeNull();
    });
  });

  // ============================================================================
  // Enable/Disable Auth
  // ============================================================================
  describe('setEnabled', () => {
    it('enables authentication', () => {
      const { setEnabled } = useAuthStore.getState();

      setEnabled(true);

      expect(getAuthState().isEnabled).toBe(true);
    });

    it('sets isLocked to true when enabled', () => {
      const { setEnabled, setLocked } = useAuthStore.getState();

      setLocked(false);
      setEnabled(true);

      expect(getAuthState().isLocked).toBe(true);
    });

    it('disables authentication', () => {
      const { setEnabled } = useAuthStore.getState();

      setEnabled(true);
      setEnabled(false);

      expect(getAuthState().isEnabled).toBe(false);
    });

    it('sets isLocked to match enabled state', () => {
      const { setEnabled } = useAuthStore.getState();

      setEnabled(false);

      expect(getAuthState().isLocked).toBe(false);
    });
  });

  // ============================================================================
  // Lock/Unlock
  // ============================================================================
  describe('setLocked', () => {
    it('locks the app', () => {
      const { setLocked } = useAuthStore.getState();

      setLocked(true);

      expect(getAuthState().isLocked).toBe(true);
    });

    it('unlocks the app', () => {
      const { setLocked } = useAuthStore.getState();

      setLocked(false);

      expect(getAuthState().isLocked).toBe(false);
    });
  });

  // ============================================================================
  // Failed Attempts
  // ============================================================================
  describe('recordFailedAttempt', () => {
    it('increments failed attempts', () => {
      const { recordFailedAttempt } = useAuthStore.getState();

      recordFailedAttempt();

      expect(getAuthState().failedAttempts).toBe(1);
    });

    it('returns false when under max attempts', () => {
      const { recordFailedAttempt } = useAuthStore.getState();

      const result = recordFailedAttempt();

      expect(result).toBe(false);
    });

    it('triggers lockout at max attempts', () => {
      const { recordFailedAttempt } = useAuthStore.getState();

      // Record MAX_FAILED_ATTEMPTS - 1 attempts
      for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
        const result = recordFailedAttempt();
        expect(result).toBe(false);
      }

      // The final attempt should trigger lockout
      const result = recordFailedAttempt();
      expect(result).toBe(true);
    });

    it('sets lockoutUntil when max attempts reached', () => {
      const { recordFailedAttempt } = useAuthStore.getState();
      const now = Date.now();

      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      const { lockoutUntil } = getAuthState();
      expect(lockoutUntil).not.toBeNull();
      expect(lockoutUntil).toBeGreaterThanOrEqual(now + LOCKOUT_DURATION);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resets failed attempts to zero', () => {
      const { recordFailedAttempt, resetFailedAttempts } = useAuthStore.getState();

      recordFailedAttempt();
      recordFailedAttempt();
      resetFailedAttempts();

      expect(getAuthState().failedAttempts).toBe(0);
    });

    it('clears lockoutUntil', () => {
      const { recordFailedAttempt, resetFailedAttempts } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }
      expect(getAuthState().lockoutUntil).not.toBeNull();

      resetFailedAttempts();

      expect(getAuthState().lockoutUntil).toBeNull();
    });
  });

  // ============================================================================
  // Background Time
  // ============================================================================
  describe('setLastBackgroundTime', () => {
    it('sets the background time', () => {
      const { setLastBackgroundTime } = useAuthStore.getState();
      const time = Date.now();

      setLastBackgroundTime(time);

      expect(getAuthState().lastBackgroundTime).toBe(time);
    });

    it('clears with null', () => {
      const { setLastBackgroundTime } = useAuthStore.getState();

      setLastBackgroundTime(Date.now());
      setLastBackgroundTime(null);

      expect(getAuthState().lastBackgroundTime).toBeNull();
    });
  });

  // ============================================================================
  // Lockout Checking
  // ============================================================================
  describe('checkLockout', () => {
    it('returns false when no lockout active', () => {
      const { checkLockout } = useAuthStore.getState();

      expect(checkLockout()).toBe(false);
    });

    it('returns true during lockout period', () => {
      const { recordFailedAttempt, checkLockout } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      expect(checkLockout()).toBe(true);
    });

    it('returns false and resets after lockout expires', () => {
      const { recordFailedAttempt, checkLockout } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }
      expect(checkLockout()).toBe(true);

      // Advance time past lockout
      jest.advanceTimersByTime(LOCKOUT_DURATION + 1000);

      expect(checkLockout()).toBe(false);
      expect(getAuthState().lockoutUntil).toBeNull();
      expect(getAuthState().failedAttempts).toBe(0);
    });
  });

  describe('getLockoutRemaining', () => {
    it('returns 0 when no lockout', () => {
      const { getLockoutRemaining } = useAuthStore.getState();

      expect(getLockoutRemaining()).toBe(0);
    });

    it('returns remaining seconds during lockout', () => {
      const { recordFailedAttempt, getLockoutRemaining } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      const remaining = getLockoutRemaining();
      // Should be approximately 5 minutes (300 seconds)
      expect(remaining).toBeGreaterThan(295);
      expect(remaining).toBeLessThanOrEqual(300);
    });

    it('decreases over time', () => {
      const { recordFailedAttempt, getLockoutRemaining } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      const initial = getLockoutRemaining();

      // Advance 60 seconds
      jest.advanceTimersByTime(60000);

      const afterOneMinute = getLockoutRemaining();
      expect(afterOneMinute).toBeLessThan(initial);
      expect(initial - afterOneMinute).toBeGreaterThanOrEqual(59);
    });

    it('returns 0 after lockout expires', () => {
      const { recordFailedAttempt, getLockoutRemaining } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }

      // Advance past lockout
      jest.advanceTimersByTime(LOCKOUT_DURATION + 1000);

      expect(getLockoutRemaining()).toBe(0);
    });
  });

  // ============================================================================
  // Integration Scenarios
  // ============================================================================
  describe('integration scenarios', () => {
    it('successful auth after failed attempts resets counter', () => {
      const { recordFailedAttempt, resetFailedAttempts } = useAuthStore.getState();

      // 3 failed attempts
      recordFailedAttempt();
      recordFailedAttempt();
      recordFailedAttempt();
      expect(getAuthState().failedAttempts).toBe(3);

      // Successful auth
      resetFailedAttempts();

      expect(getAuthState().failedAttempts).toBe(0);

      // Can fail again without immediate lockout
      recordFailedAttempt();
      expect(getAuthState().lockoutUntil).toBeNull();
    });

    it('lockout expires and user can try again', () => {
      const { recordFailedAttempt, checkLockout } = useAuthStore.getState();

      // Trigger lockout
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        recordFailedAttempt();
      }
      expect(checkLockout()).toBe(true);

      // Wait for lockout to expire
      jest.advanceTimersByTime(LOCKOUT_DURATION + 1);
      expect(checkLockout()).toBe(false);

      // User can fail again
      recordFailedAttempt();
      expect(getAuthState().failedAttempts).toBe(1);
      expect(getAuthState().lockoutUntil).toBeNull();
    });
  });
});
