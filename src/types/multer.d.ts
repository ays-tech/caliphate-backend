// Ensures Express.Multer.File is available across the entire project
// without relying on tsconfig "types" array being set correctly.
import 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname:    string;
        originalname: string;
        encoding:     string;
        mimetype:     string;
        size:         number;
        destination:  string;
        filename:     string;
        path:         string;
        buffer:       Buffer;
        stream:       NodeJS.ReadableStream;
      }
    }
  }
}
