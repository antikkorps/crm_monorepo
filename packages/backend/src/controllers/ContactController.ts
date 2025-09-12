import { Context } from '../types/koa';
import { ContactPerson, MedicalInstitution } from '../models';
import { createError } from '../middleware/errorHandler';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

const contactSchema = Joi.object({
  firstName: Joi.string().required().trim().max(50),
  lastName: Joi.string().required().trim().max(50),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('', null).optional(),
  title: Joi.string().max(100).allow('', null).optional(),
  department: Joi.string().max(100).allow('', null).optional(),
  isPrimary: Joi.boolean().default(false),
  institutionId: Joi.string().uuid().required(),
});

const updateContactSchema = contactSchema.fork([
    'firstName', 
    'lastName', 
    'email', 
    'institutionId'
], (schema) => schema.optional());

export class ContactController {

  public static async create(ctx: Context) {
    const { error, value } = contactSchema.validate(ctx.request.body);
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    try {
      if (value.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          { where: { institutionId: value.institutionId, isPrimary: true } }
        );
      }

      const contact = await ContactPerson.create(value);

      ctx.status = 201;
      ctx.body = {
        success: true,
        message: 'Contact created successfully',
        data: contact,
      };
      logger.info(`Contact ${contact.id} created by user ${ctx.state.user?.id}`);
    } catch (err: any) {
      logger.error('Error creating contact', { error: err.message, data: value });
      throw createError('Failed to create contact', 500);
    }
  }

  public static async list(ctx: Context) {
    const { limit = 20, offset = 0, institutionId, search } = ctx.query;
    const where: any = {};

    if (institutionId) {
      where.institutionId = institutionId;
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    try {
      const { rows, count } = await ContactPerson.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        include: [{ model: MedicalInstitution, as: 'institution' }],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      });

      ctx.body = { 
        success: true,
        data: rows,
        pagination: { total: count, limit: Number(limit), offset: Number(offset) }
      };
    } catch (err: any) {
      logger.error('Error listing contacts', { error: err.message });
      throw createError('Failed to retrieve contacts', 500);
    }
  }

  public static async get(ctx: Context) {
    const { id } = ctx.params;
    try {
      const contact = await ContactPerson.findByPk(id, {
        include: [{ model: MedicalInstitution, as: 'institution' }]
      });
      if (!contact) {
        throw createError('Contact not found', 404);
      }
      ctx.body = { success: true, data: contact };
    } catch (err: any) {
      logger.error(`Error getting contact ${id}`, { error: err.message });
      if (err.status) throw err; // rethrow handled errors
      throw createError('Failed to retrieve contact', 500);
    }
  }

  public static async update(ctx: Context) {
    const { id } = ctx.params;
    const { error, value } = updateContactSchema.validate(ctx.request.body);
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    try {
      const contact = await ContactPerson.findByPk(id);
      if (!contact) {
        throw createError('Contact not found', 404);
      }

      const institutionId = value.institutionId || contact.institutionId;
      if (value.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          { where: { institutionId: institutionId, isPrimary: true, id: { [Op.ne]: id } } }
        );
      }

      await contact.update(value);

      const updatedContact = await ContactPerson.findByPk(id, {
        include: [{ model: MedicalInstitution, as: 'institution' }]
      });

      ctx.body = { success: true, message: 'Contact updated', data: updatedContact };
      logger.info(`Contact ${id} updated by user ${ctx.state.user?.id}`);
    } catch (err: any) {
      logger.error(`Error updating contact ${id}`, { error: err.message, data: value });
      throw createError('Failed to update contact', 500);
    }
  }

  public static async delete(ctx: Context) {
    const { id } = ctx.params;
    try {
      const contact = await ContactPerson.findByPk(id);
      if (!contact) {
        throw createError('Contact not found', 404);
      }

      await contact.destroy();

      ctx.body = { success: true, message: 'Contact deleted' };
      logger.info(`Contact ${id} deleted by user ${ctx.state.user?.id}`);
    } catch (err: any) {
      logger.error(`Error deleting contact ${id}`, { error: err.message });
      throw createError('Failed to delete contact', 500);
    }
  }
}