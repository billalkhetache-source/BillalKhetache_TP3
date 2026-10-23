import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from './ReportService.js';

test('la responsabilité extraite (statsCalculator) peut être remplacée par injection', () => {
  // Faux objet (Mock) pour simuler le calcul
  const mockStatsCalculator = (orders, month) => {
    return {
      month,
      count: 10,
      revenueHT: 1000,
      vat: 200,
      revenueTTC: 1200,
      average: 100,
      byCategory: { test: 1000 }
    };
  };

  // Instanciation de ReportService en lui injectant le mock
  const service = new ReportService({ statsCalculator: mockStatsCalculator });

  // Exécution du service
  const result = service.generate('2026-09', 'json');
  const parsed = JSON.parse(result);

  // Vérification que la réponse contient les données injectées du mock
  assert.equal(parsed.count, 10);
  assert.equal(parsed.revenueHT, 1000);
  assert.equal(parsed.revenueTTC, 1200);
});