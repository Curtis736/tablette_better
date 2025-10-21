// Tests unitaires natifs Node.js pour SEDI Tablette v2
// Alternative simple et efficace à Jest/Vitest

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Configuration des tests
const TEST_CONFIG = {
  timeout: 10000,
  verbose: true
};

// Classe de test simple
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🚀 Démarrage des tests SEDI Tablette v2...\n');
    
    for (const test of this.tests) {
      try {
        console.log(`  ✓ ${test.name}`);
        await test.fn();
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${test.name}`);
        console.log(`     Erreur: ${error.message}`);
        this.failed++;
      }
    }

    this.printSummary();
  }

  printSummary() {
    const duration = Date.now() - this.startTime;
    console.log(`\n📊 Résumé des tests:`);
    console.log(`   ✅ Réussis: ${this.passed}`);
    console.log(`   ❌ Échoués: ${this.failed}`);
    console.log(`   ⏱️  Durée: ${duration}ms`);
    console.log(`   📈 Taux de réussite: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
  }
}

// Fonctions d'assertion améliorées
const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toThrow: (expectedError) => {
    try {
      if (typeof actual === 'function') {
        actual();
      }
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error message to contain "${expectedError}", got "${error.message}"`);
      }
    }
  },
  toHaveBeenCalled: () => {
    if (!actual.called) {
      throw new Error('Expected function to have been called');
    }
  },
  toHaveBeenCalledWith: (...args) => {
    if (!actual.called || !actual.calledWith) {
      throw new Error('Expected function to have been called');
    }
    if (JSON.stringify(actual.calledWith) !== JSON.stringify(args)) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, got ${JSON.stringify(actual.calledWith)}`);
    }
  },
  toBeLessThan: (expected) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeGreaterThan: (expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toContain: (expected) => {
    if (Array.isArray(actual)) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    } else if (typeof actual === 'string') {
      if (!actual.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}"`);
      }
    } else {
      throw new Error('Expected array or string for toContain');
    }
  },
  toHaveLength: (expected) => {
    if (actual.length !== expected) {
      throw new Error(`Expected length ${actual.length} to be ${expected}`);
    }
  },
  toBeInstanceOf: (expected) => {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected ${actual.constructor.name} to be instance of ${expected.name}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error(`Expected ${actual} to be null`);
    }
  },
  toBeUndefined: () => {
    if (actual !== undefined) {
      throw new Error(`Expected ${actual} to be undefined`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined) {
      throw new Error(`Expected ${actual} to be defined`);
    }
  }
});

// Mock simple amélioré
const mock = (fn) => {
  const mockFn = (...args) => {
    mockFn.called = true;
    mockFn.calledWith = args;
    mockFn.callCount = (mockFn.callCount || 0) + 1;
    return mockFn.returnValue;
  };
  mockFn.called = false;
  mockFn.calledWith = null;
  mockFn.callCount = 0;
  mockFn.returnValue = undefined;
  mockFn.mockReturnValue = (value) => {
    mockFn.returnValue = value;
    return mockFn;
  };
  mockFn.mockImplementation = (impl) => {
    mockFn.implementation = impl;
    return mockFn;
  };
  mockFn.mockResolvedValue = (value) => {
    mockFn.returnValue = Promise.resolve(value);
    return mockFn;
  };
  mockFn.mockRejectedValue = (value) => {
    mockFn.returnValue = Promise.reject(value);
    return mockFn;
  };
  return mockFn;
};

// Fonctions utilitaires pour les tests
const utils = {
  // Créer des données de test
  createTestOperator: (overrides = {}) => ({
    id: 1,
    nom: 'Test Operator',
    prenom: 'Test',
    email: 'test@sedi.com',
    actif: true,
    ...overrides
  }),

  createTestOperation: (overrides = {}) => ({
    id: 1,
    nom: 'Test Operation',
    description: 'Test description',
    duree: 60,
    actif: true,
    ...overrides
  }),

  createTestComment: (overrides = {}) => ({
    id: 1,
    operationId: 1,
    operatorId: 1,
    comment: 'Test comment',
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  // Valider les formats
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  // HH:mm 24h, 00:00 à 23:59
  isValidTime: (time) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time),
  // YYYY-MM-DD avec mois 01-12 et jours 01-31 (validation simple)
  isValidDate: (date) => /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(date),
  // Nombre valide: number fini ou string numérique (entier/décimal, signe optionnel)
  isValidNumber: (value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return /^-?\d+(?:\.\d+)?$/.test(value.trim());
    return false;
  },

  // Attendre un délai
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mesurer le temps d'exécution
  measureTime: async (fn) => {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  }
};

// Export pour utilisation
module.exports = { TestRunner, expect, mock, utils };
