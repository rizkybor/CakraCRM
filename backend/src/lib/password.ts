import argon2 from 'argon2';

// OWASP-recommended argon2id parameters (19 MiB memory, 2 iterations).
const options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string) => argon2.hash(plain, options);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Used to keep login timing constant when the email does not exist.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(plain: string): Promise<void> {
  dummyHash ??= hashPassword('cakracrm-dummy-password');
  await verifyPassword(await dummyHash, plain);
}
