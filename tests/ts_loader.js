import { register } from 'node:module';
import fs from 'node:fs';

// Resolve extensionless relative specifiers (`./foo`) to their `.ts` source.
// Also handles `./foo` when a *directory* `foo/` shadows the `foo.ts` file,
// which Node reports as ERR_UNSUPPORTED_DIR_IMPORT instead of ERR_MODULE_NOT_FOUND.
const RESOLVABLE_ERRORS = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT']);

export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        if (RESOLVABLE_ERRORS.has(err.code) && (specifier.startsWith('./') || specifier.startsWith('../'))) {
            if (context.parentURL) {
                const urlWithTs = new URL(specifier + '.ts', context.parentURL);
                if (fs.existsSync(urlWithTs)) {
                    return {
                        url: urlWithTs.href,
                        shortCircuit: true,
                    };
                }
                const urlWithIndex = new URL(specifier + '/index.ts', context.parentURL);
                if (fs.existsSync(urlWithIndex)) {
                    return {
                        url: urlWithIndex.href,
                        shortCircuit: true,
                    };
                }
            }
        }
        throw err;
    }
}

try {
    register(import.meta.url);
} catch (e) {}
