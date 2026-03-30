import { faker } from '@faker-js/faker'

export type ClientInput = {
  name: string
  address: string
  phone: string
  email: string
  account_type: string
  account_number: string
}

export function buildClient(overrides: Partial<ClientInput> = {}): ClientInput {
  return {
    name: faker.company.name(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    account_type: faker.helpers.arrayElement(['Commercial', 'Residential', 'HOA', 'Municipal']),
    account_number: faker.string.alphanumeric(8).toUpperCase(),
    ...overrides,
  }
}
