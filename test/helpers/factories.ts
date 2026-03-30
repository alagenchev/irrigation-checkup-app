import { faker } from '@faker-js/faker'
import type { NewClient } from '@/lib/schema'

export function buildClient(overrides: Partial<NewClient> = {}): NewClient {
  return {
    name:          faker.company.name(),
    address:       faker.location.streetAddress(),
    phone:         faker.phone.number(),
    email:         faker.internet.email(),
    accountType:   faker.helpers.arrayElement(['Commercial', 'Residential', 'HOA', 'Municipal']),
    accountNumber: faker.string.alphanumeric(8).toUpperCase(),
    ...overrides,
  }
}
