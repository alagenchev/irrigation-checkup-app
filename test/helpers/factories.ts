import { faker } from '@faker-js/faker'
import type { NewClient, NewCompanySettings, NewTechnician } from '@/lib/schema'

export function buildCompanySettings(overrides: Partial<NewCompanySettings> = {}): NewCompanySettings {
  return {
    id:                  1,
    companyName:         faker.company.name(),
    licenseNum:          faker.string.alphanumeric(8).toUpperCase(),
    companyAddress:      faker.location.streetAddress(),
    companyCityStateZip: `${faker.location.city()}, TX ${faker.location.zipCode()}`,
    companyPhone:        faker.phone.number(),
    performedBy:         faker.person.fullName(),
    ...overrides,
  }
}

export function buildTechnician(overrides: Partial<NewTechnician> = {}): NewTechnician {
  return {
    name: faker.person.fullName(),
    ...overrides,
  }
}

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
