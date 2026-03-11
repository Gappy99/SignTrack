import mongoose from "mongoose";

const museumNodeSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "El key del nodo es requerido"],
      unique: true,
      trim: true,
      lowercase: true,
      maxLength: [100, "El key no puede exceder 100 caracteres"],
    },
    nombre: {
      type: String,
      required: [true, "El nombre del nodo es requerido"],
      trim: true,
      maxLength: [120, "El nombre no puede exceder 120 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxLength: [250, "La descripción no puede exceder 250 caracteres"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("MuseumNode", museumNodeSchema);