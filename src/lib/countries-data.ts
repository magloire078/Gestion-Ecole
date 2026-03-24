
export type CountryCode =
  | 'CI' | 'SN' | 'ML' | 'BF' | 'GN' | 'TG' | 'BJ' | 'NE'
  | 'CM' | 'CD' | 'CG' | 'GA' | 'TD' | 'MG' | 'HT' | 'FR';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string;
  currencyCode: string;
  phoneCode: string;
  /** Regex to validate phone numbers (after country code). Set to null to skip validation. */
  phoneRegex: RegExp | null;
  phonePlaceholder: string;
  /** Label for the regional education authority field (DRENA, DREN, IA, etc.) */
  educationAuthorityLabel: string;
  /** Whether this country has a predefined list of education authorities */
  hasEducationAuthorityList: boolean;
  /** The template key to use for school structure */
  templateKey: string;
  /** Timezone identifier */
  timezone: string;
}

export const COUNTRIES: CountryConfig[] = [
  // ═══════════════════ UEMOA (XOF) ═══════════════════
  {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    flag: '🇨🇮',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+225',
    phoneRegex: /^(?:\+225|225)?(01|05|07|25|27)[0-9]{8}$/,
    phonePlaceholder: '+225 07 XX XX XX XX',
    educationAuthorityLabel: 'DRENA de tutelle',
    hasEducationAuthorityList: true,
    templateKey: 'IVORIAN_SYSTEM',
    timezone: 'Africa/Abidjan',
  },
  {
    code: 'SN',
    name: 'Sénégal',
    flag: '🇸🇳',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+221',
    phoneRegex: /^(?:\+221|221)?[7][0-9]{8}$/,
    phonePlaceholder: '+221 7X XXX XX XX',
    educationAuthorityLabel: 'Inspection d\'Académie (IA)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Dakar',
  },
  {
    code: 'ML',
    name: 'Mali',
    flag: '🇲🇱',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+223',
    phoneRegex: /^(?:\+223|223)?[5-9][0-9]{7}$/,
    phonePlaceholder: '+223 XX XX XX XX',
    educationAuthorityLabel: 'Académie d\'Enseignement (AE)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Bamako',
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+226',
    phoneRegex: /^(?:\+226|226)?[5-7][0-9]{7}$/,
    phonePlaceholder: '+226 XX XX XX XX',
    educationAuthorityLabel: 'Direction Régionale (DRENA)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Ouagadougou',
  },
  {
    code: 'GN',
    name: 'Guinée',
    flag: '🇬🇳',
    currency: 'GNF',
    currencyCode: 'GNF',
    phoneCode: '+224',
    phoneRegex: /^(?:\+224|224)?[6][0-9]{8}$/,
    phonePlaceholder: '+224 6XX XX XX XX',
    educationAuthorityLabel: 'Direction Préfectorale de l\'Éducation (DPE)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Conakry',
  },
  {
    code: 'TG',
    name: 'Togo',
    flag: '🇹🇬',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+228',
    phoneRegex: /^(?:\+228|228)?[79][0-9]{7}$/,
    phonePlaceholder: '+228 9X XX XX XX',
    educationAuthorityLabel: 'Direction Régionale de l\'Éducation (DRE)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Lome',
  },
  {
    code: 'BJ',
    name: 'Bénin',
    flag: '🇧🇯',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+229',
    phoneRegex: /^(?:\+229|229)?[0-9]{8}$/,
    phonePlaceholder: '+229 XX XX XX XX',
    educationAuthorityLabel: 'Direction Départementale (DDEMP)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Porto-Novo',
  },
  {
    code: 'NE',
    name: 'Niger',
    flag: '🇳🇪',
    currency: 'FCFA',
    currencyCode: 'XOF',
    phoneCode: '+227',
    phoneRegex: /^(?:\+227|227)?[89][0-9]{7}$/,
    phonePlaceholder: '+227 XX XX XX XX',
    educationAuthorityLabel: 'Direction Régionale (DREN)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_WEST_AFRICA',
    timezone: 'Africa/Niamey',
  },

  // ═══════════════════ CEMAC (XAF) ═══════════════════
  {
    code: 'CM',
    name: 'Cameroun',
    flag: '🇨🇲',
    currency: 'FCFA',
    currencyCode: 'XAF',
    phoneCode: '+237',
    phoneRegex: /^(?:\+237|237)?[6][0-9]{8}$/,
    phonePlaceholder: '+237 6XX XX XX XX',
    educationAuthorityLabel: 'Délégation Régionale (DRES)',
    hasEducationAuthorityList: false,
    templateKey: 'CAMEROON_FRANCOPHONE',
    timezone: 'Africa/Douala',
  },
  {
    code: 'GA',
    name: 'Gabon',
    flag: '🇬🇦',
    currency: 'FCFA',
    currencyCode: 'XAF',
    phoneCode: '+241',
    phoneRegex: /^(?:\+241|241)?[0-9]{7,8}$/,
    phonePlaceholder: '+241 XX XX XX XX',
    educationAuthorityLabel: 'Direction Académique Provinciale',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_CENTRAL_AFRICA',
    timezone: 'Africa/Libreville',
  },
  {
    code: 'CG',
    name: 'Congo-Brazzaville',
    flag: '🇨🇬',
    currency: 'FCFA',
    currencyCode: 'XAF',
    phoneCode: '+242',
    phoneRegex: /^(?:\+242|242)?[0-9]{9}$/,
    phonePlaceholder: '+242 XX XXX XX XX',
    educationAuthorityLabel: 'Direction Départementale de l\'Enseignement',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_CENTRAL_AFRICA',
    timezone: 'Africa/Brazzaville',
  },
  {
    code: 'TD',
    name: 'Tchad',
    flag: '🇹🇩',
    currency: 'FCFA',
    currencyCode: 'XAF',
    phoneCode: '+235',
    phoneRegex: /^(?:\+235|235)?[6-9][0-9]{7}$/,
    phonePlaceholder: '+235 XX XX XX XX',
    educationAuthorityLabel: 'Délégation Provinciale de l\'Éducation',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_CENTRAL_AFRICA',
    timezone: 'Africa/Ndjamena',
  },

  // ═══════════════════ Autres devises ═══════════════════
  {
    code: 'CD',
    name: 'RD Congo',
    flag: '🇨🇩',
    currency: 'FC',
    currencyCode: 'CDF',
    phoneCode: '+243',
    phoneRegex: /^(?:\+243|243)?[89][0-9]{8}$/,
    phonePlaceholder: '+243 XX XXX XX XX',
    educationAuthorityLabel: 'Direction Provinciale (PROVED)',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCOPHONE_CENTRAL_AFRICA',
    timezone: 'Africa/Kinshasa',
  },
  {
    code: 'MG',
    name: 'Madagascar',
    flag: '🇲🇬',
    currency: 'Ar',
    currencyCode: 'MGA',
    phoneCode: '+261',
    phoneRegex: /^(?:\+261|261)?3[2-4][0-9]{7}$/,
    phonePlaceholder: '+261 3X XX XXX XX',
    educationAuthorityLabel: 'Direction Régionale (DREN)',
    hasEducationAuthorityList: false,
    templateKey: 'MADAGASCAR_SYSTEM',
    timezone: 'Indian/Antananarivo',
  },
  {
    code: 'HT',
    name: 'Haïti',
    flag: '🇭🇹',
    currency: 'HTG',
    currencyCode: 'HTG',
    phoneCode: '+509',
    phoneRegex: /^(?:\+509|509)?[0-9]{8}$/,
    phonePlaceholder: '+509 XX XX XX XX',
    educationAuthorityLabel: 'Direction Départementale d\'Éducation (DDE)',
    hasEducationAuthorityList: false,
    templateKey: 'HAITI_SYSTEM',
    timezone: 'America/Port-au-Prince',
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currency: '€',
    currencyCode: 'EUR',
    phoneCode: '+33',
    phoneRegex: /^(?:\+33|33|0)?[67][0-9]{8}$/,
    phonePlaceholder: '+33 6 XX XX XX XX',
    educationAuthorityLabel: 'Académie',
    hasEducationAuthorityList: false,
    templateKey: 'FRANCE_SYSTEM',
    timezone: 'Europe/Paris',
  },
];

/** Get a country config by its code */
export function getCountryByCode(code: CountryCode): CountryConfig | undefined {
  return COUNTRIES.find(c => c.code === code);
}

/** Default country code (Côte d'Ivoire) */
export const DEFAULT_COUNTRY: CountryCode = 'CI';
