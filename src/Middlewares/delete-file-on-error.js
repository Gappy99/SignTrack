import { unlink } from "fs/promises";

const tryUnlink = async (path) => {
  if (!path) return;
  try {
    await unlink(path);
    console.log(`Archivo eliminado: ${path}`);
  } catch (e) {
    // ignore missing files or permission issues, but log for visibility
    console.error(`No se pudo eliminar el archivo ${path}: ${e.message}`);
  }
};

export const cleanUploaderFileOnFinish = (req, res, next) => {
  if (req.file) {
    res.on("finish", async () => {
      if (res.statusCode >= 400) {
        await tryUnlink(req.file.path);
      }
    });
  }

  next();
};

export const deleteFileOnError = async (err, req, res, next) => {
  if (req.file) {
    await tryUnlink(req.file.path);
  }
  return next(err);
};
