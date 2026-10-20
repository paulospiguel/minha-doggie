/** Textos partilhados (pt-PT) usados pela validação e pela descrição de companheiros. */
export const PET_COPY = {
  species: {dog: 'Cão', cat: 'Gato'} as const,
  ageUnit: {years: 'anos', months: 'meses'} as const,
  age: (value: number, unit: 'years' | 'months') => {
    if (unit === 'months') {
      if (value === 0) return 'Menos de 1 mês';
      return value === 1 ? '1 mês' : `${value} meses`;
    }
    if (value === 0) return 'Menos de 1 ano';
    return value === 1 ? '1 ano' : `${value} anos`;
  },
  limitReached: (max: number) => `Podes registar até ${max} companheiros.`,
  notFound: 'Companheiro não encontrado.',
  validation: {
    nameRequired: 'Indica o nome do teu companheiro.',
    nameTooLong: (max: number) => `O nome pode ter no máximo ${max} caracteres.`,
    nameInvalid: 'O nome só pode conter letras, números, espaços, apóstrofos, pontos e hífenes.',
    speciesInvalid: 'Escolhe se é um cão ou um gato.',
    breedTooLong: (max: number) => `A raça pode ter no máximo ${max} caracteres.`,
    breedInvalid: 'A raça só pode conter letras, números, espaços, apóstrofos, pontos, barras e hífenes.',
    ageInvalid: 'Indica a idade com um número inteiro.',
    ageRange: (max: number, unit: string) => `A idade deve estar entre 0 e ${max} ${unit}.`,
    ageUnitInvalid: 'Escolhe anos ou meses.',
  },
} as const;
