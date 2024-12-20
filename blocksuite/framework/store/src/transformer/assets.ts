import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';

interface BlobCRUD {
  get: (key: string) => Promise<Blob | null> | Blob | null;
  set: (key: string, value: Blob) => Promise<string> | string;
  delete: (key: string) => Promise<void> | void;
  list: () => Promise<string[]> | string[];
}

type AssetsManagerConfig = {
  blob: BlobCRUD;
};

function makeNewNameWhenConflict(names: Set<string>, name: string) {
  let i = 1;
  const ext = name.split('.').at(-1) ?? '';
  let newName = name.replace(new RegExp(`.${ext}$`), ` (${i}).${ext}`);
  while (names.has(newName)) {
    newName = name.replace(new RegExp(`.${ext}$`), ` (${i}).${ext}`);
    i++;
  }
  return newName;
}

export class AssetsManager {
  private readonly _assetsMap = new Map<string, Blob>();

  private readonly _blob: BlobCRUD;

  private readonly _names = new Set<string>();

  private readonly _pathBlobIdMap = new Map<string, string>();

  constructor(options: AssetsManagerConfig) {
    this._blob = options.blob;
  }

  cleanup() {
    this._assetsMap.clear();
    this._names.clear();
  }

  getAssets() {
    return this._assetsMap;
  }

  getPathBlobIdMap() {
    return this._pathBlobIdMap;
  }

  isEmpty() {
    return this._assetsMap.size === 0;
  }

  async readFromBlob(blobId: string) {
    if (this._assetsMap.has(blobId)) return;
    const blob = await this._blob.get(blobId);
    if (!blob) {
      console.error(`Blob ${blobId} not found in blob manager`);
      return;
    }
    if (blob instanceof File) {
      let file = blob;
      if (this._names.has(blob.name)) {
        const newName = makeNewNameWhenConflict(this._names, blob.name);
        file = new File([blob], newName, { type: blob.type });
      }
      this._assetsMap.set(blobId, file);
      this._names.add(file.name);
      return;
    }
    if (blob.type && blob.type !== 'application/octet-stream') {
      this._assetsMap.set(blobId, blob);
      return;
    }
    // Guess the file type from the buffer
    const buffer = await blob.arrayBuffer();
    const FileType = await import('file-type');
    const fileType = await FileType.fileTypeFromBuffer(buffer);
    if (fileType) {
      const file = new File([blob], '', { type: fileType.mime });
      this._assetsMap.set(blobId, file);
      return;
    }
    this._assetsMap.set(blobId, blob);
  }

  async writeToBlob(blobId: string) {
    const blob = this._assetsMap.get(blobId);
    if (!blob) {
      throw new BlockSuiteError(
        ErrorCode.TransformerError,
        `Blob ${blobId} not found in assets manager`
      );
    }

    const exists = (await this._blob.get(blobId)) !== null;
    if (exists) {
      return;
    }

    await this._blob.set(blobId, blob);
  }
}