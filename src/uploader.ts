import * as fs from 'fs-extra';
import path from 'path';
import multer from 'multer';

export function getUploader(dest: string, filter: string = '', originalName: boolean = true) {
    dest = path.join(dest, `${Date.now()}`);
  let storageOptions = {
    'destination': (req, file, cb) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      cb(null, dest);
    }
  };

  if (originalName) {
    storageOptions['filename'] = (req, file, cb) => {
      cb(null, file.originalname);
    };
  }

  let multerOptions = { storage: multer.diskStorage(storageOptions) };
  if (filter) {
    multerOptions['fileFilter'] = (req, file, cb) => {
      if (path.extname(file.originalname) !== filter) {
        return cb(null, false);
      }
      cb(null, true);
    };
  }

  return multer(multerOptions);
}
