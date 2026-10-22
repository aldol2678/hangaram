// 테스트용 worldpacks 읽기 (fs 기반). 브라우저는 같은 loadWorldpacks를 fetch로 호출한다.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorldpacks } from '../../game/src/era/registry.js';

export const worldpacksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../game/worldpacks');
export const readWorldpackJson = async (relative) => JSON.parse(await readFile(path.join(worldpacksDir, relative), 'utf8'));
export const loadRegistry = () => loadWorldpacks(readWorldpackJson);
