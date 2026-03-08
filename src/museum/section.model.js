import mongoose from "mongoose";

const sectionSchema = mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la sección es requerido"],
      trim: true,
      maxLength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxLength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    direccion: {
      type: String,
      required: [true, "La dirección es requerida"],
      trim: true,
      maxLength: [200, "La dirección no puede exceder 200 caracteres"],
    },
    ubicacion: {
      type: String,
      required: [true, "La ubicación es requerida"],
      trim: true,
      maxLength: [200, "La ubicación no puede exceder 200 caracteres"],
      // Ejemplo: "Dos salones a la derecha"
    },
    areas: {
      type: [String],
      required: true,
      validate: [
        arr => arr.length === 6,
        "Debe haber exactamente 6 áreas en la sección"
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Section", sectionSchema);
