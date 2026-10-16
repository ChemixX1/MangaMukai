import { getExampleNumber } from 'libphonenumber-js/min';
import metadata from 'libphonenumber-js/metadata.min.json';
import examples from 'libphonenumber-js/mobile/examples';

const countryNames = new Intl.DisplayNames(['es'], { type: 'region' });

export const getAuthPhoneCountry = (dialCode: string) => {
  const callingCode = dialCode.replace(/\D/g, '');
  // Los prefijos compartidos usan el país principal indicado por la metadata.
  const country = metadata.country_calling_codes[callingCode]?.[0];
  if (!country) return undefined;

  const example = country === 'PE'
    ? '933 658 163'
    : getExampleNumber(country, examples)?.formatInternational().replace(`+${callingCode} `, '') ?? 'Tu número';

  return {
    iso: country.toLowerCase(),
    name: countryNames.of(country) ?? country,
    example,
  };
};
