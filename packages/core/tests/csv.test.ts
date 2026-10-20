import {describe, expect, it} from 'vitest';
import {buildCsv, csvDataUrl, csvFileName, escapeCsvCell, legacyCustomerId, PET_CSV_HEADER, petCsvRows} from '../src/csv';
import {pet} from './fixtures';

describe('escapeCsvCell', () => {
  it('deixa texto simples intacto', () => {
    expect(escapeCsvCell('Bolinhas')).toBe('Bolinhas');
    expect(escapeCsvCell(3)).toBe('3');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
  it('coloca entre aspas e duplica aspas (RFC 4180)', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('diz "olá"')).toBe('"diz ""olá"""');
    expect(escapeCsvCell('linha1\nlinha2')).toBe('"linha1\nlinha2"');
    expect(escapeCsvCell('x\r')).toBe('"x\r"');
    expect(escapeCsvCell(' espaço')).toBe('" espaço"');
  });
  it('respeita o separador escolhido', () => {
    expect(escapeCsvCell('a;b', ';')).toBe('"a;b"');
    expect(escapeCsvCell('a,b', ';')).toBe('a,b');
  });
  it('neutraliza injeção de fórmulas (= + - @ TAB CR)', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvCell('+351 912')).toBe("'+351 912");
    expect(escapeCsvCell('-2')).toBe("'-2");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvCell('\tcmd')).toBe("'\tcmd");
  });
  it('números verdadeiros não são alterados; NaN/Infinity ficam vazios', () => {
    expect(escapeCsvCell(-2)).toBe('-2');
    expect(escapeCsvCell(Number.NaN)).toBe('');
  });
});

describe('buildCsv', () => {
  it('BOM UTF-8, CRLF e linha final', () => {
    const csv = buildCsv(['a', 'b'], [['1', 'x,y']]);
    expect(csv).toBe('\uFEFFa,b\r\n1,"x,y"\r\n');
  });
  it('sem BOM e com ponto e vírgula (Excel pt-PT)', () => {
    expect(buildCsv(['a', 'b'], [['1', '2']], {delimiter: ';', bom: false})).toBe('a;b\r\n1;2\r\n');
  });
});

describe('petCsvRows', () => {
  it('uma linha por companheiro com as colunas pedidas', () => {
    const rows = petCsvRows([
      {
        customerId: 'gid://shopify/Customer/123',
        name: 'Ana Silva',
        email: 'ana@example.com',
        pets: [pet(), pet({id: 'bbbbbbbb-0000-4000-8000-000000000002', name: 'Mia', species: 'cat', breed: '', age: {value: 5, unit: 'months'}})],
      },
      {customerId: 'gid://shopify/Customer/124', name: 'Sem Animais', email: '', pets: []},
    ]);
    expect(PET_CSV_HEADER).toEqual(['customer id', 'name', 'email', 'nome', 'espécie', 'raça', 'idade']);
    expect(rows).toEqual([
      ['123', 'Ana Silva', 'ana@example.com', 'Bolinhas', 'Cão', 'Labrador', '3 anos'],
      ['123', 'Ana Silva', 'ana@example.com', 'Mia', 'Gato', '', '5 meses'],
    ]);
  });
  it('idade desconhecida fica vazia', () => {
    const rows = petCsvRows([{customerId: 'gid://shopify/Customer/1', name: '', email: '', pets: [pet({age: null})]}]);
    expect(rows[0][6]).toBe('');
  });
});

describe('utilitários', () => {
  it('legacyCustomerId', () => {
    expect(legacyCustomerId('gid://shopify/Customer/987')).toBe('987');
    expect(legacyCustomerId('gid://shopify/CustomerSegmentMember/987')).toBe('987');
    expect(legacyCustomerId('outro')).toBe('outro');
  });
  it('csvDataUrl codifica em UTF-8 (percent-encoding) e é reversível', () => {
    const csv = buildCsv(['espécie'], [['Cão']]);
    const url = csvDataUrl(csv);
    expect(url.startsWith('data:text/csv;charset=utf-8,')).toBe(true);
    expect(url).not.toMatch(/[\s"#]/);
    expect(decodeURIComponent(url.slice('data:text/csv;charset=utf-8,'.length))).toBe(csv);
  });
  it('csvFileName com data local', () => {
    expect(csvFileName(new Date(2026, 9, 5))).toBe('minha-doggie-companheiros-2026-10-05.csv');
  });
});
