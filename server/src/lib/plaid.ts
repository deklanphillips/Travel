import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';
import { config } from '../config.js';

const configuration = new Configuration({
  basePath: PlaidEnvironments[config.plaid.env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': config.plaid.clientId,
      'PLAID-SECRET': config.plaid.secret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const plaidProducts = config.plaid.products as Products[];
export const plaidCountryCodes = config.plaid.countryCodes as CountryCode[];
