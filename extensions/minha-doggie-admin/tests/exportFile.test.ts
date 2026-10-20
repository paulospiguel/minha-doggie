import {describe, expect, it} from 'vitest';
import type {Pet} from '@minha-doggie/core';
import {buildExportFile} from '../src/lib/exportFile';
import {DOG} from './helpers';

describe('buildExportFile', () => {
  it('gera CSV com cabeçalho pedido, separador escolhido e data URL descarregável', () => {
    const file = buildExportFile(
      [{customerId: 'gid://shopify/Customer/123', name: 'Ana; "Silva"', email: 'ana@example.com', pets: [DOG as Pet]}],
      ';',
      new Date(2026, 9, 20),
    );
    expect(file.fileName).toBe('minha-doggie-companheiros-2026-10-20.csv');
    expect(file.rows).toBe(1);
    expect(file.customers).toBe(1);
    expect(file.csv).toBe('\uFEFFcustomer id;name;email;nome;espécie;raça;idade\r\n123;"Ana; ""Silva""";ana@example.com;Bolinhas;Cão;Labrador;3 anos\r\n');
    expect(file.dataUrl.startsWith('data:text/csv;charset=utf-8,')).toBe(true);
    expect(file.bytes).toBeGreaterThan(file.csv.length - 1);
  });
});
