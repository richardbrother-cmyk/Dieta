import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { Blob as BlobNativo, File as FileNativo } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// El Blob de jsdom no sobrevive a structuredClone, que es como fake-indexeddb
// guarda los valores; el de Node sí, igual que el de un navegador real.
Object.assign(globalThis, { Blob: BlobNativo, File: FileNativo });

afterEach(() => cleanup());
