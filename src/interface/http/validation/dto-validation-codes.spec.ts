import { readdirSync } from 'fs';
import { join } from 'path';
import { getMetadataStorage } from 'class-validator';

// Guards the contract with the client: every rule of every DTO sends a
// stable code in `error`, never the generic VALIDATION_FAILED fallback.
// The DTO files are discovered, so a new DTO is checked without being listed.

const SOURCE_ROOT = join(__dirname, '..', '..', '..');
const DTO_FILE_SUFFIX = '.dto.ts';

// Decorators that do not validate anything (@IsOptional, @ValidateIf...) have another type
const VALIDATION_RULE_TYPE = 'customValidation';

type DtoRule = {
  dto: string;
  property: string;
  rule: string;
};

function findDtoFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findDtoFiles(path));
    } else if (entry.name.endsWith(DTO_FILE_SUFFIX)) {
      files.push(path);
    }
  }
  return files;
}

function isClass(value: unknown): value is new () => object {
  return typeof value === 'function';
}

function hasCode(context: unknown): boolean {
  if (typeof context !== 'object' || context === null) {
    return false;
  }
  return 'code' in context && typeof context.code === 'string';
}

async function findRulesWithoutCode(): Promise<DtoRule[]> {
  const storage = getMetadataStorage();
  const rulesWithoutCode: DtoRule[] = [];

  for (const file of findDtoFiles(SOURCE_ROOT)) {
    const loadedModule: unknown = await import(file);
    if (typeof loadedModule !== 'object' || loadedModule === null) {
      continue;
    }
    for (const exported of Object.values(loadedModule)) {
      if (!isClass(exported)) {
        continue;
      }
      const rules = storage.getTargetValidationMetadatas(
        exported,
        '',
        true,
        false,
      );
      for (const rule of rules) {
        if (rule.type !== VALIDATION_RULE_TYPE || hasCode(rule.context)) {
          continue;
        }
        rulesWithoutCode.push({
          dto: exported.name,
          property: rule.propertyName,
          rule: rule.name ?? rule.type,
        });
      }
    }
  }
  return rulesWithoutCode;
}

describe('DTO validation codes', () => {
  it('finds the DTO files', () => {
    const dtoFiles = findDtoFiles(SOURCE_ROOT);

    expect(dtoFiles.length).toBeGreaterThan(0);
  });

  it('gives a code to every validation rule, see withCode', async () => {
    const rulesWithoutCode = await findRulesWithoutCode();

    expect(rulesWithoutCode).toEqual([]);
  });
});
