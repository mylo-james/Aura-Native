import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const expected = [
  'f1288ac7d6ddca5485925cb5d5fa6016b546416eed5bf268b478392dccccf0f0',
  '4faf4e8157962ee30fe13c7c514850bcb11f2fb58f014b17415f6a98a306cd64',
  '968bd5277a903a15c8db18e55f0428ac89a9763edd33997760981645dc63b7b2',
  'e474554ce8f6a4d8fa1b02b2df624191263c6c8de596fc0a7d793d339258e472',
  'e0d291aad448c42d6873c906679a2d292bf7230a274aeebdabd0018dc2affd77',
  '5fbf4eedabbefa8ab570f65cb97ad8ad55bf21070e0728c86c21fe2a8c4c6524',
];
for (let i = 0; i < expected.length; i++) {
  const digest = createHash('sha256')
    .update(
      readFileSync(
        new URL(`../client/assets/aura/${i + 1}.png`, import.meta.url),
      ),
    )
    .digest('hex');
  if (digest !== expected[i])
    throw new Error(`Original Aura image ${i + 1} changed`);
}
console.log('All six original Aura character images preserved byte-for-byte.');
