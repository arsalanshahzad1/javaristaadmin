export const CERTIFICATION_TYPES = [
  'javarista_level_1',
  'javarista_level_2',
  'javarista_level_3',
  'javarista_level_4',
  'javarista_level_5',
  'shift_leader',
  'store_leader',
  'java_champion',
] as const;

export type CertificationType = typeof CERTIFICATION_TYPES[number];
