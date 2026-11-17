// Reads SecureString parameters at runtime and caches them for the life of the Lambda container.
// API keys are never stored in code, environment variables or Git.
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
const cache = new Map();

export async function getSecret(name) {
  if (!cache.has(name)) {
    const promise = ssm
      .send(new GetParameterCommand({ Name: name, WithDecryption: true }))
      .then((r) => r.Parameter.Value)
      .catch((err) => {
        cache.delete(name); // allow a retry on the next call
        throw err;
      });
    cache.set(name, promise);
  }
  return cache.get(name);
}
