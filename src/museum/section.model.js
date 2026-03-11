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
      required: false,
      trim: true,
      maxLength: [200, "La ubicación no puede exceder 200 caracteres"],
      // Ejemplo: "Dos salones a la derecha"
    },
    nodeKey: {
      type: String,
      required: [true, "El nodeKey es requerido"],
      trim: true,
      lowercase: true,
      maxLength: [100, "El nodeKey no puede exceder 100 caracteres"],
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    areas: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sectionSchema.index({ nombre: 1 }, { unique: true });
sectionSchema.index({ nodeKey: 1 });

export default mongoose.model("Section", sectionSchema);
