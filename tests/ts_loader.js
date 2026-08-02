import { register } from 'node:module';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        if (err.code === 'ERR_MODULE_NOT_FOUND' && (specifier.startsWith('./') || specifier.startsWith('../'))) {
            if (context.parentURL) {
                const urlWithTs = new URL(specifier + '.ts', context.parentURL);
                if (fs.existsSync(urlWithTs)) {
                    return {
                        url: urlWithTs.href,
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
