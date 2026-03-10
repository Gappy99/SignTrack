import mongoose from 'mongoose';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildErrorResponse = (errors) => ({
  success: false,
  message: 'Errores de validación',
  errors,
});

export const validateCreateField = async (req, res, next) => {
  try {
    const errors = [];
    const { fieldName, fieldType, capacity, pricePerHour, description } = req.body;

    if (!fieldName || typeof fieldName !== 'string' || fieldName.trim().length < 2 || fieldName.trim().length > 100) {
      errors.push({ field: 'fieldName', message: 'El nombre debe tener entre 2 y 100 caracteres' });
    }

    const ALLOWED_TYPES = ['NATURAL', 'SINTETICA', 'CONCRETO'];
    if (!fieldType || !ALLOWED_TYPES.includes(fieldType)) {
      errors.push({ field: 'fieldType', message: 'Tipo de superficie no válida' });
    }

    const ALLOWED_CAPACITIES = ['FUTBOL_5', 'FUTBOL_7', 'FUTBOL_11'];
    if (!capacity || !ALLOWED_CAPACITIES.includes(capacity)) {
      errors.push({ field: 'capacity', message: 'Capacidad no válida' });
    }

    const price = parseFloat(pricePerHour);
    if (isNaN(price) || price < 0) {
      errors.push({ field: 'pricePerHour', message: 'El precio debe ser mayor o igual a 0' });
    }

    if (description != null && typeof description === 'string' && description.length > 500) {
      errors.push({ field: 'description', message: 'La descripción no puede exceder 500 caracteres' });
    }

    if (errors.length) return res.status(400).json(buildErrorResponse(errors));

    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateFieldRequest = async (req, res, next) => {
  try {
    const errors = [];
    const { id } = req.params;

    if (!isValidId(id)) {
      errors.push({ field: 'id', message: 'ID debe ser un ObjectId válido de MongoDB' });
    }

    const { fieldName, fieldType, capacity, pricePerHour, description } = req.body;

    if (fieldName !== undefined) {
      const name = typeof fieldName === 'string' ? fieldName.trim() : '';
      if (name.length < 2 || name.length > 100) {
        errors.push({ field: 'fieldName', message: 'El nombre debe tener entre 2 y 100 caracteres' });
      }
    }

    const ALLOWED_TYPES = ['NATURAL', 'SINTETICA', 'CONCRETO'];
    if (fieldType && !ALLOWED_TYPES.includes(fieldType)) {
      errors.push({ field: 'fieldType', message: 'Tipo de superficie no válida' });
    }

    const ALLOWED_CAPACITIES = ['FUTBOL_5', 'FUTBOL_7', 'FUTBOL_11'];
    if (capacity && !ALLOWED_CAPACITIES.includes(capacity)) {
      errors.push({ field: 'capacity', message: 'Capacidad no válida' });
    }

    if (pricePerHour !== undefined) {
      const price = parseFloat(pricePerHour);
      if (isNaN(price) || price < 0) {
        errors.push({ field: 'pricePerHour', message: 'El precio por hora debe ser mayor o igual a 0' });
      }
    }

    if (description != null && typeof description === 'string' && description.length > 500) {
      errors.push({ field: 'description', message: 'La descripción no puede exceder 500 caracteres' });
    }

    if (errors.length) return res.status(400).json(buildErrorResponse(errors));

    next();
  } catch (err) {
    next(err);
  }
};

export const validateFieldStatusChange = (req, res, next) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json(buildErrorResponse([{ field: 'id', message: 'ID debe ser un ObjectId válido de MongoDB' }]));
  }
  next();
};

export const validateGetFieldById = (req, res, next) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json(buildErrorResponse([{ field: 'id', message: 'ID debe ser un ObjectId válido de MongoDB' }]));
  }
  next();
};
